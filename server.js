/**
 * MediCore Hospital Management System - Complete REST Backend Server
 * Technology: Node.js (Built-in SQLite Engine, zero external dependencies required)
 * Handles all 3NF HMS entities, transactional stored-procedure equivalents, and static assets.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

let PORT = parseInt(process.env.PORT, 10) || 3000;
const DB_PATH = path.join(__dirname, 'database', 'hospital.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite database instance
const db = new DatabaseSync(DB_PATH);

/**
 * Initializes tables and seed data if not present
 */
function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS Departments (
      department_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL UNIQUE,
      location        TEXT NOT NULL,
      head_doctor_id  INTEGER NULL
    );

    CREATE TABLE IF NOT EXISTS Doctors (
      doctor_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL,
      specialization   TEXT NOT NULL,
      phone            TEXT NOT NULL UNIQUE,
      email            TEXT NOT NULL UNIQUE,
      password         TEXT NOT NULL DEFAULT 'doctor123',
      department_id    INTEGER NOT NULL,
      consultation_fee REAL NOT NULL DEFAULT 500.00,
      FOREIGN KEY (department_id) REFERENCES Departments(department_id)
    );

    CREATE TABLE IF NOT EXISTS Patients (
      patient_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name          TEXT NOT NULL,
      dob                TEXT NOT NULL,
      gender             TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
      blood_group        TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      contact            TEXT NOT NULL UNIQUE,
      password           TEXT NOT NULL DEFAULT 'patient123',
      address            TEXT NOT NULL,
      emergency_contact  TEXT NOT NULL,
      created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Rooms_Beds (
      bed_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number    TEXT NOT NULL,
      bed_number     TEXT NOT NULL,
      bed_type       TEXT NOT NULL,
      daily_rate     REAL NOT NULL CHECK(daily_rate >= 0),
      status         TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Occupied', 'Maintenance')),
      department_id  INTEGER NULL,
      UNIQUE(room_number, bed_number),
      FOREIGN KEY (department_id) REFERENCES Departments(department_id)
    );

    CREATE TABLE IF NOT EXISTS Appointments (
      appointment_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id       INTEGER NOT NULL,
      doctor_id        INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot        TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'Completed', 'Cancelled')),
      reason           TEXT NOT NULL,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(doctor_id, appointment_date, time_slot),
      FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
      FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
    );

    CREATE TABLE IF NOT EXISTS Medical_Records (
      record_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id  INTEGER NOT NULL UNIQUE,
      diagnosis       TEXT NOT NULL,
      treatment       TEXT NOT NULL,
      notes           TEXT NULL,
      date_recorded   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id)
    );

    CREATE TABLE IF NOT EXISTS Inpatient_Admissions (
      admission_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL,
      bed_id          INTEGER NOT NULL,
      admission_date  TEXT NOT NULL,
      discharge_date  TEXT NULL,
      status          TEXT NOT NULL DEFAULT 'Admitted' CHECK(status IN ('Admitted', 'Discharged', 'Transferred')),
      notes           TEXT NULL,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
      FOREIGN KEY (bed_id) REFERENCES Rooms_Beds(bed_id)
    );

    CREATE TABLE IF NOT EXISTS Billing_Invoices (
      invoice_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL,
      appointment_id  INTEGER NULL,
      admission_id    INTEGER NULL,
      total_amount    REAL NOT NULL CHECK(total_amount >= 0),
      payment_status  TEXT NOT NULL DEFAULT 'Pending' CHECK(payment_status IN ('Pending', 'Paid', 'Partially Paid', 'Cancelled')),
      payment_method  TEXT NOT NULL DEFAULT 'Cash',
      invoice_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
      FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id),
      FOREIGN KEY (admission_id) REFERENCES Inpatient_Admissions(admission_id)
    );
  `);

  const deptCount = db.prepare('SELECT COUNT(*) AS count FROM Departments').get().count;
  if (deptCount === 0) {
    console.log('Seeding initial departments and doctors...');
    db.exec(`
      INSERT INTO Departments (department_id, name, location) VALUES
      (1, 'Cardiology', 'Block A, 3rd Floor'),
      (2, 'Neurology', 'Block B, 2nd Floor'),
      (3, 'Orthopedics', 'Block A, 1st Floor'),
      (4, 'Pediatrics', 'Block C, Ground Floor'),
      (5, 'Oncology', 'Block D, 4th Floor'),
      (6, 'General Medicine', 'Block A, Ground Floor');

      INSERT INTO Doctors (doctor_id, name, specialization, phone, email, department_id, consultation_fee) VALUES
      (1, 'Dr. Rajesh Sharma', 'Senior Cardiologist', '+91 9876543210', 'rajesh.sharma@hospital.org', 1, 800.00),
      (2, 'Dr. Ananya Iyer', 'Consultant Neurologist', '+91 9876543211', 'ananya.iyer@hospital.org', 2, 900.00),
      (3, 'Dr. Vikramaditya Rao', 'Orthopedic Surgeon', '+91 9876543212', 'vikram.rao@hospital.org', 3, 750.00),
      (4, 'Dr. Priya Nambiar', 'Pediatric Specialist', '+91 9876543213', 'priya.nambiar@hospital.org', 4, 600.00),
      (5, 'Dr. Farhan Siddiqui', 'Medical Oncologist', '+91 9876543214', 'farhan.s@hospital.org', 5, 1000.00),
      (6, 'Dr. Sneha Kulkarni', 'General Physician', '+91 9876543215', 'sneha.k@hospital.org', 6, 500.00);

      UPDATE Departments SET head_doctor_id = 1 WHERE department_id = 1;
      UPDATE Departments SET head_doctor_id = 2 WHERE department_id = 2;
      UPDATE Departments SET head_doctor_id = 3 WHERE department_id = 3;
      UPDATE Departments SET head_doctor_id = 4 WHERE department_id = 4;
      UPDATE Departments SET head_doctor_id = 5 WHERE department_id = 5;
      UPDATE Departments SET head_doctor_id = 6 WHERE department_id = 6;
    `);
  }

  const patCount = db.prepare('SELECT COUNT(*) AS count FROM Patients').get().count;
  if (patCount === 0) {
    db.exec(`
      INSERT INTO Patients (patient_id, full_name, dob, gender, blood_group, contact, address, emergency_contact) VALUES
      (1, 'Aarav Patel', '1988-04-12', 'Male', 'O+', '+91 9123456780', 'Flat 402, Sunshine Apts, MG Road, Mumbai', '+91 9123456789'),
      (2, 'Meera Deshmukh', '1995-09-23', 'Female', 'B+', '+91 9123456781', '74 Greenwood Residency, Pune', '+91 9123456790'),
      (3, 'Rohan Verma', '1972-11-05', 'Male', 'A+', '+91 9123456782', '12 Rose Villa, Indiranagar, Bengaluru', '+91 9123456791'),
      (4, 'Kavita Nair', '2001-02-17', 'Female', 'AB+', '+91 9123456783', 'Block 5, Hilltop Enclave, Hyderabad', '+91 9123456792'),
      (5, 'Ishaan Sengupta', '2016-07-30', 'Male', 'O-', '+91 9123456784', '22 Park Street, Kolkata', '+91 9123456793'),
      (6, 'Zoya Khan', '1990-12-14', 'Female', 'A-', '+91 9123456785', 'Flat 101, Galaxy Heights, Delhi', '+91 9123456794');
    `);
  }

  const bedCount = db.prepare('SELECT COUNT(*) AS count FROM Rooms_Beds').get().count;
  if (bedCount === 0) {
    db.exec(`
      INSERT INTO Rooms_Beds (bed_id, room_number, bed_number, bed_type, daily_rate, status, department_id) VALUES
      (1, 'ICU-101', 'B-1', 'ICU', 5000.00, 'Occupied', 1),
      (2, 'ICU-101', 'B-2', 'ICU', 5000.00, 'Available', 1),
      (3, 'GW-201', 'B-1', 'General Ward', 1200.00, 'Occupied', 3),
      (4, 'GW-201', 'B-2', 'General Ward', 1200.00, 'Available', 3),
      (5, 'PVT-301', 'A-1', 'Private', 3500.00, 'Available', 2),
      (6, 'PVT-302', 'A-1', 'Private', 3500.00, 'Occupied', 5),
      (7, 'SEM-401', 'B-1', 'Semi-Private', 2200.00, 'Available', 4),
      (8, 'SEM-401', 'B-2', 'Semi-Private', 2200.00, 'Available', 6);
    `);
  }

  const apptCount = db.prepare('SELECT COUNT(*) AS count FROM Appointments').get().count;
  if (apptCount === 0) {
    db.exec(`
      INSERT INTO Appointments (appointment_id, patient_id, doctor_id, appointment_date, time_slot, status, reason) VALUES
      (1, 1, 1, '2026-10-01', '09:00 - 09:30', 'Completed', 'Chest discomfort and irregular palpitations'),
      (2, 2, 2, '2026-10-02', '10:00 - 10:30', 'Completed', 'Chronic migraine headaches with aura'),
      (3, 3, 3, '2026-10-03', '11:00 - 11:30', 'Completed', 'Right knee acute pain after slip and fall'),
      (4, 4, 1, '2026-10-06', '14:00 - 14:30', 'Scheduled', 'Hypertension follow-up consultation'),
      (5, 5, 4, '2026-10-07', '15:30 - 16:00', 'Scheduled', 'High fever and persistent cough'),
      (6, 6, 6, '2026-10-08', '11:30 - 12:00', 'Cancelled', 'Routine whole body health checkup');
    `);
  }

  const recCount = db.prepare('SELECT COUNT(*) AS count FROM Medical_Records').get().count;
  if (recCount === 0) {
    db.exec(`
      INSERT INTO Medical_Records (record_id, appointment_id, diagnosis, treatment, notes) VALUES
      (1, 1, 'Premature Ventricular Contractions (Mild Arrhythmia)', 'Metoprolol 25mg OD for 30 days', 'Avoid excessive caffeine; monitor resting heart rate.'),
      (2, 2, 'Chronic Migraine without aura complications', 'Sumatriptan 50mg SOS, Propranolol 40mg daily', 'Dark room rest, maintain headache log.'),
      (3, 3, 'Grade II Meniscal Strain', 'Aceclofenac + Paracetamol, Physiotherapy', 'Knee brace immobilizer recommended.');
    `);
  }

  const admCount = db.prepare('SELECT COUNT(*) AS count FROM Inpatient_Admissions').get().count;
  if (admCount === 0) {
    db.exec(`
      INSERT INTO Inpatient_Admissions (admission_id, patient_id, bed_id, admission_date, discharge_date, status, notes) VALUES
      (1, 1, 1, '2026-09-20', '2026-09-25', 'Discharged', 'Cardiac observation post-telemetry.'),
      (2, 3, 3, '2026-10-03', NULL, 'Admitted', 'Admitted for knee arthroscopy prep.'),
      (3, 2, 6, '2026-10-04', NULL, 'Admitted', 'Intractable migraine IV hydration therapy.');
    `);
  }

  const invCount = db.prepare('SELECT COUNT(*) AS count FROM Billing_Invoices').get().count;
  if (invCount === 0) {
    db.exec(`
      INSERT INTO Billing_Invoices (invoice_id, patient_id, appointment_id, admission_id, total_amount, payment_status, payment_method) VALUES
      (1, 1, 1, NULL, 800.00, 'Paid', 'UPI'),
      (2, 2, 2, NULL, 900.00, 'Paid', 'Credit Card'),
      (3, 3, 3, NULL, 750.00, 'Paid', 'Cash'),
      (4, 1, NULL, 1, 25000.00, 'Paid', 'Insurance'),
      (5, 4, 4, NULL, 800.00, 'Pending', 'Cash');
    `);
  }

  // Migration: Ensure password columns exist on Doctors and Patients
  try {
    const docCols = db.prepare('PRAGMA table_info(Doctors)').all().map(c => c.name);
    if (!docCols.includes('password')) {
      db.exec("ALTER TABLE Doctors ADD COLUMN password TEXT NOT NULL DEFAULT 'doctor123'");
    }
  } catch (e) {}

  try {
    const patCols = db.prepare('PRAGMA table_info(Patients)').all().map(c => c.name);
    if (!patCols.includes('password')) {
      db.exec("ALTER TABLE Patients ADD COLUMN password TEXT NOT NULL DEFAULT 'patient123'");
    }
  } catch (e) {}
}

initDatabase();

/**
 * Main Server Handler
 */
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // -------------------------------------------------------------------------
  // API: Health / Ping Check
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { status: 'healthy', database: 'connected', version: '2.0.0' });
  }

  // -------------------------------------------------------------------------
  // API: Authentication - Login (Doctor, Patient, Admin)
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/auth/login') {
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'Invalid JSON request' });
      const { role, identifier, password } = body;
      if (!role || !identifier || !password) {
        return sendJson(res, 400, { error: 'Role, identifier, and password are required' });
      }

      const idVal = String(identifier).trim();
      const passVal = String(password).trim();

      // Admin Login
      if (role === 'admin') {
        if ((idVal.toLowerCase() === 'admin' || idVal.toLowerCase() === 'admin@hospital.org') && passVal === 'admin123') {
          return sendJson(res, 200, {
            success: true,
            user: {
              role: 'admin',
              name: 'Hospital Administrator',
              username: 'admin',
              email: 'admin@hospital.org'
            }
          });
        }
        return sendJson(res, 401, { error: 'Invalid admin credentials. Use username: admin / password: admin123' });
      }

      // Doctor Login
      if (role === 'doctor') {
        try {
          const doc = db.prepare(`
            SELECT d.doctor_id, d.name, d.specialization, d.phone, d.email, d.consultation_fee, d.password,
                   dept.department_id, dept.name AS department_name, dept.location AS department_location
            FROM Doctors d
            JOIN Departments dept ON d.department_id = dept.department_id
            WHERE (LOWER(d.email) = LOWER(?) OR d.phone = ? OR d.doctor_id = ?)
          `).get(idVal, idVal, isNaN(idVal) ? -1 : parseInt(idVal, 10));

          if (!doc) {
            return sendJson(res, 404, { error: 'Doctor account not found with the provided email, phone, or ID.' });
          }

          if (doc.password && doc.password !== passVal) {
            return sendJson(res, 401, { error: 'Incorrect doctor password. (Default is doctor123)' });
          }

          const user = { ...doc, role: 'doctor' };
          delete user.password;
          return sendJson(res, 200, { success: true, user });
        } catch (dbErr) {
          return sendJson(res, 500, { error: dbErr.message });
        }
      }

      // Patient Login
      if (role === 'patient') {
        try {
          const pat = db.prepare(`
            SELECT p.patient_id, p.full_name, p.dob, p.gender, p.blood_group,
                   p.contact, p.emergency_contact, p.address, p.password
            FROM Patients p
            WHERE (p.contact = ? OR p.patient_id = ?)
          `).get(idVal, isNaN(idVal) ? -1 : parseInt(idVal, 10));

          if (!pat) {
            return sendJson(res, 404, { error: 'Patient account not found with provided phone contact or ID.' });
          }

          if (pat.password && pat.password !== passVal) {
            return sendJson(res, 401, { error: 'Incorrect patient password. (Default is patient123)' });
          }

          const user = {
            role: 'patient',
            patient_id: pat.patient_id,
            name: pat.full_name,
            dob: pat.dob,
            gender: pat.gender,
            blood_group: pat.blood_group,
            contact: pat.contact,
            emergency_contact: pat.emergency_contact,
            address: pat.address
          };
          return sendJson(res, 200, { success: true, user });
        } catch (dbErr) {
          return sendJson(res, 500, { error: dbErr.message });
        }
      }

      return sendJson(res, 400, { error: 'Invalid role specified. Must be doctor, patient, or admin.' });
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: Authentication - Register Patient
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/auth/register-patient') {
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'Invalid JSON request' });
      const { full_name, dob, gender, blood_group, contact, address, emergency_contact, password } = body;
      if (!full_name || !dob || !gender || !blood_group || !contact || !address) {
        return sendJson(res, 400, { error: 'Full name, DOB, gender, blood group, contact, and address are mandatory.' });
      }

      try {
        const pass = (password && String(password).trim()) || 'patient123';
        const emContact = emergency_contact || contact;
        const stmt = db.prepare(`
          INSERT INTO Patients (full_name, dob, gender, blood_group, contact, address, emergency_contact, password)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(full_name.trim(), dob, gender, blood_group, contact.trim(), address.trim(), emContact.trim(), pass);
        const newPatientId = Number(info.lastInsertRowid);

        return sendJson(res, 201, {
          success: true,
          message: 'Patient registered successfully',
          user: {
            role: 'patient',
            patient_id: newPatientId,
            name: full_name.trim(),
            dob,
            gender,
            blood_group,
            contact: contact.trim(),
            emergency_contact: emContact.trim(),
            address: address.trim()
          }
        });
      } catch (dbErr) {
        if (dbErr.message.includes('UNIQUE')) {
          return sendJson(res, 409, { error: 'Phone contact is already registered. Please log in with this contact.' });
        }
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: GET /api/dashboard-stats
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/dashboard-stats') {
    try {
      const totalPatients = db.prepare('SELECT COUNT(*) AS c FROM Patients').get().c;
      const totalDoctors = db.prepare('SELECT COUNT(*) AS c FROM Doctors').get().c;
      const totalBeds = db.prepare('SELECT COUNT(*) AS c FROM Rooms_Beds').get().c;
      const availableBeds = db.prepare("SELECT COUNT(*) AS c FROM Rooms_Beds WHERE status = 'Available'").get().c;
      const occupiedBeds = db.prepare("SELECT COUNT(*) AS c FROM Rooms_Beds WHERE status = 'Occupied'").get().c;
      const pendingInvoices = db.prepare("SELECT COUNT(*) AS c FROM Billing_Invoices WHERE payment_status = 'Pending'").get().c;
      const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) AS total FROM Billing_Invoices WHERE payment_status = 'Paid'").get().total;

      // Department bed statistics
      const deptBedStats = db.prepare(`
        SELECT 
          d.name AS department_name,
          COUNT(rb.bed_id) AS total_beds,
          COUNT(CASE WHEN rb.status = 'Occupied' THEN 1 END) AS occupied_beds,
          COUNT(CASE WHEN rb.status = 'Available' THEN 1 END) AS available_beds
        FROM Departments d
        LEFT JOIN Rooms_Beds rb ON d.department_id = rb.department_id
        GROUP BY d.department_id, d.name
      `).all();

      // Recent 10 appointments
      const recentAppointments = db.prepare(`
        SELECT 
          a.appointment_id,
          a.appointment_date,
          a.time_slot,
          a.status,
          a.reason,
          p.full_name AS patient_name,
          d.name AS doctor_name,
          d.specialization,
          dept.name AS department_name
        FROM Appointments a
        JOIN Patients p ON a.patient_id = p.patient_id
        JOIN Doctors d ON a.doctor_id = d.doctor_id
        JOIN Departments dept ON d.department_id = dept.department_id
        ORDER BY a.appointment_date DESC, a.time_slot DESC
        LIMIT 10
      `).all();

      return sendJson(res, 200, {
        kpis: {
          totalPatients,
          totalDoctors,
          totalBeds,
          availableBeds,
          occupiedBeds,
          pendingInvoices,
          totalRevenue
        },
        deptBedStats,
        recentAppointments
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // API: GET /api/patients
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/patients') {
    try {
      const patients = db.prepare(`
        SELECT 
          p.patient_id, 
          p.full_name, 
          p.dob, 
          p.gender, 
          p.blood_group, 
          p.contact, 
          p.address,
          p.emergency_contact,
          p.created_at,
          (SELECT COUNT(*) FROM Appointments WHERE patient_id = p.patient_id) AS appointment_count
        FROM Patients p 
        ORDER BY p.patient_id DESC
      `).all();
      return sendJson(res, 200, patients);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // API: POST /api/patients (Register patient)
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/patients') {
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'Invalid JSON request' });
      const { full_name, dob, gender, blood_group, contact, address, emergency_contact } = body;
      if (!full_name || !dob || !gender || !blood_group || !contact || !address || !emergency_contact) {
        return sendJson(res, 400, { error: 'All fields are mandatory' });
      }

      try {
        const stmt = db.prepare(`
          INSERT INTO Patients (full_name, dob, gender, blood_group, contact, address, emergency_contact)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(full_name, dob, gender, blood_group, contact, address, emergency_contact);
        return sendJson(res, 201, {
          message: 'Patient registered successfully',
          patient_id: Number(info.lastInsertRowid)
        });
      } catch (dbErr) {
        if (dbErr.message.includes('UNIQUE')) {
          return sendJson(res, 409, { error: 'Phone contact is already registered to another patient' });
        }
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: GET /api/doctors
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/doctors') {
    try {
      const doctors = db.prepare(`
        SELECT 
          d.doctor_id, 
          d.name, 
          d.specialization, 
          d.phone, 
          d.email, 
          d.consultation_fee,
          dept.name AS department_name,
          dept.location AS department_location,
          (SELECT COUNT(*) FROM Appointments WHERE doctor_id = d.doctor_id) AS total_consultations
        FROM Doctors d
        JOIN Departments dept ON d.department_id = dept.department_id
        ORDER BY d.doctor_id ASC
      `).all();
      return sendJson(res, 200, doctors);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // API: POST /api/doctors (Add New Doctor)
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/doctors') {
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'Invalid JSON request' });
      const { name, specialization, phone, email, department_id, consultation_fee } = body;
      if (!name || !specialization || !phone || !email || !department_id) {
        return sendJson(res, 400, { error: 'Name, specialization, phone, email, and department are mandatory.' });
      }

      try {
        const fee = parseFloat(consultation_fee) || 500.00;
        const deptId = parseInt(department_id, 10);
        const stmt = db.prepare(`
          INSERT INTO Doctors (name, specialization, phone, email, department_id, consultation_fee)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(name, specialization, phone, email, deptId, fee);
        return sendJson(res, 201, {
          message: 'Doctor added successfully',
          doctor_id: Number(info.lastInsertRowid)
        });
      } catch (dbErr) {
        if (dbErr.message.includes('UNIQUE')) {
          return sendJson(res, 409, { error: 'A doctor with this phone number or email is already registered.' });
        }
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: GET /api/departments
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/departments') {
    try {
      const departments = db.prepare('SELECT department_id, name, location FROM Departments ORDER BY department_id ASC').all();
      return sendJson(res, 200, departments);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }


  // -------------------------------------------------------------------------
  // API: GET /api/appointments
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/appointments') {
    try {
      const appointments = db.prepare(`
        SELECT 
          a.appointment_id,
          a.patient_id,
          a.doctor_id,
          a.appointment_date,
          a.time_slot,
          a.status,
          a.reason,
          p.full_name AS patient_name,
          p.contact AS patient_contact,
          p.blood_group,
          d.name AS doctor_name,
          d.specialization,
          dept.name AS department_name,
          inv.invoice_id,
          inv.payment_status
        FROM Appointments a
        JOIN Patients p ON a.patient_id = p.patient_id
        JOIN Doctors d ON a.doctor_id = d.doctor_id
        JOIN Departments dept ON d.department_id = dept.department_id
        LEFT JOIN Billing_Invoices inv ON a.appointment_id = inv.appointment_id
        ORDER BY a.appointment_date DESC, a.time_slot DESC
      `).all();
      return sendJson(res, 200, appointments);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // API: POST /api/appointments (Book appointment)
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/appointments') {
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'Invalid JSON request' });
      const { patient_id, doctor_id, appointment_date, time_slot, reason } = body;
      if (!patient_id || !doctor_id || !appointment_date || !time_slot || !reason) {
        return sendJson(res, 400, { error: 'Incomplete booking details' });
      }

      try {
        const conflict = db.prepare(`
          SELECT COUNT(*) AS c FROM Appointments 
          WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status <> 'Cancelled'
        `).get(doctor_id, appointment_date, time_slot);

        if (conflict.c > 0) {
          return sendJson(res, 409, { error: 'Selected doctor already has a confirmed booking for this slot.' });
        }

        const doc = db.prepare('SELECT consultation_fee FROM Doctors WHERE doctor_id = ?').get(doctor_id);
        const fee = doc ? doc.consultation_fee : 500.00;

        const stmt = db.prepare(`
          INSERT INTO Appointments (patient_id, doctor_id, appointment_date, time_slot, status, reason)
          VALUES (?, ?, ?, ?, 'Scheduled', ?)
        `);
        const info = stmt.run(patient_id, doctor_id, appointment_date, time_slot, reason);
        const apptId = Number(info.lastInsertRowid);

        // Auto-generate invoice
        db.prepare(`
          INSERT INTO Billing_Invoices (patient_id, appointment_id, total_amount, payment_status, payment_method)
          VALUES (?, ?, ?, 'Pending', 'Cash')
        `).run(patient_id, apptId, fee);

        return sendJson(res, 201, {
          message: 'Appointment booked successfully',
          appointment_id: apptId,
          consultation_fee: fee
        });
      } catch (dbErr) {
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: PATCH /api/appointments/:id/status
  // -------------------------------------------------------------------------
  if (method === 'PATCH' && pathname.startsWith('/api/appointments/')) {
    const parts = pathname.split('/');
    const apptId = parseInt(parts[3], 10);
    parseBody(req, (err, body) => {
      if (err || !body.status) return sendJson(res, 400, { error: 'Status is required' });
      try {
        db.prepare('UPDATE Appointments SET status = ? WHERE appointment_id = ?').run(body.status, apptId);
        return sendJson(res, 200, { message: `Appointment updated to ${body.status}` });
      } catch (dbErr) {
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: GET /api/beds (Beds & Inpatient Admissions)
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/beds') {
    try {
      const beds = db.prepare(`
        SELECT 
          rb.bed_id,
          rb.room_number,
          rb.bed_number,
          rb.bed_type,
          rb.daily_rate,
          rb.status,
          dept.name AS department_name,
          ia.admission_id,
          ia.admission_date,
          ia.patient_id,
          p.full_name AS admitted_patient_name
        FROM Rooms_Beds rb
        LEFT JOIN Departments dept ON rb.department_id = dept.department_id
        LEFT JOIN Inpatient_Admissions ia ON rb.bed_id = ia.bed_id AND ia.status = 'Admitted'
        LEFT JOIN Patients p ON ia.patient_id = p.patient_id
        ORDER BY rb.room_number ASC, rb.bed_number ASC
      `).all();

      const activeAdmissions = db.prepare(`
        SELECT 
          ia.admission_id,
          ia.admission_date,
          ia.status,
          ia.notes,
          p.patient_id,
          p.full_name AS patient_name,
          p.contact,
          rb.room_number,
          rb.bed_number,
          rb.bed_type,
          rb.daily_rate,
          dept.name AS department_name
        FROM Inpatient_Admissions ia
        JOIN Patients p ON ia.patient_id = p.patient_id
        JOIN Rooms_Beds rb ON ia.bed_id = rb.bed_id
        LEFT JOIN Departments dept ON rb.department_id = dept.department_id
        WHERE ia.status = 'Admitted'
        ORDER BY ia.admission_date DESC
      `).all();

      return sendJson(res, 200, { beds, activeAdmissions });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // API: POST /api/admissions (Admit Patient)
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/admissions') {
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'Invalid payload' });
      const { patient_id, bed_id, admission_date, notes } = body;
      if (!patient_id || !bed_id || !admission_date) {
        return sendJson(res, 400, { error: 'Patient, bed, and admission date are required' });
      }

      try {
        const bed = db.prepare('SELECT status FROM Rooms_Beds WHERE bed_id = ?').get(bed_id);
        if (!bed || bed.status !== 'Available') {
          return sendJson(res, 409, { error: 'Selected bed is not currently available' });
        }

        const stmt = db.prepare(`
          INSERT INTO Inpatient_Admissions (patient_id, bed_id, admission_date, status, notes)
          VALUES (?, ?, ?, 'Admitted', ?)
        `);
        const info = stmt.run(patient_id, bed_id, admission_date, notes || 'Routine inpatient admission');
        
        // Trigger equivalent: Mark bed as occupied
        db.prepare("UPDATE Rooms_Beds SET status = 'Occupied' WHERE bed_id = ?").run(bed_id);

        return sendJson(res, 201, {
          message: 'Patient admitted successfully',
          admission_id: Number(info.lastInsertRowid)
        });
      } catch (dbErr) {
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: POST /api/discharges (Discharge Patient & Generate Final Invoice)
  // Equivalent to stored procedure sp_DischargePatient
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/discharges') {
    parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'Invalid payload' });
      const { admission_id, discharge_date, payment_method } = body;
      if (!admission_id || !discharge_date) {
        return sendJson(res, 400, { error: 'Admission ID and discharge date are required' });
      }

      try {
        const admission = db.prepare(`
          SELECT ia.admission_id, ia.patient_id, ia.bed_id, ia.admission_date, ia.status, rb.daily_rate
          FROM Inpatient_Admissions ia
          JOIN Rooms_Beds rb ON ia.bed_id = rb.bed_id
          WHERE ia.admission_id = ?
        `).get(admission_id);

        if (!admission) return sendJson(res, 404, { error: 'Admission record not found' });
        if (admission.status === 'Discharged') return sendJson(res, 400, { error: 'Patient already discharged' });

        const d1 = new Date(admission.admission_date);
        const d2 = new Date(discharge_date);
        let days = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
        const totalBilled = days * admission.daily_rate;

        // Update Admission
        db.prepare("UPDATE Inpatient_Admissions SET discharge_date = ?, status = 'Discharged' WHERE admission_id = ?")
          .run(discharge_date, admission_id);

        // Free Bed
        db.prepare("UPDATE Rooms_Beds SET status = 'Available' WHERE bed_id = ?").run(admission.bed_id);

        // Generate Billing Invoice
        const invInfo = db.prepare(`
          INSERT INTO Billing_Invoices (patient_id, admission_id, total_amount, payment_status, payment_method)
          VALUES (?, ?, ?, 'Paid', ?)
        `).run(admission.patient_id, admission_id, totalBilled, payment_method || 'Cash');

        return sendJson(res, 200, {
          message: `Discharged after ${days} day(s). Bed released.`,
          daysStay: days,
          totalBilled,
          invoice_id: Number(invInfo.lastInsertRowid)
        });
      } catch (dbErr) {
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: GET /api/invoices
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/invoices') {
    try {
      const invoices = db.prepare(`
        SELECT 
          inv.invoice_id,
          inv.patient_id,
          inv.total_amount,
          inv.payment_status,
          inv.payment_method,
          inv.invoice_date,
          inv.appointment_id,
          inv.admission_id,
          p.full_name AS patient_name,
          p.contact AS patient_contact,
          CASE 
            WHEN inv.admission_id IS NOT NULL THEN 'Inpatient Stay'
            ELSE 'Doctor Consultation'
          END AS bill_type
        FROM Billing_Invoices inv
        JOIN Patients p ON inv.patient_id = p.patient_id
        ORDER BY inv.invoice_date DESC
      `).all();
      return sendJson(res, 200, invoices);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // API: POST /api/invoices/:id/pay (Process Payment)
  // -------------------------------------------------------------------------
  if (method === 'POST' && pathname.match(/^\/api\/invoices\/\d+\/pay$/)) {
    const invId = parseInt(pathname.split('/')[3], 10);
    parseBody(req, (err, body) => {
      const method = (body && body.payment_method) || 'Cash';
      try {
        db.prepare("UPDATE Billing_Invoices SET payment_status = 'Paid', payment_method = ? WHERE invoice_id = ?")
          .run(method, invId);
        return sendJson(res, 200, { message: `Invoice #${invId} settled successfully via ${method}.` });
      } catch (dbErr) {
        return sendJson(res, 500, { error: dbErr.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------------------
  // API: GET /api/medical-records
  // -------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/medical-records') {
    try {
      const records = db.prepare(`
        SELECT 
          mr.record_id,
          mr.diagnosis,
          mr.treatment,
          mr.notes,
          mr.date_recorded,
          a.appointment_id,
          a.appointment_date,
          p.patient_id,
          p.full_name AS patient_name,
          d.name AS doctor_name,
          d.specialization
        FROM Medical_Records mr
        JOIN Appointments a ON mr.appointment_id = a.appointment_id
        JOIN Patients p ON a.patient_id = p.patient_id
        JOIN Doctors d ON a.doctor_id = d.doctor_id
        ORDER BY mr.date_recorded DESC
      `).all();
      return sendJson(res, 200, records);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // Static File Serving
  // -------------------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    const rootPath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    if (fs.existsSync(rootPath)) filePath = rootPath;
  }
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 File Not Found');
      } else {
        res.writeHead(500);
        res.end(`Internal Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

// Helper utilities
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const parsed = body ? JSON.parse(body) : {};
      callback(null, parsed);
    } catch (e) {
      callback(e);
    }
  });
}

const HOST = '127.0.0.1';

// Start Server with Port Fallback and EACCES handling
function startServer(portToTry) {
  server.listen(portToTry, HOST, () => {
    console.log(`=======================================================`);
    console.log(` MediCore Hospital Management System is Live!`);
    console.log(` Access Dashboard at: http://${HOST}:${portToTry}`);
    console.log(` Localhost URL:       http://localhost:${portToTry}`);
    console.log(` Database:            ${DB_PATH}`);
    console.log(`=======================================================`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
      console.log(`Port ${portToTry} unavailable (${err.code}), trying port ${portToTry + 1}...`);
      if (portToTry < 3015) {
        startServer(portToTry + 1);
      } else {
        console.error('Could not find an open port in range 3000-3015.');
      }
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
