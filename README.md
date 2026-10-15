# MediCore - Hospital Management System (HMS)
### Academic DBMS Project Specification & Full-Stack Reference Architecture

---

## 1. Project Overview & Architectural Scope

The **MediCore Hospital Management System** is a normalized (3NF) relational database solution designed to administer core hospital operations:
* **Clinical Departments & Medical Personnel**
* **Patient Demographics & Medical Profiles**
* **Outpatient Appointments & Real-Time Doctor Scheduling**
* **Electronic Health Records (EHR) & Prescriptions**
* **Inpatient Ward Admissions & Bed Inventory Lifecycle**
* **Accounts Receivable, Service Invoicing, and Payment Tracking**

---

## 2. Relational Schema Architecture (Third Normal Form - 3NF)

### 2.1 Normalization Analysis
1. **First Normal Form (1NF)**:
   * Every attribute contains atomic (indivisible) scalar values.
   * Repeating groups are eliminated; composite fields such as addresses, phone numbers, and biological parameters are represented as single discrete attributes or decomposed into specific relations.
   * Unique primary keys identify every tuple across all relations.
2. **Second Normal Form (2NF)**:
   * The relation is in 1NF.
   * All non-prime attributes are **fully functionally dependent** on the primary key. In relations with composite keys (e.g. `(room_number, bed_number)` in `Rooms_Beds`), non-key attributes (`bed_type`, `daily_rate`, `status`) depend on the complete key entity, isolated by surrogate key `bed_id`.
3. **Third Normal Form (3NF)**:
   * The relation is in 2NF.
   * **No transitive dependencies** ($X \rightarrow Y \rightarrow Z$) exist.
   * *Example*: Doctor department assignments only store `department_id` in the `Doctors` table rather than denormalizing department location or name. Bed inventory is decoupled from patient admissions into `Rooms_Beds` and `Inpatient_Admissions`, preventing update anomalies when beds are unoccupied.

---

## 3. Directory Structure

```text
hospital_management_system/
├── database/
│   ├── schema.sql            # 3NF DDL Tables, Constraints, and Seed Inserts
│   ├── advanced_queries.sql  # Views, Triggers, Stored Procedures, Analytical Queries
│   └── hospital.db           # Pre-compiled active SQLite database instance
├── public/
│   ├── index.html            # Semantic HTML5 Dashboard & Input Forms
│   ├── styles.css            # Vanilla CSS3 Healthcare Design System
│   └── app.js                # Vanilla JavaScript Client Fetch Controller
├── server.js                 # Zero-dependency Node.js REST API Server
├── app.py                    # Python Flask Backend Alternative
└── README.md                 # Complete DBMS Project Documentation
```

---

## 4. How to Run the Project

### Option A: Node.js (Verified & Active)
Node.js (v18+) includes built-in SQLite support. Zero npm installations required:
```bash
cd c:\Users\24105A0068\Downloads\hospital_management_system
node server.js
```
Open your browser at: **`http://localhost:3000`**

### Option B: Python Flask
```bash
pip install flask
python app.py
```
Open your browser at: **`http://localhost:5000`**

### Option C: Import to MySQL / MariaDB / PostgreSQL
1. Open **MySQL Workbench**, **phpMyAdmin**, or command line `mysql -u root -p`.
2. Run `database/schema.sql` to generate all tables, foreign keys, and seed data.
3. Run `database/advanced_queries.sql` to compile views, triggers, and stored procedures.

---

## 5. Multi-Role Portal Authentication (Doctor, Patient & Admin)

The system includes dedicated, role-separated authentication and portals for **Doctors**, **Patients**, and **Hospital Staff**:

### 🩺 Doctor Portal Login
* **Doctor Email / Phone:** E.g., `rajesh.sharma@hospital.org` or `+91 9876543210`
* **Default Password:** `doctor123`
* **Portal Privileges:** View doctor's personal outpatient roster, write clinical diagnoses / prescriptions (EMR), view hospital ward beds, and manage appointments.

### 👤 Patient Portal Login
* **Patient Mobile / ID:** E.g., `+91 9123456780` or `1`
* **Default Password:** `patient123`
* **New Patient Registration:** Patients can click *"Create New Patient Account"* directly from the login screen to register with their name, DOB, blood group, contact, and custom password.
* **Portal Privileges:** View upcoming appointments, book consultations with specialist doctors, view electronic prescriptions and diagnosis history, settle medical bills, and scan handwritten/printed prescription photos.

### 🛡️ Administrative Staff Login
* **Admin Username:** `admin`
* **Admin Password:** `admin123`
* **Portal Privileges:** Complete administrative control over departments, master doctors directory, inpatient admissions, bed allocation, and financial invoicing.

