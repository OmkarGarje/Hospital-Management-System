-- ============================================================================
-- Academic DBMS Project: Hospital Management System (HMS)
-- Normalized Relational Database Schema (3NF)
-- Compatible with MySQL 8.0+ / MariaDB / PostgreSQL (ANSI SQL standard)
-- ============================================================================

-- Drop tables in reverse order of foreign key dependencies if re-executing
DROP TABLE IF EXISTS Billing_Invoices;
DROP TABLE IF EXISTS Medical_Records;
DROP TABLE IF EXISTS Inpatient_Admissions;
DROP TABLE IF EXISTS Appointments;
DROP TABLE IF EXISTS Rooms_Beds;
DROP TABLE IF EXISTS Doctors;
DROP TABLE IF EXISTS Departments;
DROP TABLE IF EXISTS Patients;

-- ----------------------------------------------------------------------------
-- 1. Departments Entity
-- Stores hospital clinical and administrative departments
-- ----------------------------------------------------------------------------
CREATE TABLE Departments (
    department_id       INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    location            VARCHAR(100) NOT NULL,
    head_doctor_id      INT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Doctors Entity
-- Stores medical practitioner credentials and department assignment
-- ----------------------------------------------------------------------------
CREATE TABLE Doctors (
    doctor_id           INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    specialization      VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL UNIQUE,
    email               VARCHAR(100) NOT NULL UNIQUE,
    password            VARCHAR(255) NOT NULL DEFAULT 'doctor123',
    department_id       INT NOT NULL,
    consultation_fee    DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_doc_fee CHECK (consultation_fee >= 0),
    CONSTRAINT fk_doctor_department 
        FOREIGN KEY (department_id) REFERENCES Departments(department_id)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
);

-- Establish circular reference for Department Head Doctor safely
ALTER TABLE Departments
    ADD CONSTRAINT fk_dept_head_doctor 
    FOREIGN KEY (head_doctor_id) REFERENCES Doctors(doctor_id)
    ON UPDATE CASCADE 
    ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 3. Patients Entity
-- Demographic and biological baseline details of patients
-- ----------------------------------------------------------------------------
CREATE TABLE Patients (
    patient_id          INT AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(100) NOT NULL,
    dob                 DATE NOT NULL,
    gender              VARCHAR(10) NOT NULL,
    blood_group         VARCHAR(5) NOT NULL,
    contact             VARCHAR(20) NOT NULL UNIQUE,
    password            VARCHAR(255) NOT NULL DEFAULT 'patient123',
    address             TEXT NOT NULL,
    emergency_contact   VARCHAR(20) NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_patient_gender CHECK (gender IN ('Male', 'Female', 'Other')),
    CONSTRAINT chk_patient_blood_group CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'))
);

-- ----------------------------------------------------------------------------
-- 4. Rooms_Beds Entity (Master Bed Inventory)
-- Decoupled from admissions to maintain 3NF and prevent inventory anomalies
-- ----------------------------------------------------------------------------
CREATE TABLE Rooms_Beds (
    bed_id              INT AUTO_INCREMENT PRIMARY KEY,
    room_number         VARCHAR(20) NOT NULL,
    bed_number          VARCHAR(10) NOT NULL,
    bed_type            VARCHAR(30) NOT NULL,
    daily_rate          DECIMAL(10, 2) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Available',
    department_id       INT NULL,
    CONSTRAINT chk_bed_type CHECK (bed_type IN ('General Ward', 'Semi-Private', 'Private', 'ICU', 'Emergency')),
    CONSTRAINT chk_bed_daily_rate CHECK (daily_rate >= 0),
    CONSTRAINT chk_bed_status CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
    CONSTRAINT uq_room_bed UNIQUE (room_number, bed_number),
    CONSTRAINT fk_bed_department 
        FOREIGN KEY (department_id) REFERENCES Departments(department_id)
        ON UPDATE CASCADE 
        ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 5. Appointments Entity
-- Outpatient consultation schedules
-- ----------------------------------------------------------------------------
CREATE TABLE Appointments (
    appointment_id      INT AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT NOT NULL,
    doctor_id           INT NOT NULL,
    appointment_date    DATE NOT NULL,
    time_slot           VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    reason              TEXT NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_appt_status CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
    CONSTRAINT uq_doctor_slot UNIQUE (doctor_id, appointment_date, time_slot),
    CONSTRAINT fk_appt_patient 
        FOREIGN KEY (patient_id) REFERENCES Patients(patient_id)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT,
    CONSTRAINT fk_appt_doctor 
        FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 6. Medical_Records / Prescriptions Entity
-- Clinical consultation outcomes, clinical observations, and prescriptions
-- ----------------------------------------------------------------------------
CREATE TABLE Medical_Records (
    record_id           INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id      INT NOT NULL UNIQUE,
    diagnosis           TEXT NOT NULL,
    treatment           TEXT NOT NULL,
    notes               TEXT NULL,
    date_recorded       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_record_appointment 
        FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id)
        ON UPDATE CASCADE 
        ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 7. Inpatient_Admissions Entity
-- Hospital admission and stay records for hospitalized patients
-- ----------------------------------------------------------------------------
CREATE TABLE Inpatient_Admissions (
    admission_id        INT AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT NOT NULL,
    bed_id              INT NOT NULL,
    admission_date      DATE NOT NULL,
    discharge_date      DATE NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Admitted',
    notes               TEXT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_admission_status CHECK (status IN ('Admitted', 'Discharged', 'Transferred')),
    CONSTRAINT chk_admission_discharge_date CHECK (discharge_date IS NULL OR discharge_date >= admission_date),
    CONSTRAINT fk_admission_patient 
        FOREIGN KEY (patient_id) REFERENCES Patients(patient_id)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT,
    CONSTRAINT fk_admission_bed 
        FOREIGN KEY (bed_id) REFERENCES Rooms_Beds(bed_id)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 8. Billing_Invoices Entity
-- Financial accounts receivable for consultations or inpatient admissions
-- ----------------------------------------------------------------------------
CREATE TABLE Billing_Invoices (
    invoice_id          INT AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT NOT NULL,
    appointment_id      INT NULL,
    admission_id        INT NULL,
    total_amount        DECIMAL(10, 2) NOT NULL,
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'Pending',
    payment_method      VARCHAR(30) NOT NULL DEFAULT 'Cash',
    invoice_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_invoice_amount CHECK (total_amount >= 0),
    CONSTRAINT chk_invoice_payment_status CHECK (payment_status IN ('Pending', 'Paid', 'Partially Paid', 'Cancelled')),
    CONSTRAINT chk_invoice_payment_method CHECK (payment_method IN ('Cash', 'Credit Card', 'Debit Card', 'Insurance', 'UPI', 'Net Banking')),
    CONSTRAINT chk_invoice_source CHECK (appointment_id IS NOT NULL OR admission_id IS NOT NULL),
    CONSTRAINT fk_invoice_patient 
        FOREIGN KEY (patient_id) REFERENCES Patients(patient_id)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_appointment 
        FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id)
        ON UPDATE CASCADE 
        ON DELETE SET NULL,
    CONSTRAINT fk_invoice_admission 
        FOREIGN KEY (admission_id) REFERENCES Inpatient_Admissions(admission_id)
        ON UPDATE CASCADE 
        ON DELETE SET NULL
);

-- ============================================================================
-- Sample Data Insertion (At least 5 records per table)
-- ============================================================================

-- 1. Insert Departments
INSERT INTO Departments (department_id, name, location, head_doctor_id) VALUES
(1, 'Cardiology', 'Block A, 3rd Floor', NULL),
(2, 'Neurology', 'Block B, 2nd Floor', NULL),
(3, 'Orthopedics', 'Block A, 1st Floor', NULL),
(4, 'Pediatrics', 'Block C, Ground Floor', NULL),
(5, 'Oncology', 'Block D, 4th Floor', NULL),
(6, 'General Medicine', 'Block A, Ground Floor', NULL);

-- 2. Insert Doctors
INSERT INTO Doctors (doctor_id, name, specialization, phone, email, department_id, consultation_fee) VALUES
(1, 'Dr. Rajesh Sharma', 'Senior Cardiologist', '+91 9876543210', 'rajesh.sharma@hospital.org', 1, 800.00),
(2, 'Dr. Ananya Iyer', 'Consultant Neurologist', '+91 9876543211', 'ananya.iyer@hospital.org', 2, 900.00),
(3, 'Dr. Vikramaditya Rao', 'Orthopedic Surgeon', '+91 9876543212', 'vikram.rao@hospital.org', 3, 750.00),
(4, 'Dr. Priya Nambiar', 'Pediatric Specialist', '+91 9876543213', 'priya.nambiar@hospital.org', 4, 600.00),
(5, 'Dr. Farhan Siddiqui', 'Medical Oncologist', '+91 9876543214', 'farhan.s@hospital.org', 5, 1000.00),
(6, 'Dr. Sneha Kulkarni', 'General Physician', '+91 9876543215', 'sneha.k@hospital.org', 6, 500.00);

-- Update Head Doctors for Departments now that doctors exist
UPDATE Departments SET head_doctor_id = 1 WHERE department_id = 1;
UPDATE Departments SET head_doctor_id = 2 WHERE department_id = 2;
UPDATE Departments SET head_doctor_id = 3 WHERE department_id = 3;
UPDATE Departments SET head_doctor_id = 4 WHERE department_id = 4;
UPDATE Departments SET head_doctor_id = 5 WHERE department_id = 5;
UPDATE Departments SET head_doctor_id = 6 WHERE department_id = 6;

-- 3. Insert Patients
INSERT INTO Patients (patient_id, full_name, dob, gender, blood_group, contact, address, emergency_contact) VALUES
(1, 'Aarav Patel', '1988-04-12', 'Male', 'O+', '+91 9123456780', 'Flat 402, Sunshine Apts, MG Road, Mumbai', '+91 9123456789'),
(2, 'Meera Deshmukh', '1995-09-23', 'Female', 'B+', '+91 9123456781', '74 Greenwood Residency, Pune', '+91 9123456790'),
(3, 'Rohan Verma', '1972-11-05', 'Male', 'A+', '+91 9123456782', '12 Rose Villa, Indiranagar, Bengaluru', '+91 9123456791'),
(4, 'Kavita Nair', '2001-02-17', 'Female', 'AB+', '+91 9123456783', 'Block 5, Hilltop Enclave, Hyderabad', '+91 9123456792'),
(5, 'Ishaan Sengupta', '2016-07-30', 'Male', 'O-', '+91 9123456784', '22 Park Street, Kolkata', '+91 9123456793'),
(6, 'Zoya Khan', '1990-12-14', 'Female', 'A-', '+91 9123456785', 'Flat 101, Galaxy Heights, Delhi', '+91 9123456794');

-- 4. Insert Rooms_Beds (Master Inventory)
INSERT INTO Rooms_Beds (bed_id, room_number, bed_number, bed_type, daily_rate, status, department_id) VALUES
(1, 'ICU-101', 'B-1', 'ICU', 5000.00, 'Occupied', 1),
(2, 'ICU-101', 'B-2', 'ICU', 5000.00, 'Available', 1),
(3, 'GW-201', 'B-1', 'General Ward', 1200.00, 'Occupied', 3),
(4, 'GW-201', 'B-2', 'General Ward', 1200.00, 'Available', 3),
(5, 'PVT-301', 'A-1', 'Private', 3500.00, 'Available', 2),
(6, 'PVT-302', 'A-1', 'Private', 3500.00, 'Occupied', 5),
(7, 'SEM-401', 'B-1', 'Semi-Private', 2200.00, 'Available', 4),
(8, 'SEM-401', 'B-2', 'Semi-Private', 2200.00, 'Available', 6);

-- 5. Insert Appointments
INSERT INTO Appointments (appointment_id, patient_id, doctor_id, appointment_date, time_slot, status, reason) VALUES
(1, 1, 1, '2026-10-01', '09:00 - 09:30', 'Completed', 'Chest discomfort and irregular palpitations during workouts'),
(2, 2, 2, '2026-10-02', '10:00 - 10:30', 'Completed', 'Chronic migraine headaches with aura'),
(3, 3, 3, '2026-10-03', '11:00 - 11:30', 'Completed', 'Right knee acute pain and swelling after slip and fall'),
(4, 4, 1, '2026-10-06', '14:00 - 14:30', 'Scheduled', 'Hypertension follow-up and blood pressure monitoring'),
(5, 5, 4, '2026-10-07', '15:30 - 16:00', 'Scheduled', 'High fever, persistent cough, and loss of appetite'),
(6, 6, 6, '2026-10-08', '11:30 - 12:00', 'Cancelled', 'Routine whole body health checkup');

-- 6. Insert Medical_Records / Prescriptions
INSERT INTO Medical_Records (record_id, appointment_id, diagnosis, treatment, notes) VALUES
(1, 1, 'Premature Ventricular Contractions (Mild Arrhythmia)', 'Metoprolol 25mg OD for 30 days, ECG & 2D Echo advised', 'Avoid caffeine; follow low sodium diet and report if dizziness recurs.'),
(2, 2, 'Chronic Migraine without complications', 'Sumatriptan 50mg SOS, Prophylactic Propranolol 40mg daily', 'Advised dark room rest and maintaining migraine sleep diary.'),
(3, 3, 'Meniscal Tear (Right Knee, Grade II)', 'NSAIDs (Aceclofenac + Paracetamol) twice daily, Physical Therapy 3x/week', 'Knee brace immobilizer recommended; avoid squatting or stairs.');

-- 7. Insert Inpatient_Admissions
INSERT INTO Inpatient_Admissions (admission_id, patient_id, bed_id, admission_date, discharge_date, status, notes) VALUES
(1, 1, 1, '2026-09-20', '2026-09-25', 'Discharged', 'Post-angioplasty 24h cardiac telemetry observation. Recovered uneventfully.'),
(2, 3, 3, '2026-10-03', NULL, 'Admitted', 'Admitted for diagnostic arthroscopy and aggressive knee physical therapy.'),
(3, 2, 6, '2026-10-04', NULL, 'Admitted', 'Intractable status migrainosus admitted for IV hydration and DHE infusion.'),
(4, 4, 1, '2026-10-05', NULL, 'Admitted', 'Emergency admission due to acute hypertensive crisis (BP 210/120 mmHg).'),
(5, 6, 5, '2026-09-15', '2026-09-18', 'Discharged', 'Admitted for acute gastroenteritis and severe dehydration. Fully recovered.');

-- 8. Insert Billing_Invoices
INSERT INTO Billing_Invoices (invoice_id, patient_id, appointment_id, admission_id, total_amount, payment_status, payment_method, invoice_date) VALUES
(1, 1, 1, NULL, 800.00, 'Paid', 'UPI', '2026-10-01 09:45:00'),
(2, 2, 2, NULL, 900.00, 'Paid', 'Credit Card', '2026-10-02 10:40:00'),
(3, 3, 3, NULL, 750.00, 'Paid', 'Cash', '2026-10-03 11:45:00'),
(4, 1, NULL, 1, 25000.00, 'Paid', 'Insurance', '2026-09-25 14:00:00'),
(5, 6, NULL, 5, 10500.00, 'Paid', 'Debit Card', '2026-09-18 16:30:00'),
(6, 4, 4, NULL, 800.00, 'Pending', 'Cash', '2026-10-06 14:30:00');
