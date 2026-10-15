-- ============================================================================
-- Academic DBMS Project: Hospital Management System (HMS)
-- Advanced SQL: Views, Triggers, Stored Procedures, and Analytical Queries
-- Compatible with MySQL 8.0+ / MariaDB
-- ============================================================================

-- ============================================================================
-- 1. VIEWS
-- ============================================================================

-- 1.1 vw_PatientTreatmentHistory
-- Consolidates patient medical timeline, doctor consultations, diagnoses, and billing
CREATE OR REPLACE VIEW vw_PatientTreatmentHistory AS
SELECT 
    p.patient_id,
    p.full_name AS patient_name,
    p.dob,
    TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) AS age,
    p.gender,
    p.blood_group,
    p.contact AS patient_contact,
    a.appointment_id,
    a.appointment_date,
    a.time_slot,
    d.doctor_id,
    d.name AS doctor_name,
    d.specialization,
    dept.name AS department_name,
    mr.record_id,
    mr.diagnosis,
    mr.treatment,
    mr.notes AS prescription_notes,
    mr.date_recorded,
    inv.invoice_id,
    inv.total_amount AS billed_amount,
    inv.payment_status
FROM Patients p
INNER JOIN Appointments a ON p.patient_id = a.patient_id
INNER JOIN Doctors d ON a.doctor_id = d.doctor_id
INNER JOIN Departments dept ON d.department_id = dept.department_id
LEFT JOIN Medical_Records mr ON a.appointment_id = mr.appointment_id
LEFT JOIN Billing_Invoices inv ON a.appointment_id = inv.appointment_id;


-- 1.2 vw_DoctorDailySchedule
-- Displays upcoming and scheduled appointments for doctors grouped chronologically
CREATE OR REPLACE VIEW vw_DoctorDailySchedule AS
SELECT 
    d.doctor_id,
    d.name AS doctor_name,
    d.specialization,
    dept.name AS department_name,
    a.appointment_date,
    a.time_slot,
    a.appointment_id,
    p.patient_id,
    p.full_name AS patient_name,
    p.contact AS patient_contact,
    a.status AS appointment_status,
    a.reason
FROM Doctors d
INNER JOIN Departments dept ON d.department_id = dept.department_id
INNER JOIN Appointments a ON d.doctor_id = a.doctor_id
INNER JOIN Patients p ON a.patient_id = p.patient_id
ORDER BY a.appointment_date ASC, a.time_slot ASC;


-- ============================================================================
-- 2. TRIGGERS
-- ============================================================================

-- Drop triggers if already defined
DROP TRIGGER IF EXISTS trg_AfterAdmissionInsert;
DROP TRIGGER IF EXISTS trg_AfterAdmissionUpdate;
DROP TRIGGER IF EXISTS trg_AfterMedicalRecordInsert_Billing;

DELIMITER //

-- 2.1 Trigger: Automatically mark bed as 'Occupied' upon patient admission
CREATE TRIGGER trg_AfterAdmissionInsert
AFTER INSERT ON Inpatient_Admissions
FOR EACH ROW
BEGIN
    IF NEW.status = 'Admitted' THEN
        UPDATE Rooms_Beds
        SET status = 'Occupied'
        WHERE bed_id = NEW.bed_id;
    END IF;
END //

-- 2.2 Trigger: Automatically free bed (mark 'Available') upon discharge
CREATE TRIGGER trg_AfterAdmissionUpdate
AFTER UPDATE ON Inpatient_Admissions
FOR EACH ROW
BEGIN
    IF NEW.status = 'Discharged' OR NEW.discharge_date IS NOT NULL THEN
        UPDATE Rooms_Beds
        SET status = 'Available'
        WHERE bed_id = NEW.bed_id;
    ELSEIF NEW.status = 'Admitted' AND OLD.status <> 'Admitted' THEN
        UPDATE Rooms_Beds
        SET status = 'Occupied'
        WHERE bed_id = NEW.bed_id;
    END IF;
END //

-- 2.3 Trigger: Automatically update or generate billing total when treatment is recorded
CREATE TRIGGER trg_AfterMedicalRecordInsert_Billing
AFTER INSERT ON Medical_Records
FOR EACH ROW
BEGIN
    DECLARE v_patient_id INT;
    DECLARE v_fee DECIMAL(10, 2);
    
    -- Fetch patient ID and consultation fee associated with the appointment
    SELECT a.patient_id, d.consultation_fee
    INTO v_patient_id, v_fee
    FROM Appointments a
    JOIN Doctors d ON a.doctor_id = d.doctor_id
    WHERE a.appointment_id = NEW.appointment_id;
    
    -- If no invoice exists yet for this appointment, generate one automatically
    IF NOT EXISTS (SELECT 1 FROM Billing_Invoices WHERE appointment_id = NEW.appointment_id) THEN
        INSERT INTO Billing_Invoices (patient_id, appointment_id, total_amount, payment_status, payment_method, invoice_date)
        VALUES (v_patient_id, NEW.appointment_id, v_fee, 'Pending', 'Cash', NOW());
    ELSE
        -- Update the pending invoice amount
        UPDATE Billing_Invoices
        SET total_amount = v_fee
        WHERE appointment_id = NEW.appointment_id AND payment_status = 'Pending';
    END IF;
END //

DELIMITER ;


-- ============================================================================
-- 3. STORED PROCEDURES
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_BookAppointment;
DROP PROCEDURE IF EXISTS sp_DischargePatient;

DELIMITER //

-- 3.1 Procedure: sp_BookAppointment
-- Validates patient existence, doctor availability, checks slot conflicts, and books appointment
CREATE PROCEDURE sp_BookAppointment(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_appointment_date DATE,
    IN p_time_slot VARCHAR(20),
    IN p_reason TEXT,
    OUT p_appointment_id INT,
    OUT p_status_message VARCHAR(255)
)
BEGIN
    DECLARE v_conflict_count INT DEFAULT 0;
    DECLARE v_patient_count INT DEFAULT 0;
    DECLARE v_doctor_count INT DEFAULT 0;
    DECLARE v_fee DECIMAL(10, 2) DEFAULT 0.00;

    -- Validate Patient existence
    SELECT COUNT(*) INTO v_patient_count FROM Patients WHERE patient_id = p_patient_id;
    IF v_patient_count = 0 THEN
        SET p_status_message = 'ERROR: Patient record does not exist.';
        SET p_appointment_id = NULL;
    ELSE
        -- Validate Doctor existence and fetch fee
        SELECT COUNT(*), COALESCE(MAX(consultation_fee), 500.00) 
        INTO v_doctor_count, v_fee 
        FROM Doctors WHERE doctor_id = p_doctor_id;
        
        IF v_doctor_count = 0 THEN
            SET p_status_message = 'ERROR: Doctor record does not exist.';
            SET p_appointment_id = NULL;
        ELSE
            -- Check for conflict: same doctor, same date, same time slot
            SELECT COUNT(*) INTO v_conflict_count
            FROM Appointments
            WHERE doctor_id = p_doctor_id
              AND appointment_date = p_appointment_date
              AND time_slot = p_time_slot
              AND status <> 'Cancelled';
              
            IF v_conflict_count > 0 THEN
                SET p_status_message = 'CONFLICT: Doctor is already booked for this date and time slot.';
                SET p_appointment_id = NULL;
            ELSE
                -- Insert appointment record
                INSERT INTO Appointments (patient_id, doctor_id, appointment_date, time_slot, status, reason)
                VALUES (p_patient_id, p_doctor_id, p_appointment_date, p_time_slot, 'Scheduled', p_reason);
                
                SET p_appointment_id = LAST_INSERT_ID();
                
                -- Create initial pending consultation fee invoice
                INSERT INTO Billing_Invoices (patient_id, appointment_id, total_amount, payment_status, payment_method, invoice_date)
                VALUES (p_patient_id, p_appointment_id, v_fee, 'Pending', 'Cash', NOW());
                
                SET p_status_message = 'SUCCESS: Appointment successfully booked and invoice generated.';
            END IF;
        END IF;
    END IF;
END //


-- 3.2 Procedure: sp_DischargePatient
-- Calculates total length of stay, computes room charges, generates final invoice, and frees the bed
CREATE PROCEDURE sp_DischargePatient(
    IN p_admission_id INT,
    IN p_discharge_date DATE,
    IN p_payment_method VARCHAR(30),
    OUT p_invoice_id INT,
    OUT p_total_billed DECIMAL(10, 2),
    OUT p_status_message VARCHAR(255)
)
BEGIN
    DECLARE v_patient_id INT;
    DECLARE v_bed_id INT;
    DECLARE v_admission_date DATE;
    DECLARE v_current_status VARCHAR(20);
    DECLARE v_daily_rate DECIMAL(10, 2);
    DECLARE v_days_stay INT;
    
    -- Retrieve admission record
    SELECT patient_id, bed_id, admission_date, status
    INTO v_patient_id, v_bed_id, v_admission_date, v_current_status
    FROM Inpatient_Admissions
    WHERE admission_id = p_admission_id;
    
    IF v_patient_id IS NULL THEN
        SET p_status_message = 'ERROR: Admission record not found.';
        SET p_invoice_id = NULL;
        SET p_total_billed = 0.00;
    ELSEIF v_current_status = 'Discharged' THEN
        SET p_status_message = 'ERROR: Patient has already been discharged.';
        SET p_invoice_id = NULL;
        SET p_total_billed = 0.00;
    ELSEIF p_discharge_date < v_admission_date THEN
        SET p_status_message = 'ERROR: Discharge date cannot precede admission date.';
        SET p_invoice_id = NULL;
        SET p_total_billed = 0.00;
    ELSE
        -- Calculate length of stay (minimum 1 day charged for day admission)
        SET v_days_stay = DATEDIFF(p_discharge_date, v_admission_date);
        IF v_days_stay = 0 THEN
            SET v_days_stay = 1;
        END IF;
        
        -- Retrieve daily room charge
        SELECT daily_rate INTO v_daily_rate
        FROM Rooms_Beds
        WHERE bed_id = v_bed_id;
        
        -- Compute total room billing
        SET p_total_billed = v_days_stay * v_daily_rate;
        
        -- Update inpatient admission status
        UPDATE Inpatient_Admissions
        SET discharge_date = p_discharge_date,
            status = 'Discharged'
        WHERE admission_id = p_admission_id;
        
        -- Free the bed (also synchronized by trg_AfterAdmissionUpdate)
        UPDATE Rooms_Beds
        SET status = 'Available'
        WHERE bed_id = v_bed_id;
        
        -- Generate final invoice
        INSERT INTO Billing_Invoices (patient_id, admission_id, total_amount, payment_status, payment_method, invoice_date)
        VALUES (v_patient_id, p_admission_id, p_total_billed, 'Paid', p_payment_method, NOW());
        
        SET p_invoice_id = LAST_INSERT_ID();
        SET p_status_message = CONCAT('SUCCESS: Discharged after ', v_days_stay, ' day(s). Room charges: ₹', p_total_billed, '. Bed released.');
    END IF;
END //

DELIMITER ;


-- ============================================================================
-- 4. COMPLEX AGGREGATION & REPORTING QUERIES
-- ============================================================================

-- 4.1 Query: Doctor-wise patient count and revenue generated in a given month (e.g., October 2026)
SELECT 
    d.doctor_id,
    d.name AS doctor_name,
    dept.name AS department_name,
    COUNT(DISTINCT a.patient_id) AS unique_patients_served,
    COUNT(a.appointment_id) AS total_appointments,
    COALESCE(SUM(inv.total_amount), 0.00) AS total_billed_amount,
    COALESCE(SUM(CASE WHEN inv.payment_status = 'Paid' THEN inv.total_amount ELSE 0.00 END), 0.00) AS total_collected_revenue,
    COALESCE(SUM(CASE WHEN inv.payment_status = 'Pending' THEN inv.total_amount ELSE 0.00 END), 0.00) AS pending_revenue
FROM Doctors d
JOIN Departments dept ON d.department_id = dept.department_id
LEFT JOIN Appointments a ON d.doctor_id = a.doctor_id 
    AND a.appointment_date BETWEEN '2026-10-01' AND '2026-10-31'
LEFT JOIN Billing_Invoices inv ON a.appointment_id = inv.appointment_id
GROUP BY d.doctor_id, d.name, dept.name
ORDER BY total_billed_amount DESC;


-- 4.2 Query: Department-wise bed occupancy rate
SELECT 
    dept.department_id,
    dept.name AS department_name,
    COUNT(rb.bed_id) AS total_beds,
    COUNT(CASE WHEN rb.status = 'Occupied' THEN 1 END) AS occupied_beds,
    COUNT(CASE WHEN rb.status = 'Available' THEN 1 END) AS available_beds,
    COUNT(CASE WHEN rb.status = 'Maintenance' THEN 1 END) AS maintenance_beds,
    ROUND(
        (COUNT(CASE WHEN rb.status = 'Occupied' THEN 1 END) * 100.0) / 
        NULLIF(COUNT(rb.bed_id), 0), 
        2
    ) AS occupancy_rate_percentage
FROM Departments dept
LEFT JOIN Rooms_Beds rb ON dept.department_id = rb.department_id
GROUP BY dept.department_id, dept.name
ORDER BY occupancy_rate_percentage DESC;
