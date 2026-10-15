"""
Academic DBMS Project: Hospital Management System (HMS)
Python Flask Backend Alternative
Demonstrating parameterized queries and REST endpoints for academic submission.
Compatible with SQLite (local zero-config) and MySQL (via PyMySQL or mysql-connector-python).
"""

import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="public", static_url_path="")
DB_FILE = os.path.join(os.path.dirname(__file__), "database", "hospital.db")


def get_db_connection():
    """
    Establishes secure database connection with row dictionary mapping.
    For MySQL, replace with:
        import mysql.connector
        return mysql.connector.connect(
            host="localhost", user="root", password="your_password", database="hospital_db"
        )
    """
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "database": "connected", "engine": "Flask"})


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    """Authenticates doctor, patient, or admin with role separation."""
    data = request.get_json() or {}
    role = data.get("role")
    identifier = str(data.get("identifier", "")).strip()
    password = str(data.get("password", "")).strip()

    if not role or not identifier or not password:
        return jsonify({"error": "Role, identifier, and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if role == "admin":
            if identifier.lower() in ["admin", "admin@hospital.org"] and password == "admin123":
                return jsonify({
                    "success": True,
                    "user": {
                        "role": "admin",
                        "name": "Hospital Administrator",
                        "username": "admin",
                        "email": "admin@hospital.org"
                    }
                })
            return jsonify({"error": "Invalid admin credentials. Use username: admin / password: admin123"}), 401

        if role == "doctor":
            doc_id = int(identifier) if identifier.isdigit() else -1
            query = """
                SELECT d.doctor_id, d.name, d.specialization, d.phone, d.email, d.consultation_fee, d.password,
                       dept.department_id, dept.name AS department_name, dept.location AS department_location
                FROM Doctors d
                JOIN Departments dept ON d.department_id = dept.department_id
                WHERE (LOWER(d.email) = LOWER(?) OR d.phone = ? OR d.doctor_id = ?)
            """
            doc = cursor.execute(query, (identifier, identifier, doc_id)).fetchone()
            if not doc:
                return jsonify({"error": "Doctor account not found with the provided email/phone."}), 404
            doc_dict = dict(doc)
            if doc_dict.get("password") and doc_dict["password"] != password:
                return jsonify({"error": "Incorrect doctor password. (Default is doctor123)"}), 401
            del doc_dict["password"]
            doc_dict["role"] = "doctor"
            return jsonify({"success": True, "user": doc_dict})

        if role == "patient":
            pat_id = int(identifier) if identifier.isdigit() else -1
            query = """
                SELECT p.patient_id, p.full_name AS name, p.dob, p.gender, p.blood_group,
                       p.contact, p.emergency_contact, p.address, p.password
                FROM Patients p
                WHERE (p.contact = ? OR p.patient_id = ?)
            """
            pat = cursor.execute(query, (identifier, pat_id)).fetchone()
            if not pat:
                return jsonify({"error": "Patient account not found with the provided contact/ID."}), 404
            pat_dict = dict(pat)
            if pat_dict.get("password") and pat_dict["password"] != password:
                return jsonify({"error": "Incorrect patient password. (Default is patient123)"}), 401
            del pat_dict["password"]
            pat_dict["role"] = "patient"
            return jsonify({"success": True, "user": pat_dict})

        return jsonify({"error": "Invalid role specified. Must be doctor, patient, or admin."}), 400
    finally:
        conn.close()


@app.route("/api/auth/register-patient", methods=["POST"])
def auth_register_patient():
    """Allows new patients to register and creates an authenticated account."""
    data = request.get_json() or {}
    required = ["full_name", "dob", "gender", "blood_group", "contact", "address"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Missing required field: {field}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        password = str(data.get("password") or "patient123").strip()
        em_contact = str(data.get("emergency_contact") or data.get("contact")).strip()
        insert_sql = """
            INSERT INTO Patients (full_name, dob, gender, blood_group, contact, address, emergency_contact, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        cursor.execute(
            insert_sql,
            (
                data["full_name"].strip(),
                data["dob"],
                data["gender"],
                data["blood_group"],
                data["contact"].strip(),
                data["address"].strip(),
                em_contact,
                password,
            ),
        )
        conn.commit()
        patient_id = cursor.lastrowid
        return jsonify({
            "success": True,
            "message": "Patient registered successfully",
            "user": {
                "role": "patient",
                "patient_id": patient_id,
                "name": data["full_name"].strip(),
                "dob": data["dob"],
                "gender": data["gender"],
                "blood_group": data["blood_group"],
                "contact": data["contact"].strip(),
                "emergency_contact": em_contact,
                "address": data["address"].strip(),
            }
        }), 201
    except sqlite3.IntegrityError as e:
        return jsonify({"error": "Duplicate contact number: " + str(e)}), 409
    finally:
        conn.close()


@app.route("/api/dashboard-stats", methods=["GET"])
def get_dashboard_stats():
    """Returns KPI cards statistics and recent appointments using parameterized queries."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Aggregation metrics
        total_patients = cursor.execute("SELECT COUNT(*) FROM Patients").fetchone()[0]
        total_doctors = cursor.execute("SELECT COUNT(*) FROM Doctors").fetchone()[0]
        available_beds = cursor.execute(
            "SELECT COUNT(*) FROM Rooms_Beds WHERE status = 'Available'"
        ).fetchone()[0]
        pending_invoices = cursor.execute(
            "SELECT COUNT(*) FROM Billing_Invoices WHERE payment_status = 'Pending'"
        ).fetchone()[0]

        # Multi-table JOIN query for recent appointments
        query = """
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
        """
        rows = cursor.execute(query).fetchall()
        recent_appts = [dict(row) for row in rows]

        return jsonify({
            "kpis": {
                "totalPatients": total_patients,
                "totalDoctors": total_doctors,
                "availableBeds": available_beds,
                "pendingInvoices": pending_invoices,
            },
            "recentAppointments": recent_appts
        })
    finally:
        conn.close()


@app.route("/api/patients", methods=["GET", "POST"])
def manage_patients():
    """GET: Retrieve patient directory. POST: Securely register new patient."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if request.method == "GET":
            rows = cursor.execute(
                "SELECT patient_id, full_name, dob, gender, blood_group, contact FROM Patients ORDER BY patient_id DESC"
            ).fetchall()
            return jsonify([dict(row) for row in rows])

        # POST - Register Patient
        data = request.get_json() or {}
        required = ["full_name", "dob", "gender", "blood_group", "contact", "emergency_contact", "address"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Parameterized query to prevent SQL Injection
        insert_sql = """
            INSERT INTO Patients (full_name, dob, gender, blood_group, contact, address, emergency_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        cursor.execute(
            insert_sql,
            (
                data["full_name"].strip(),
                data["dob"],
                data["gender"],
                data["blood_group"],
                data["contact"].strip(),
                data["address"].strip(),
                data["emergency_contact"].strip(),
            ),
        )
        conn.commit()
        patient_id = cursor.lastrowid

        return jsonify({
            "message": "Patient registered successfully",
            "patient_id": patient_id
        }), 201

    except sqlite3.IntegrityError as e:
        return jsonify({"error": "Duplicate contact number or constraint violation: " + str(e)}), 409
    finally:
        conn.close()


@app.route("/api/doctors", methods=["GET", "POST"])
def manage_doctors():
    """GET: Returns doctor list. POST: Registers new doctor with parameterized query."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == "GET":
            query = """
                SELECT d.doctor_id, d.name, d.specialization, d.phone, d.email, d.consultation_fee, dept.name AS department_name
                FROM Doctors d
                JOIN Departments dept ON d.department_id = dept.department_id
                ORDER BY d.doctor_id ASC
            """
            rows = cursor.execute(query).fetchall()
            return jsonify([dict(row) for row in rows])

        # POST - Register Doctor
        data = request.get_json() or {}
        required = ["name", "specialization", "phone", "email", "department_id"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400

        fee = float(data.get("consultation_fee") or 500.00)
        insert_sql = """
            INSERT INTO Doctors (name, specialization, phone, email, department_id, consultation_fee)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        cursor.execute(
            insert_sql,
            (
                data["name"].strip(),
                data["specialization"].strip(),
                data["phone"].strip(),
                data["email"].strip(),
                int(data["department_id"]),
                fee,
            ),
        )
        conn.commit()
        doctor_id = cursor.lastrowid
        return jsonify({
            "message": "Doctor registered successfully",
            "doctor_id": doctor_id
        }), 201

    except sqlite3.IntegrityError as e:
        return jsonify({"error": "Duplicate phone/email or constraint violation: " + str(e)}), 409
    finally:
        conn.close()



@app.route("/api/appointments", methods=["POST"])
def book_appointment():
    """Validates doctor schedule conflict and books appointment with consultation billing."""
    data = request.get_json() or {}
    patient_id = data.get("patient_id")
    doctor_id = data.get("doctor_id")
    appointment_date = data.get("appointment_date")
    time_slot = data.get("time_slot")
    reason = data.get("reason", "").strip()

    if not all([patient_id, doctor_id, appointment_date, time_slot, reason]):
        return jsonify({"error": "All booking fields are mandatory"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Parameterized Conflict Check
        conflict_query = """
            SELECT COUNT(*) FROM Appointments
            WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status <> 'Cancelled'
        """
        conflict_count = cursor.execute(
            conflict_query, (doctor_id, appointment_date, time_slot)
        ).fetchone()[0]

        if conflict_count > 0:
            return jsonify({"error": "Doctor is unavailable at this date and time slot"}), 409

        # 2. Get Doctor Consultation Fee
        doc_row = cursor.execute(
            "SELECT consultation_fee FROM Doctors WHERE doctor_id = ?", (doctor_id,)
        ).fetchone()
        fee = doc_row["consultation_fee"] if doc_row else 500.00

        # 3. Insert Appointment
        cursor.execute(
            """
            INSERT INTO Appointments (patient_id, doctor_id, appointment_date, time_slot, status, reason)
            VALUES (?, ?, ?, ?, 'Scheduled', ?)
            """,
            (patient_id, doctor_id, appointment_date, time_slot, reason),
        )
        appointment_id = cursor.lastrowid

        # 4. Generate Pending Consultation Invoice
        cursor.execute(
            """
            INSERT INTO Billing_Invoices (patient_id, appointment_id, total_amount, payment_status, payment_method)
            VALUES (?, ?, ?, 'Pending', 'Cash')
            """,
            (patient_id, appointment_id, fee),
        )
        conn.commit()

        return jsonify({
            "message": "Appointment booked successfully",
            "appointment_id": appointment_id,
            "consultation_fee": fee
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


if __name__ == "__main__":
    print("Serving Hospital Management System on http://localhost:5000")
    app.run(debug=True, port=5000)
