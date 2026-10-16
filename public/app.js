/**
 * MediCore Hospital Management System - Complete Reactive Client Controller
 * Architecture: Hybrid Online/Offline Architecture.
 * Automatically communicates with Node.js/Python SQL Backend if reachable,
 * or runs autonomously in-memory/localStorage so all actions work in any environment!
 */

let API_BASE = '/api';
let isBackendOnline = false;

let currentUser = null; // { role: 'doctor' | 'patient' | 'admin', ... }

// Application State Store
let state = {
  patients: [],
  doctors: [],
  departments: [],
  beds: [],
  activeAdmissions: [],
  appointments: [],
  invoices: [],
  records: [],
  currentView: 'overview'
};

// Seed dataset matching the 3NF SQL schema
const SEED_DATA = {
  departments: [
    { department_id: 1, name: 'Cardiology', location: 'Block A, 3rd Floor' },
    { department_id: 2, name: 'Neurology', location: 'Block B, 2nd Floor' },
    { department_id: 3, name: 'Orthopedics', location: 'Block A, 1st Floor' },
    { department_id: 4, name: 'Pediatrics', location: 'Block C, Ground Floor' },
    { department_id: 5, name: 'Oncology', location: 'Block D, 4th Floor' },
    { department_id: 6, name: 'General Medicine', location: 'Block A, Ground Floor' }
  ],
  doctors: [
    { doctor_id: 1, name: 'Dr. Rajesh Sharma', specialization: 'Senior Cardiologist', department_id: 1, department_name: 'Cardiology', phone: '+91 9876543210', email: 'rajesh.sharma@hospital.org', password: 'doctor123', consultation_fee: 800.00 },
    { doctor_id: 2, name: 'Dr. Ananya Iyer', specialization: 'Consultant Neurologist', department_id: 2, department_name: 'Neurology', phone: '+91 9876543211', email: 'ananya.iyer@hospital.org', password: 'doctor123', consultation_fee: 900.00 },
    { doctor_id: 3, name: 'Dr. Vikramaditya Rao', specialization: 'Orthopedic Surgeon', department_id: 3, department_name: 'Orthopedics', phone: '+91 9876543212', email: 'vikram.rao@hospital.org', password: 'doctor123', consultation_fee: 750.00 },
    { doctor_id: 4, name: 'Dr. Priya Nambiar', specialization: 'Pediatric Specialist', department_id: 4, department_name: 'Pediatrics', phone: '+91 9876543213', email: 'priya.nambiar@hospital.org', password: 'doctor123', consultation_fee: 600.00 },
    { doctor_id: 5, name: 'Dr. Farhan Siddiqui', specialization: 'Medical Oncologist', department_id: 5, department_name: 'Oncology', phone: '+91 9876543214', email: 'farhan.s@hospital.org', password: 'doctor123', consultation_fee: 1000.00 },
    { doctor_id: 6, name: 'Dr. Sneha Kulkarni', specialization: 'General Physician', department_id: 6, department_name: 'General Medicine', phone: '+91 9876543215', email: 'sneha.k@hospital.org', password: 'doctor123', consultation_fee: 500.00 }
  ],
  patients: [
    { patient_id: 1, full_name: 'Aarav Patel', dob: '1988-04-12', gender: 'Male', blood_group: 'O+', contact: '+91 9123456780', password: 'patient123', emergency_contact: '+91 9123456789', address: 'Flat 402, Sunshine Apts, MG Road, Mumbai' },
    { patient_id: 2, full_name: 'Meera Deshmukh', dob: '1995-09-23', gender: 'Female', blood_group: 'B+', contact: '+91 9123456781', password: 'patient123', emergency_contact: '+91 9123456790', address: '74 Greenwood Residency, Pune' },
    { patient_id: 3, full_name: 'Rohan Verma', dob: '1972-11-05', gender: 'Male', blood_group: 'A+', contact: '+91 9123456782', password: 'patient123', emergency_contact: '+91 9123456791', address: '12 Rose Villa, Indiranagar, Bengaluru' },
    { patient_id: 4, full_name: 'Kavita Nair', dob: '2001-02-17', gender: 'Female', blood_group: 'AB+', contact: '+91 9123456783', password: 'patient123', emergency_contact: '+91 9123456792', address: 'Block 5, Hilltop Enclave, Hyderabad' },
    { patient_id: 5, full_name: 'Ishaan Sengupta', dob: '2016-07-30', gender: 'Male', blood_group: 'O-', contact: '+91 9123456784', password: 'patient123', emergency_contact: '+91 9123456793', address: '22 Park Street, Kolkata' },
    { patient_id: 6, full_name: 'Zoya Khan', dob: '1990-12-14', gender: 'Female', blood_group: 'A-', contact: '+91 9123456785', password: 'patient123', emergency_contact: '+91 9123456794', address: 'Flat 101, Galaxy Heights, Delhi' }
  ],
  beds: [
    { bed_id: 1, room_number: 'ICU-101', bed_number: 'B-1', bed_type: 'ICU', daily_rate: 5000.00, status: 'Occupied', department_id: 1, department_name: 'Cardiology' },
    { bed_id: 2, room_number: 'ICU-101', bed_number: 'B-2', bed_type: 'ICU', daily_rate: 5000.00, status: 'Available', department_id: 1, department_name: 'Cardiology' },
    { bed_id: 3, room_number: 'GW-201', bed_number: 'B-1', bed_type: 'General Ward', daily_rate: 1200.00, status: 'Occupied', department_id: 3, department_name: 'Orthopedics' },
    { bed_id: 4, room_number: 'GW-201', bed_number: 'B-2', bed_type: 'General Ward', daily_rate: 1200.00, status: 'Available', department_id: 3, department_name: 'Orthopedics' },
    { bed_id: 5, room_number: 'PVT-301', bed_number: 'A-1', bed_type: 'Private', daily_rate: 3500.00, status: 'Available', department_id: 2, department_name: 'Neurology' },
    { bed_id: 6, room_number: 'PVT-302', bed_number: 'A-1', bed_type: 'Private', daily_rate: 3500.00, status: 'Occupied', department_id: 5, department_name: 'Oncology' },
    { bed_id: 7, room_number: 'SEM-401', bed_number: 'B-1', bed_type: 'Semi-Private', daily_rate: 2200.00, status: 'Available', department_id: 4, department_name: 'Pediatrics' },
    { bed_id: 8, room_number: 'SEM-401', bed_number: 'B-2', bed_type: 'Semi-Private', daily_rate: 2200.00, status: 'Available', department_id: 6, department_name: 'General Medicine' }
  ],
  activeAdmissions: [
    { admission_id: 2, patient_id: 3, patient_name: 'Rohan Verma', contact: '+91 9123456782', bed_id: 3, room_number: 'GW-201', bed_number: 'B-1', bed_type: 'General Ward', daily_rate: 1200.00, admission_date: '2026-10-03', department_name: 'Orthopedics' },
    { admission_id: 3, patient_id: 2, patient_name: 'Meera Deshmukh', contact: '+91 9123456781', bed_id: 6, room_number: 'PVT-302', bed_number: 'A-1', bed_type: 'Private', daily_rate: 3500.00, admission_date: '2026-10-04', department_name: 'Oncology' },
    { admission_id: 4, patient_id: 4, patient_name: 'Kavita Nair', contact: '+91 9123456783', bed_id: 1, room_number: 'ICU-101', bed_number: 'B-1', bed_type: 'ICU', daily_rate: 5000.00, admission_date: '2026-10-05', department_name: 'Cardiology' }
  ],
  appointments: [
    { appointment_id: 1, patient_id: 1, patient_name: 'Aarav Patel', doctor_id: 1, doctor_name: 'Dr. Rajesh Sharma', specialization: 'Senior Cardiologist', department_name: 'Cardiology', appointment_date: '2026-10-01', time_slot: '09:00 - 09:30', status: 'Completed', reason: 'Chest discomfort and palpitations', payment_status: 'Paid' },
    { appointment_id: 2, patient_id: 2, patient_name: 'Meera Deshmukh', doctor_id: 2, doctor_name: 'Dr. Ananya Iyer', specialization: 'Consultant Neurologist', department_name: 'Neurology', appointment_date: '2026-10-02', time_slot: '10:00 - 10:30', status: 'Completed', reason: 'Chronic migraine headaches with aura', payment_status: 'Paid' },
    { appointment_id: 3, patient_id: 3, patient_name: 'Rohan Verma', doctor_id: 3, doctor_name: 'Dr. Vikramaditya Rao', specialization: 'Orthopedic Surgeon', department_name: 'Orthopedics', appointment_date: '2026-10-03', time_slot: '11:00 - 11:30', status: 'Completed', reason: 'Right knee pain after fall', payment_status: 'Paid' },
    { appointment_id: 4, patient_id: 4, patient_name: 'Kavita Nair', doctor_id: 1, doctor_name: 'Dr. Rajesh Sharma', specialization: 'Senior Cardiologist', department_name: 'Cardiology', appointment_date: '2026-10-06', time_slot: '14:00 - 14:30', status: 'Scheduled', reason: 'Hypertension follow-up consultation', payment_status: 'Pending' },
    { appointment_id: 5, patient_id: 5, patient_name: 'Ishaan Sengupta', doctor_id: 4, doctor_name: 'Dr. Priya Nambiar', specialization: 'Pediatric Specialist', department_name: 'Pediatrics', appointment_date: '2026-10-07', time_slot: '15:30 - 16:00', status: 'Scheduled', reason: 'High fever and persistent cough', payment_status: 'Pending' },
    { appointment_id: 6, patient_id: 6, patient_name: 'Zoya Khan', doctor_id: 6, doctor_name: 'Dr. Sneha Kulkarni', specialization: 'General Physician', department_name: 'General Medicine', appointment_date: '2026-10-08', time_slot: '11:30 - 12:00', status: 'Cancelled', reason: 'Routine whole body health checkup', payment_status: 'Pending' }
  ],
  invoices: [
    { invoice_id: 1, patient_id: 1, patient_name: 'Aarav Patel', bill_type: 'Doctor Consultation', total_amount: 800.00, payment_status: 'Paid', payment_method: 'UPI', invoice_date: '2026-10-01 09:45:00' },
    { invoice_id: 2, patient_id: 2, patient_name: 'Meera Deshmukh', bill_type: 'Doctor Consultation', total_amount: 900.00, payment_status: 'Paid', payment_method: 'Credit Card', invoice_date: '2026-10-02 10:40:00' },
    { invoice_id: 3, patient_id: 3, patient_name: 'Rohan Verma', bill_type: 'Doctor Consultation', total_amount: 750.00, payment_status: 'Paid', payment_method: 'Cash', invoice_date: '2026-10-03 11:45:00' },
    { invoice_id: 4, patient_id: 1, patient_name: 'Aarav Patel', bill_type: 'Inpatient Stay', total_amount: 25000.00, payment_status: 'Paid', payment_method: 'Insurance', invoice_date: '2026-09-25 14:00:00' },
    { invoice_id: 5, patient_id: 4, patient_name: 'Kavita Nair', bill_type: 'Doctor Consultation', total_amount: 800.00, payment_status: 'Pending', payment_method: 'Cash', invoice_date: '2026-10-06 14:30:00' }
  ],
  records: [
    { record_id: 1, patient_id: 1, patient_name: 'Aarav Patel', doctor_name: 'Dr. Rajesh Sharma', specialization: 'Senior Cardiologist', appointment_id: 1, appointment_date: '2026-10-01', diagnosis: 'Premature Ventricular Contractions (Mild Arrhythmia)', treatment: 'Metoprolol 25mg OD for 30 days, ECG & Echo advised', notes: 'Avoid caffeine; follow low sodium diet.' },
    { record_id: 2, patient_id: 2, patient_name: 'Meera Deshmukh', doctor_name: 'Dr. Ananya Iyer', specialization: 'Consultant Neurologist', appointment_id: 2, appointment_date: '2026-10-02', diagnosis: 'Chronic Migraine without complications', treatment: 'Sumatriptan 50mg SOS, Propranolol 40mg daily', notes: 'Advised dark room rest and headache log.' },
    { record_id: 3, patient_id: 3, patient_name: 'Rohan Verma', doctor_name: 'Dr. Vikramaditya Rao', specialization: 'Orthopedic Surgeon', appointment_id: 3, appointment_date: '2026-10-03', diagnosis: 'Meniscal Tear (Right Knee, Grade II)', treatment: 'NSAIDs twice daily, Physical Therapy 3x/week', notes: 'Knee brace immobilizer recommended.' }
  ]
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupGlobalShortcuts();
  await checkBackendAndLoadData();
  initAuthenticationState();
});

/**
 * Detects whether Node.js REST server is running, falls back gracefully to local storage
 */
async function checkBackendAndLoadData() {
  const statusIndicator = document.getElementById('system-status-indicator');
  const statusText = document.getElementById('status-text');
  const authStatus = document.getElementById('auth-system-status');

  const candidates = [
    '/api',
    'http://localhost:5000/api',
    'http://127.0.0.1:5000/api',
    'http://localhost:3000/api',
    'http://127.0.0.1:3000/api',
    'http://localhost:8080/api'
  ];

  isBackendOnline = false;
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1200) });
      if (res.ok) {
        API_BASE = base;
        isBackendOnline = true;
        const portDisplay = base.startsWith('http') ? base.replace('/api', '').replace('http://', '') : 'Same-Origin';
        if (statusIndicator) {
          const dot = statusIndicator.querySelector('.status-dot');
          if (dot) dot.className = 'status-dot online';
        }
        if (statusText) statusText.textContent = `SQLite Connected (${portDisplay})`;
        if (authStatus) {
          authStatus.className = 'auth-status-pill online';
          authStatus.innerHTML = `🟢 <strong>SQLite Database Active (${portDisplay})</strong> &bull; Changes write directly to database/hospital.db`;
        }
        break;
      }
    } catch (e) {}
  }

  if (!isBackendOnline) {
    if (statusIndicator) {
      const dot = statusIndicator.querySelector('.status-dot');
      if (dot) dot.className = 'status-dot standalone';
    }
    if (statusText) statusText.textContent = 'Browser Storage (Server Offline)';
    if (authStatus) {
      authStatus.className = 'auth-status-pill offline';
      authStatus.innerHTML = `🟡 <strong>Standalone / Demo Mode</strong> &bull; Local server not detected. Run <code>run_server.cmd</code> on PC to connect SQLite database.`;
    }
  }

  await loadAllData();
}

/**
 * Loads data from SQL API if online, or local memory if standalone
 */
async function loadAllData() {
  if (isBackendOnline) {
    try {
      const [patientsRes, doctorsRes, apptsRes, bedsRes, invsRes, recsRes] = await Promise.all([
        fetch(`${API_BASE}/patients`).then(r => r.json()),
        fetch(`${API_BASE}/doctors`).then(r => r.json()),
        fetch(`${API_BASE}/appointments`).then(r => r.json()),
        fetch(`${API_BASE}/beds`).then(r => r.json()),
        fetch(`${API_BASE}/invoices`).then(r => r.json()),
        fetch(`${API_BASE}/medical-records`).then(r => r.json())
      ]);

      state.patients = patientsRes;
      state.doctors = doctorsRes;
      state.appointments = apptsRes;
      state.beds = bedsRes.beds || [];
      state.activeAdmissions = bedsRes.activeAdmissions || [];
      state.invoices = invsRes;
      state.records = recsRes;
      state.departments = SEED_DATA.departments;
    } catch (err) {
      console.warn('API error, falling back to local dataset', err);
      loadSeedData();
    }
  } else {
    loadSeedData();
  }

  renderAllViews();
}

function loadSeedData() {
  const saved = localStorage.getItem('medicore_hms_state');
  if (saved) {
    try {
      state = JSON.parse(saved);
      return;
    } catch (e) {}
  }
  state = JSON.parse(JSON.stringify(SEED_DATA));
  saveLocalState();
}

function saveLocalState() {
  if (!isBackendOnline) {
    localStorage.setItem('medicore_hms_state', JSON.stringify(state));
  }
}

// ============================================================================
// NAVIGATION & SPA SWITCHING
// ============================================================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-menu .nav-item');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      switchView(targetView);
    });
  });
}

function switchView(viewName) {
  state.currentView = viewName;

  // Update Nav links
  document.querySelectorAll('.nav-menu .nav-item').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-view') === viewName);
  });

  // Hide all views, show active
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const activePanel = document.getElementById(`view-${viewName}`);
  if (activePanel) activePanel.classList.add('active');

  // Update Topbar Titles
  const titles = {
    overview: { title: 'Hospital Overview & Dashboard', sub: 'Live operations, doctor scheduling, and admissions telemetry' },
    patients: { title: 'Patient Registry & Medical Demographics', sub: 'Auditable 3NF patient directory and clinical profiles' },
    doctors: { title: 'Medical Practitioners & Duty Rosters', sub: 'Specialist physicians, departments, and consultation rates' },
    appointments: { title: 'Outpatient Appointments Schedule', sub: 'Conflict-free appointment ledger and slot tracking' },
    beds: { title: 'Ward & Inpatient Bed Allocation', sub: 'Live room inventory, ICU telemetry, and admission lifecycle' },
    billing: { title: 'Financial Invoices & Payment Ledger', sub: 'Accounts receivable tracking consultations and inpatient room charges' },
    records: { title: 'Electronic Health Records (EHR)', sub: 'Clinical diagnoses, prescriptions, and physician observations' },
    'doctor-portal': { title: 'Doctor Clinical Workspace & Schedule', sub: 'Outpatient consultation roster and patient EMR' },
    'patient-portal': { title: 'My Patient Health Portal', sub: 'Consultation records, digital prescriptions, and invoice settlement' },
    'patient-scanner': { title: 'Optical Prescription Analyzer', sub: 'Extract handwritten and printed prescription medications' }
  };

  const info = titles[viewName] || titles.overview;
  document.getElementById('view-title').textContent = info.title;
  document.getElementById('view-subtitle').textContent = info.sub;

  // Populate view-specific content if needed
  if (viewName === 'doctors') renderDoctorsView();
  if (viewName === 'patients') renderPatientsView();
  if (viewName === 'appointments') renderAppointmentsView();
  if (viewName === 'beds') renderBedsView();
  if (viewName === 'billing') renderBillingView();
  if (viewName === 'records') renderRecordsView();
  if (viewName === 'doctor-portal') renderDoctorPortal();
  if (viewName === 'patient-portal') renderPatientPortal();
}

function setupGlobalShortcuts() {
  document.getElementById('btn-quick-register')?.addEventListener('click', () => openModal('modal-patient'));
  document.getElementById('btn-quick-book')?.addEventListener('click', () => openModal('modal-appointment'));
  document.getElementById('btn-quick-admit')?.addEventListener('click', () => openModal('modal-admission'));

  // Close modals on Escape key
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });

  // Min date constraints for appointment & admission
  const today = new Date().toISOString().split('T')[0];
  const apptDate = document.getElementById('modal-appt-date');
  if (apptDate) apptDate.setAttribute('min', today);
  const admitDate = document.getElementById('modal-admit-date');
  if (admitDate) admitDate.value = today;
  const dischargeDate = document.getElementById('discharge-date-input');
  if (dischargeDate) dischargeDate.value = today;
}

// ============================================================================
// RENDERING ENGINES
// ============================================================================
function renderAllViews() {
  renderOverviewKPIs();
  renderOverviewAppointmentsTable();
  renderOverviewOccupancy();
  renderPatientsView();
  renderDoctorsView();
  renderAppointmentsView();
  renderBedsView();
  renderBillingView();
  renderRecordsView();
  renderDoctorPortal();
  renderPatientPortal();
  populateDropdowns();
  renderAuthQuickPills();

  // Badges in sidebar
  document.getElementById('badge-patients-count').textContent = state.patients.length;
  document.getElementById('badge-appts-count').textContent = state.appointments.length;
  const occupiedCount = state.beds.filter(b => b.status === 'Occupied').length;
  document.getElementById('badge-occupied-count').textContent = occupiedCount;
}

// 1. Overview KPIs
function renderOverviewKPIs() {
  const totalPatients = state.patients.length;
  const totalDoctors = state.doctors.length;
  const availableBeds = state.beds.filter(b => b.status === 'Available').length;
  const pendingInvoices = state.invoices.filter(i => i.payment_status === 'Pending').length;

  document.getElementById('kpi-patients').textContent = totalPatients;
  document.getElementById('kpi-doctors').textContent = totalDoctors;
  document.getElementById('kpi-beds').textContent = availableBeds;
  document.getElementById('kpi-bed-sub').textContent = `${availableBeds} of ${state.beds.length} beds free`;
  document.getElementById('kpi-invoices').textContent = pendingInvoices;
}

// 2. Department Bed Occupancy Progress Bars
function renderOverviewOccupancy() {
  const container = document.getElementById('occupancy-progress-container');
  if (!container) return;

  const deptMap = {};
  state.departments.forEach(d => {
    deptMap[d.name] = { total: 0, occupied: 0 };
  });

  state.beds.forEach(b => {
    const dept = b.department_name || 'General';
    if (!deptMap[dept]) deptMap[dept] = { total: 0, occupied: 0 };
    deptMap[dept].total++;
    if (b.status === 'Occupied') deptMap[dept].occupied++;
  });

  const depts = Object.keys(deptMap);
  container.innerHTML = depts.map(dept => {
    const item = deptMap[dept];
    const total = item.total || 1;
    const occ = item.occupied;
    const pct = Math.round((occ / total) * 100);
    const colorClass = pct > 75 ? 'high' : pct > 40 ? 'med' : 'low';

    return `
      <div class="occupancy-item">
        <div class="occ-item-header">
          <span>${escapeHtml(dept)}</span>
          <span>${occ}/${total} Beds (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${colorClass}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. Overview Recent Appointments Table
function renderOverviewAppointmentsTable(list = null) {
  const tbody = document.getElementById('overview-appointments-tbody');
  if (!tbody) return;

  const appts = list || state.appointments.slice(0, 8);
  if (appts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No consultations on record.</td></tr>';
    return;
  }

  tbody.innerHTML = appts.map(a => {
    const statusClass = `badge-${(a.status || '').toLowerCase()}`;
    return `
      <tr>
        <td><strong>#APT-${a.appointment_id}</strong></td>
        <td><strong>${escapeHtml(a.patient_name || 'Patient #' + a.patient_id)}</strong></td>
        <td>${escapeHtml(a.doctor_name || 'N/A')}</td>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;">${escapeHtml(a.department_name || a.specialization || 'General')}</span></td>
        <td>${a.appointment_date} <br><small style="color:#64748b">${a.time_slot}</small></td>
        <td>${escapeHtml(a.reason || 'Checkup')}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(a.status)}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openDiagnosisModal(${a.appointment_id})">EMR</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 4. Patients Directory
function renderPatientsView(list = null) {
  const tbody = document.getElementById('patients-tbody');
  if (!tbody) return;

  const patients = list || state.patients;
  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-loading">No registered patients found.</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map(p => {
    const age = calculateAge(p.dob);
    return `
      <tr>
        <td><strong>#PAT-${p.patient_id}</strong></td>
        <td><strong>${escapeHtml(p.full_name)}</strong></td>
        <td>${p.dob} (${age} yrs)</td>
        <td>${escapeHtml(p.gender)}</td>
        <td><span class="badge" style="background:#fee2e2;color:#b91c1c;">${p.blood_group}</span></td>
        <td>${escapeHtml(p.contact)}</td>
        <td>${escapeHtml(p.emergency_contact)}</td>
        <td><small>${escapeHtml(p.address)}</small></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="quickBookForPatient(${p.patient_id})">Book Appt</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 5. Doctors Directory
function renderDoctorsView() {
  const grid = document.getElementById('doctors-grid-container');
  const deptSelect = document.getElementById('doctor-dept-filter');
  if (!grid) return;

  // Populate depts dropdown if needed
  if (deptSelect && deptSelect.options.length <= 1) {
    state.departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.name;
      opt.textContent = d.name;
      deptSelect.appendChild(opt);
    });
  }

  grid.innerHTML = state.doctors.map(d => {
    const initials = d.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);
    return `
      <div class="doctor-card">
        <div class="doc-top">
          <div class="doc-avatar">${initials}</div>
          <div class="doc-info">
            <h3>${escapeHtml(d.name)}</h3>
            <span class="doc-spec">${escapeHtml(d.specialization)}</span>
          </div>
        </div>
        <div class="doc-meta">
          <div>🏢 <strong>Department:</strong> ${escapeHtml(d.department_name || 'General')}</div>
          <div>📞 <strong>Phone:</strong> ${escapeHtml(d.phone)}</div>
          <div>✉️ <strong>Email:</strong> ${escapeHtml(d.email)}</div>
        </div>
        <div class="doc-fee-row">
          <span>Consultation Fee:</span>
          <span style="color:#0077b6;font-size:1.1rem;font-weight:700;">₹${Number(d.consultation_fee).toFixed(2)}</span>
        </div>
        <button class="btn btn-outline btn-sm" style="width:100%;margin-top:6px;" onclick="quickBookWithDoctor(${d.doctor_id})">
          Schedule Appointment
        </button>
      </div>
    `;
  }).join('');
}

// 6. Appointments Management View
function renderAppointmentsView(list = null) {
  const tbody = document.getElementById('appointments-tbody');
  if (!tbody) return;

  let appts = list || state.appointments;
  if (!list && currentUser) {
    if (currentUser.role === 'patient') {
      appts = appts.filter(a => a.patient_id === currentUser.patient_id);
    } else if (currentUser.role === 'doctor') {
      appts = appts.filter(a => a.doctor_id === currentUser.doctor_id);
    }
  }

  if (appts.length === 0) {
    const roleMsg = (currentUser && currentUser.role === 'patient') 
      ? 'You have no booked appointments. Click "+ Book Appointment" above to schedule one!'
      : (currentUser && currentUser.role === 'doctor')
      ? 'No appointments currently scheduled with you.'
      : 'No matching appointments found.';
    tbody.innerHTML = `<tr><td colspan="9" class="table-loading">${roleMsg}</td></tr>`;
    return;
  }

  tbody.innerHTML = appts.map(a => {
    const statusClass = `badge-${(a.status || '').toLowerCase()}`;
    const payStatus = a.payment_status || 'Pending';
    const payBadge = `badge-${payStatus.toLowerCase()}`;

    return `
      <tr>
        <td><strong>#APT-${a.appointment_id}</strong></td>
        <td>${escapeHtml(a.patient_name || 'Patient #' + a.patient_id)}</td>
        <td>${escapeHtml(a.doctor_name || 'N/A')}</td>
        <td>${escapeHtml(a.specialization || 'Specialist')}</td>
        <td>${a.appointment_date} <br><small style="color:#64748b">${a.time_slot}</small></td>
        <td>${escapeHtml(a.reason)}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(a.status)}</span></td>
        <td><span class="badge ${payBadge}">${escapeHtml(payStatus)}</span></td>
        <td>
          <div style="display:flex;gap:4px;">
            ${a.status === 'Scheduled' ? `
              <button class="btn-success-sm" title="Mark Completed" onclick="updateAppointmentStatus(${a.appointment_id}, 'Completed')">✓</button>
              <button class="btn-danger-sm" title="Cancel Appointment" onclick="updateAppointmentStatus(${a.appointment_id}, 'Cancelled')">✕</button>
            ` : ''}
            <button class="btn btn-outline btn-sm" onclick="openDiagnosisModal(${a.appointment_id})">EMR</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 7. Beds & Inpatient Management View
function renderBedsView() {
  const container = document.getElementById('beds-cards-container');
  const admissionsTbody = document.getElementById('active-admissions-tbody');
  if (!container) return;

  const totalBeds = state.beds.length;
  const availBeds = state.beds.filter(b => b.status === 'Available').length;
  const occBeds = totalBeds - availBeds;

  document.getElementById('beds-stat-total').textContent = totalBeds;
  document.getElementById('beds-stat-avail').textContent = availBeds;
  document.getElementById('beds-stat-occ').textContent = occBeds;

  // Render Visual Bed Tiles
  container.innerHTML = state.beds.map(b => {
    const isOcc = b.status === 'Occupied';
    const adm = state.activeAdmissions.find(a => a.bed_id === b.bed_id);
    const occupantName = adm ? adm.patient_name : 'No patient assigned';

    return `
      <div class="bed-tile ${isOcc ? 'occupied' : 'available'}">
        <div class="bed-header">
          <span class="bed-code">${escapeHtml(b.room_number)} / ${escapeHtml(b.bed_number)}</span>
          <span class="badge ${isOcc ? 'badge-occupied' : 'badge-available'}">${b.status}</span>
        </div>
        <div class="bed-body">
          <div>Ward: <strong>${escapeHtml(b.bed_type)}</strong></div>
          <div>Dept: <strong>${escapeHtml(b.department_name || 'General')}</strong></div>
          <div>Daily Rate: <strong>₹${Number(b.daily_rate).toFixed(2)}</strong></div>
          <div style="margin-top:6px;font-size:0.75rem;color:#64748b;">
            ${isOcc ? `Admitted: <strong>${escapeHtml(occupantName)}</strong>` : 'Ready for admission'}
          </div>
        </div>
        <div class="bed-action">
          ${isOcc && adm ? `
            <button class="btn btn-secondary btn-sm" onclick="openDischargeModal(${adm.admission_id})">Discharge Patient</button>
          ` : !isOcc ? `
            <button class="btn btn-primary btn-sm" onclick="quickAdmitToBed(${b.bed_id})">Admit Patient</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Render Active Admissions Table
  if (state.activeAdmissions.length === 0) {
    admissionsTbody.innerHTML = '<tr><td colspan="8" class="table-loading">No active inpatient admissions currently.</td></tr>';
  } else {
    admissionsTbody.innerHTML = state.activeAdmissions.map(adm => {
      return `
        <tr>
          <td><strong>#ADM-${adm.admission_id}</strong></td>
          <td><strong>${escapeHtml(adm.patient_name)}</strong></td>
          <td>${escapeHtml(adm.contact)}</td>
          <td>${escapeHtml(adm.room_number)} (${escapeHtml(adm.bed_number)})</td>
          <td>${escapeHtml(adm.bed_type)}</td>
          <td>₹${Number(adm.daily_rate).toFixed(2)} / day</td>
          <td>${adm.admission_date}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="openDischargeModal(${adm.admission_id})">
              Discharge & Settle
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// 8. Billing & Invoices View
function renderBillingView(list = null) {
  const tbody = document.getElementById('invoices-tbody');
  if (!tbody) return;

  let invoices = list || state.invoices;
  if (!list && currentUser && currentUser.role === 'patient') {
    invoices = invoices.filter(i => i.patient_id === currentUser.patient_id);
  }

  let totalBilled = 0;
  let totalCollected = 0;
  let totalPending = 0;

  invoices.forEach(inv => {
    const amt = Number(inv.total_amount) || 0;
    totalBilled += amt;
    if (inv.payment_status === 'Paid') totalCollected += amt;
    else totalPending += amt;
  });

  document.getElementById('billing-total-billed').textContent = `₹${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('billing-total-collected').textContent = `₹${totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('billing-total-pending').textContent = `₹${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (invoices.length === 0) {
    const msg = (currentUser && currentUser.role === 'patient')
      ? 'No invoices or billing records found for your patient account.'
      : 'No financial invoices found.';
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map(inv => {
    const isPaid = inv.payment_status === 'Paid';
    return `
      <tr>
        <td><strong>#INV-${inv.invoice_id}</strong></td>
        <td><strong>${escapeHtml(inv.patient_name || 'Patient #' + inv.patient_id)}</strong></td>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;">${escapeHtml(inv.bill_type || 'Consultation')}</span></td>
        <td>${inv.invoice_date}</td>
        <td><strong style="color:#0f172a;font-size:0.95rem;">₹${Number(inv.total_amount).toFixed(2)}</strong></td>
        <td>${escapeHtml(inv.payment_method)}</td>
        <td><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${escapeHtml(inv.payment_status)}</span></td>
        <td>
          ${!isPaid ? `
            <button class="btn btn-primary btn-sm" onclick="openPaymentModal(${inv.invoice_id})">Pay Now</button>
          ` : '<span style="color:#16a34a;font-size:0.8rem;font-weight:600;">✓ Settled</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

// 9. Electronic Medical Records View
function renderRecordsView() {
  const tbody = document.getElementById('records-tbody');
  if (!tbody) return;

  let records = state.records;
  if (currentUser && currentUser.role === 'patient') {
    records = records.filter(r => r.patient_id === currentUser.patient_id);
  } else if (currentUser && currentUser.role === 'doctor') {
    records = records.filter(r => r.doctor_name && r.doctor_name.toLowerCase().includes(currentUser.name.toLowerCase().replace('dr. ', '')));
  }

  if (records.length === 0) {
    const msg = (currentUser && currentUser.role === 'patient')
      ? 'No electronic medical records or prescriptions on file for you yet.'
      : 'No electronic medical records created yet.';
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    return `
      <tr>
        <td><strong>#EMR-${r.record_id}</strong></td>
        <td><strong>${escapeHtml(r.patient_name || 'Patient')}</strong></td>
        <td>${escapeHtml(r.doctor_name || 'Physician')}</td>
        <td>${escapeHtml(r.specialization || 'Clinical')}</td>
        <td>${r.appointment_date || 'N/A'}</td>
        <td><strong style="color:#0e7490">${escapeHtml(r.diagnosis)}</strong></td>
        <td>${escapeHtml(r.treatment)}</td>
        <td><small>${escapeHtml(r.notes || 'None')}</small></td>
      </tr>
    `;
  }).join('');
}

// Populate Modal Dropdowns
function populateDropdowns() {
  // 1. Patient dropdowns
  const patientSelects = [
    document.getElementById('modal-select-patient'),
    document.getElementById('modal-admit-select-patient')
  ];

  patientSelects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Choose Patient --</option>';
    state.patients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.patient_id;
      opt.textContent = `${p.full_name} (ID: #${p.patient_id} - ${p.blood_group})`;
      sel.appendChild(opt);
    });
  });

  // 2. Doctor dropdowns
  const docSelect = document.getElementById('modal-select-doctor');
  if (docSelect) {
    docSelect.innerHTML = '<option value="">-- Choose Doctor --</option>';
    state.doctors.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.doctor_id;
      opt.textContent = `${d.name} (${d.specialization} - ₹${d.consultation_fee})`;
      docSelect.appendChild(opt);
    });
  }

  // 3. Available Bed dropdowns
  const bedSelect = document.getElementById('modal-admit-select-bed');
  if (bedSelect) {
    bedSelect.innerHTML = '<option value="">-- Choose Available Bed --</option>';
    state.beds.filter(b => b.status === 'Available').forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.bed_id;
      opt.textContent = `Room ${b.room_number} / Bed ${b.bed_number} (${b.bed_type} - ₹${b.daily_rate}/day)`;
      bedSelect.appendChild(opt);
    });
  }

  // 4. Department dropdown for Add Doctor modal
  const docDeptSelect = document.getElementById('modal-doc-dept-select');
  if (docDeptSelect) {
    docDeptSelect.innerHTML = '<option value="">-- Select Department --</option>';
    state.departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.department_id;
      opt.textContent = `${d.name} (${d.location})`;
      docDeptSelect.appendChild(opt);
    });
  }

  // 5. Populate Role Switcher modal selects
  const loginDocSelect = document.getElementById('login-select-doctor');
  if (loginDocSelect) {
    loginDocSelect.innerHTML = state.doctors.map(d => 
      `<option value="${d.doctor_id}">${escapeHtml(d.name)} (${escapeHtml(d.specialization)} - ${escapeHtml(d.department_name || 'General')})</option>`
    ).join('');
  }

  const loginPatSelect = document.getElementById('login-select-patient');
  if (loginPatSelect) {
    loginPatSelect.innerHTML = state.patients.map(p => 
      `<option value="${p.patient_id}">#PAT-${p.patient_id}: ${escapeHtml(p.full_name || p.name)} (${p.blood_group}) - ${escapeHtml(p.contact)}</option>`
    ).join('');
  }
}

// ============================================================================
// MODAL CONTROLLERS & ACTION HANDLERS
// ============================================================================
function openModal(id) {
  populateDropdowns();
  if (id === 'modal-appointment' && currentUser && currentUser.role === 'patient') {
    const sel = document.getElementById('modal-select-patient');
    if (sel) {
      sel.value = currentUser.patient_id;
      sel.disabled = true;
    }
  } else if (id === 'modal-appointment') {
    const sel = document.getElementById('modal-select-patient');
    if (sel) sel.disabled = false;
  }
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// 0. Submit Doctor Registration
async function handleDoctorRegistrationSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const deptId = parseInt(data.department_id, 10);
  const fee = parseFloat(data.consultation_fee) || 500.00;
  const dept = state.departments.find(d => d.department_id === deptId);

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          specialization: data.specialization.trim(),
          department_id: deptId,
          phone: data.phone.trim(),
          email: data.email.trim(),
          consultation_fee: fee
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(`Doctor added to SQLite database! Assigned ID: #DOC-${result.doctor_id}`, 'success');
    } catch (err) {
      showToast(`Failed to add doctor: ${err.message}`, 'error');
      return;
    }
  } else {
    const newDocId = (state.doctors.length > 0 ? Math.max(...state.doctors.map(d => d.doctor_id)) : 0) + 1;
    state.doctors.push({
      doctor_id: newDocId,
      name: data.name.trim(),
      specialization: data.specialization.trim(),
      department_id: deptId,
      department_name: dept ? dept.name : 'General Medicine',
      phone: data.phone.trim(),
      email: data.email.trim(),
      consultation_fee: fee
    });
    saveLocalState();
    showToast(`Doctor saved to browser storage! ID: #DOC-${newDocId} (Start local server to write to SQLite)`, 'info');
  }

  form.reset();
  closeModal('modal-doctor');
  await loadAllData();
  switchView('doctors');
}

// 1. Submit Patient Registration
async function handlePatientRegistrationSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(`Patient registered in SQLite database! Assigned ID: #${result.patient_id}`, 'success');
    } catch (err) {
      showToast(`Registration failed: ${err.message}`, 'error');
      return;
    }
  } else {
    // Local Engine
    const newId = (state.patients.length > 0 ? Math.max(...state.patients.map(p => p.patient_id)) : 0) + 1;
    state.patients.unshift({
      patient_id: newId,
      full_name: data.full_name,
      dob: data.dob,
      gender: data.gender,
      blood_group: data.blood_group,
      contact: data.contact,
      emergency_contact: data.emergency_contact,
      address: data.address
    });
    saveLocalState();
    showToast(`Patient saved to browser storage! ID: #${newId} (Start local server to write to SQLite)`, 'info');
  }

  form.reset();
  closeModal('modal-patient');
  await loadAllData();
}

// 2. Submit Appointment Booking
async function handleAppointmentBookingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const raw = Object.fromEntries(new FormData(form).entries());
  const patientId = (currentUser && currentUser.role === 'patient')
    ? currentUser.patient_id
    : parseInt(raw.patient_id || document.getElementById('modal-select-patient')?.value, 10);
  const doctorId = parseInt(raw.doctor_id, 10);

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: raw.appointment_date,
          time_slot: raw.time_slot,
          reason: raw.reason
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(`Appointment confirmed in SQLite database! Ref: #APT-${result.appointment_id}`, 'success');
    } catch (err) {
      showToast(`Booking error: ${err.message}`, 'error');
      return;
    }
  } else {
    // Conflict Check in Local Engine
    const conflict = state.appointments.some(a => 
      a.doctor_id === doctorId && 
      a.appointment_date === raw.appointment_date && 
      a.time_slot === raw.time_slot && 
      a.status !== 'Cancelled'
    );

    if (conflict) {
      showToast('Doctor already has a booking for this date and time slot!', 'warning');
      return;
    }

    const patient = state.patients.find(p => p.patient_id === patientId);
    const doctor = state.doctors.find(d => d.doctor_id === doctorId);
    const newApptId = (state.appointments.length > 0 ? Math.max(...state.appointments.map(a => a.appointment_id)) : 0) + 1;

    state.appointments.unshift({
      appointment_id: newApptId,
      patient_id: patientId,
      patient_name: patient ? patient.full_name : 'Patient',
      doctor_id: doctorId,
      doctor_name: doctor ? doctor.name : 'Doctor',
      specialization: doctor ? doctor.specialization : 'General',
      department_name: doctor ? doctor.department_name : 'General',
      appointment_date: raw.appointment_date,
      time_slot: raw.time_slot,
      status: 'Scheduled',
      reason: raw.reason,
      payment_status: 'Pending'
    });

    // Auto-create pending invoice
    const newInvId = (state.invoices.length > 0 ? Math.max(...state.invoices.map(i => i.invoice_id)) : 0) + 1;
    state.invoices.unshift({
      invoice_id: newInvId,
      patient_id: patientId,
      patient_name: patient ? patient.full_name : 'Patient',
      bill_type: 'Doctor Consultation',
      total_amount: doctor ? doctor.consultation_fee : 500.00,
      payment_status: 'Pending',
      payment_method: 'Cash',
      invoice_date: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    saveLocalState();
    showToast(`Appointment scheduled! Ref: #APT-${newApptId}`, 'success');
  }

  form.reset();
  closeModal('modal-appointment');
  await loadAllData();
}

// 3. Submit Inpatient Admission
async function handleAdmissionSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const raw = Object.fromEntries(new FormData(form).entries());
  const patientId = parseInt(raw.patient_id, 10);
  const bedId = parseInt(raw.bed_id, 10);

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/admissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          bed_id: bedId,
          admission_date: raw.admission_date,
          notes: raw.notes
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast('Patient admitted and recorded in SQLite database! Bed marked occupied.', 'success');
    } catch (err) {
      showToast(`Admission error: ${err.message}`, 'error');
      return;
    }
  } else {
    const patient = state.patients.find(p => p.patient_id === patientId);
    const bed = state.beds.find(b => b.bed_id === bedId);

    if (!bed || bed.status !== 'Available') {
      showToast('Selected bed is no longer available', 'warning');
      return;
    }

    bed.status = 'Occupied';
    const newAdmId = (state.activeAdmissions.length > 0 ? Math.max(...state.activeAdmissions.map(a => a.admission_id)) : 0) + 1;
    state.activeAdmissions.unshift({
      admission_id: newAdmId,
      patient_id: patientId,
      patient_name: patient ? patient.full_name : 'Patient',
      contact: patient ? patient.contact : 'N/A',
      bed_id: bedId,
      room_number: bed.room_number,
      bed_number: bed.bed_number,
      bed_type: bed.bed_type,
      daily_rate: bed.daily_rate,
      admission_date: raw.admission_date,
      department_name: bed.department_name
    });

    saveLocalState();
    showToast('Inpatient admitted in browser demo mode. (Start local server to write to SQLite)', 'info');
  }

  form.reset();
  closeModal('modal-admission');
  await loadAllData();
}

// 4. Open Discharge Modal & Calculate Bill
function openDischargeModal(admissionId) {
  const adm = state.activeAdmissions.find(a => a.admission_id === admissionId);
  if (!adm) return;

  document.getElementById('discharge-admission-id').value = adm.admission_id;
  document.getElementById('discharge-patient-name').textContent = adm.patient_name;
  document.getElementById('discharge-room-bed').textContent = `${adm.room_number} (${adm.bed_number})`;
  document.getElementById('discharge-admission-date').textContent = adm.admission_date;
  document.getElementById('discharge-daily-rate').textContent = Number(adm.daily_rate).toFixed(2);

  calculateDischargeTotal();
  openModal('modal-discharge');
}

function calculateDischargeTotal() {
  const admId = parseInt(document.getElementById('discharge-admission-id').value, 10);
  const adm = state.activeAdmissions.find(a => a.admission_id === admId);
  if (!adm) return;

  const d1 = new Date(adm.admission_date);
  const d2 = new Date(document.getElementById('discharge-date-input').value || new Date());
  let days = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
  const total = days * adm.daily_rate;

  document.getElementById('discharge-est-days').textContent = `${days} day(s)`;
  document.getElementById('discharge-est-cost').textContent = `₹${total.toFixed(2)}`;
}

// 5. Submit Discharge
async function handleDischargeSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const raw = Object.fromEntries(new FormData(form).entries());
  const admissionId = parseInt(raw.admission_id, 10);

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/discharges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admission_id: admissionId,
          discharge_date: raw.discharge_date,
          payment_method: raw.payment_method
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(result.message, 'success');
    } catch (err) {
      showToast(`Discharge failed: ${err.message}`, 'error');
      return;
    }
  } else {
    const admIndex = state.activeAdmissions.findIndex(a => a.admission_id === admissionId);
    if (admIndex === -1) return;
    const adm = state.activeAdmissions[admIndex];

    const d1 = new Date(adm.admission_date);
    const d2 = new Date(raw.discharge_date);
    let days = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
    const totalBilled = days * adm.daily_rate;

    // Free Bed
    const bed = state.beds.find(b => b.bed_id === adm.bed_id);
    if (bed) bed.status = 'Available';

    // Remove active admission
    state.activeAdmissions.splice(admIndex, 1);

    // Generate Invoice
    const newInvId = (state.invoices.length > 0 ? Math.max(...state.invoices.map(i => i.invoice_id)) : 0) + 1;
    state.invoices.unshift({
      invoice_id: newInvId,
      patient_id: adm.patient_id,
      patient_name: adm.patient_name,
      bill_type: 'Inpatient Stay',
      total_amount: totalBilled,
      payment_status: 'Paid',
      payment_method: raw.payment_method,
      invoice_date: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    saveLocalState();
    showToast(`Patient discharged after ${days} day(s). Bed freed!`, 'success');
  }

  closeModal('modal-discharge');
  await loadAllData();
}

// 6. Open & Submit Diagnosis / Prescription
function openDiagnosisModal(appointmentId) {
  const appt = state.appointments.find(a => a.appointment_id === appointmentId);
  if (!appt) return;

  document.getElementById('diag-appointment-id').value = appt.appointment_id;
  document.getElementById('diag-appt-num').textContent = appt.appointment_id;
  document.getElementById('diag-patient-name').textContent = appt.patient_name;
  document.getElementById('diag-doctor-name').textContent = appt.doctor_name;

  openModal('modal-diagnosis');
}

async function handleDiagnosisSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const raw = Object.fromEntries(new FormData(form).entries());
  const apptId = parseInt(raw.appointment_id, 10);
  const appt = state.appointments.find(a => a.appointment_id === apptId);

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/medical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: apptId,
          diagnosis: raw.diagnosis,
          treatment: raw.treatment,
          notes: raw.notes
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast('Prescription & diagnosis saved to SQLite database!', 'success');
    } catch (err) {
      showToast(`EMR save error: ${err.message}`, 'error');
      return;
    }
  } else {
    const newRecId = (state.records.length > 0 ? Math.max(...state.records.map(r => r.record_id)) : 0) + 1;
    state.records.unshift({
      record_id: newRecId,
      patient_id: appt ? appt.patient_id : 1,
      patient_name: appt ? appt.patient_name : 'Patient',
      doctor_name: appt ? appt.doctor_name : 'Doctor',
      specialization: appt ? appt.specialization : 'General',
      appointment_id: apptId,
      appointment_date: appt ? appt.appointment_date : '2026-10-06',
      diagnosis: raw.diagnosis,
      treatment: raw.treatment,
      notes: raw.notes
    });

    saveLocalState();
    showToast('Clinical Diagnosis & Prescription saved to browser EMR! (Start local server to write to SQLite)', 'info');
  }

  form.reset();
  closeModal('modal-diagnosis');
  await loadAllData();
  switchView('records');
}

// 7. Pay Invoice
function openPaymentModal(invoiceId) {
  const inv = state.invoices.find(i => i.invoice_id === invoiceId);
  if (!inv) return;

  document.getElementById('pay-invoice-id').value = inv.invoice_id;
  document.getElementById('pay-inv-num').textContent = inv.invoice_id;
  document.getElementById('pay-patient-name').textContent = inv.patient_name;
  document.getElementById('pay-amount').textContent = Number(inv.total_amount).toFixed(2);

  openModal('modal-pay-invoice');
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  const invId = parseInt(document.getElementById('pay-invoice-id').value, 10);
  const method = document.getElementById('pay-method-select').value;

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(result.message, 'success');
    } catch (err) {
      showToast(`Payment error: ${err.message}`, 'error');
      return;
    }
  } else {
    const inv = state.invoices.find(i => i.invoice_id === invId);
    if (inv) {
      inv.payment_status = 'Paid';
      inv.payment_method = method;
      saveLocalState();
      showToast(`Invoice #${invId} paid successfully via ${method}!`, 'success');
    }
  }

  closeModal('modal-pay-invoice');
  await loadAllData();
}

// 8. Update Appointment Status
async function updateAppointmentStatus(apptId, status) {
  if (isBackendOnline) {
    try {
      await fetch(`${API_BASE}/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {}
  }

  const appt = state.appointments.find(a => a.appointment_id === apptId);
  if (appt) {
    appt.status = status;
    saveLocalState();
    showToast(`Appointment status updated to ${status}.`, 'info');
    renderAppointmentsView();
    renderOverviewAppointmentsTable();
  }
}

// Quick booking shortcuts from cards/tables
function quickBookForPatient(patientId) {
  openModal('modal-appointment');
  const sel = document.getElementById('modal-select-patient');
  if (sel) sel.value = patientId;
}

function quickBookWithDoctor(doctorId) {
  openModal('modal-appointment');
  const sel = document.getElementById('modal-select-doctor');
  if (sel) sel.value = doctorId;
}

function quickAdmitToBed(bedId) {
  openModal('modal-admission');
  const sel = document.getElementById('modal-admit-select-bed');
  if (sel) sel.value = bedId;
}

// ============================================================================
// SEARCH & FILTERS
// ============================================================================
function filterOverviewTable(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderOverviewAppointmentsTable(); return; }
  const filtered = state.appointments.filter(a => 
    (a.patient_name && a.patient_name.toLowerCase().includes(q)) ||
    (a.doctor_name && a.doctor_name.toLowerCase().includes(q)) ||
    (a.reason && a.reason.toLowerCase().includes(q))
  );
  renderOverviewAppointmentsTable(filtered);
}

function filterPatientsTable(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderPatientsView(); return; }
  const filtered = state.patients.filter(p => 
    p.full_name.toLowerCase().includes(q) ||
    p.contact.includes(q) ||
    p.blood_group.toLowerCase().includes(q)
  );
  renderPatientsView(filtered);
}

function filterDoctorsByDept(deptName) {
  const grid = document.getElementById('doctors-grid-container');
  const list = deptName === 'ALL' ? state.doctors : state.doctors.filter(d => d.department_name === deptName);
  grid.innerHTML = list.map(d => {
    const initials = d.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);
    return `
      <div class="doctor-card">
        <div class="doc-top">
          <div class="doc-avatar">${initials}</div>
          <div class="doc-info">
            <h3>${escapeHtml(d.name)}</h3>
            <span class="doc-spec">${escapeHtml(d.specialization)}</span>
          </div>
        </div>
        <div class="doc-meta">
          <div>🏢 <strong>Department:</strong> ${escapeHtml(d.department_name || 'General')}</div>
          <div>📞 <strong>Phone:</strong> ${escapeHtml(d.phone)}</div>
          <div>✉️ <strong>Email:</strong> ${escapeHtml(d.email)}</div>
        </div>
        <div class="doc-fee-row">
          <span>Consultation Fee:</span>
          <span style="color:#0077b6;font-size:1.1rem;font-weight:700;">₹${Number(d.consultation_fee).toFixed(2)}</span>
        </div>
        <button class="btn btn-outline btn-sm" style="width:100%;margin-top:6px;" onclick="quickBookWithDoctor(${d.doctor_id})">
          Schedule Appointment
        </button>
      </div>
    `;
  }).join('');
}

function filterAppointmentsStatus(status, btn) {
  document.querySelectorAll('#view-appointments .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const list = status === 'ALL' ? state.appointments : state.appointments.filter(a => a.status === status);
  renderAppointmentsView(list);
}

function filterInvoicesStatus(status, btn) {
  document.querySelectorAll('#view-billing .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const list = status === 'ALL' ? state.invoices : state.invoices.filter(i => i.payment_status === status);
  renderBillingView(list);
}

function filterMedicalRecords(query) {
  const q = query.toLowerCase().trim();
  const list = !q ? state.records : state.records.filter(r => 
    r.diagnosis.toLowerCase().includes(q) ||
    r.treatment.toLowerCase().includes(q) ||
    (r.patient_name && r.patient_name.toLowerCase().includes(q))
  );
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = list.map(r => `
    <tr>
      <td><strong>#EMR-${r.record_id}</strong></td>
      <td><strong>${escapeHtml(r.patient_name || 'Patient')}</strong></td>
      <td>${escapeHtml(r.doctor_name || 'Physician')}</td>
      <td>${escapeHtml(r.specialization || 'Clinical')}</td>
      <td>${r.appointment_date || 'N/A'}</td>
      <td><strong style="color:#0e7490">${escapeHtml(r.diagnosis)}</strong></td>
      <td>${escapeHtml(r.treatment)}</td>
      <td><small>${escapeHtml(r.notes || 'None')}</small></td>
    </tr>
  `).join('');
}

// Helpers
function calculateAge(dobStr) {
  const dob = new Date(dobStr);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970) || 0;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[match]));
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================================
// AUTHENTICATION & MULTI-ROLE PORTAL CONTROLLERS
// ============================================================================

/**
 * Initializes authentication state from localStorage or displays login gateway
 */
function initAuthenticationState() {
  renderAuthQuickPills();
  const savedUser = localStorage.getItem('medicore_current_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      applyUserRoleUI(currentUser.role);
      return;
    } catch (e) {
      currentUser = null;
    }
  }

  // Not logged in: show auth gateway, hide dashboard layout
  const authView = document.getElementById('auth-view');
  const appLayout = document.getElementById('app-layout');
  if (authView) authView.style.display = 'flex';
  if (appLayout) appLayout.style.display = 'none';
}

/**
 * Switches tabs on the login gateway: Doctor, Patient, or Admin
 */
function switchAuthTab(role) {
  document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-auth-${role}`);
  if (activeBtn) activeBtn.classList.add('active');

  const panels = ['doctor', 'patient', 'patient-register', 'admin'];
  panels.forEach(p => {
    const el = document.getElementById(`auth-panel-${p}`);
    if (el) el.style.display = (p === role) ? 'block' : 'none';
  });
}

/**
 * Toggles between Patient Login form and New Patient Registration form
 */
function togglePatientRegisterForm(showRegister) {
  const loginPanel = document.getElementById('auth-panel-patient');
  const regPanel = document.getElementById('auth-panel-patient-register');
  if (loginPanel) loginPanel.style.display = showRegister ? 'none' : 'block';
  if (regPanel) regPanel.style.display = showRegister ? 'block' : 'none';
}

/**
 * Populates 1-click test chips on the login gateway for rapid testing
 */
function renderAuthQuickPills() {
  const docContainer = document.getElementById('quick-doctor-pills');
  if (docContainer && state.doctors.length > 0) {
    docContainer.innerHTML = state.doctors.slice(0, 4).map(d => `
      <button type="button" class="demo-chip" onclick="quickLoginDoctor(${d.doctor_id})">
        🩺 ${escapeHtml(d.name.replace('Dr. ', ''))} (${escapeHtml((d.specialization || '').split(' ')[0])})
      </button>
    `).join('');
  }

  const patContainer = document.getElementById('quick-patient-pills');
  if (patContainer && state.patients.length > 0) {
    patContainer.innerHTML = state.patients.slice(0, 4).map(p => `
      <button type="button" class="demo-chip" onclick="quickLoginPatient(${p.patient_id})">
        👤 ${escapeHtml((p.full_name || p.name || 'Patient').split(' ')[0])} (${p.blood_group})
      </button>
    `).join('');
  }
}

/**
 * Doctor Login Form Submission Handler
 */
async function handleDoctorLoginSubmit(e) {
  e.preventDefault();
  const identifier = document.getElementById('doc-login-identifier').value.trim();
  const password = document.getElementById('doc-login-password').value.trim();

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'doctor', identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loginSuccess(data.user, `Welcome back, ${data.user.name}! Doctor workspace loaded.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  } else {
    // Offline / Standalone Authentication
    const doc = state.doctors.find(d => 
      (d.email && d.email.toLowerCase() === identifier.toLowerCase()) ||
      d.phone === identifier ||
      String(d.doctor_id) === identifier
    );
    if (!doc) {
      showToast('Doctor profile not found with provided email, phone, or ID.', 'error');
      return;
    }
    if (password !== (doc.password || 'doctor123')) {
      showToast('Incorrect password. (Default is doctor123)', 'error');
      return;
    }
    const user = { ...doc, role: 'doctor' };
    loginSuccess(user, `Welcome back, ${doc.name}!`);
  }
}

/**
 * Patient Login Form Submission Handler
 */
async function handlePatientLoginSubmit(e) {
  e.preventDefault();
  const identifier = document.getElementById('pat-login-identifier').value.trim();
  const password = document.getElementById('pat-login-password').value.trim();

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'patient', identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loginSuccess(data.user, `Welcome back, ${data.user.name}! Your health portal is ready.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  } else {
    // Offline / Standalone Authentication
    const pat = state.patients.find(p => 
      p.contact === identifier || 
      String(p.patient_id) === identifier
    );
    if (!pat) {
      showToast('Patient record not found with provided phone contact or ID.', 'error');
      return;
    }
    if (password !== (pat.password || 'patient123')) {
      showToast('Incorrect patient password. (Default is patient123)', 'error');
      return;
    }
    const user = {
      role: 'patient',
      patient_id: pat.patient_id,
      name: pat.full_name || pat.name,
      ...pat
    };
    loginSuccess(user, `Welcome back, ${user.name}!`);
  }
}

/**
 * Patient Account Registration Form Submission Handler
 */
async function handlePatientSignupSubmit(e) {
  e.preventDefault();
  const payload = {
    full_name: document.getElementById('reg-pat-name').value.trim(),
    dob: document.getElementById('reg-pat-dob').value,
    gender: document.getElementById('reg-pat-gender').value,
    blood_group: document.getElementById('reg-pat-blood').value,
    contact: document.getElementById('reg-pat-contact').value.trim(),
    emergency_contact: document.getElementById('reg-pat-emergency').value.trim(),
    address: document.getElementById('reg-pat-address').value.trim(),
    password: document.getElementById('reg-pat-password').value.trim() || 'patient123'
  };

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/auth/register-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await loadAllData();
      loginSuccess(data.user, `Account registered! Welcome to MediCore, ${data.user.name}.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  } else {
    const newId = (state.patients.length > 0 ? Math.max(...state.patients.map(p => p.patient_id)) : 0) + 1;
    const newPat = {
      patient_id: newId,
      ...payload
    };
    state.patients.unshift(newPat);
    saveLocalState();
    const user = {
      role: 'patient',
      patient_id: newId,
      name: payload.full_name,
      ...payload
    };
    loginSuccess(user, `Account created! Welcome, ${payload.full_name}.`);
  }
}

/**
 * Administrator Login Handler
 */
function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const identifier = document.getElementById('admin-login-identifier').value.trim();
  const password = document.getElementById('admin-login-password').value.trim();

  if ((identifier.toLowerCase() === 'admin' || identifier.toLowerCase() === 'admin@hospital.org') && password === 'admin123') {
    const user = {
      role: 'admin',
      name: 'Hospital Administrator',
      username: 'admin',
      email: 'admin@hospital.org'
    };
    loginSuccess(user, 'Signed in with Senior Administrator privileges.');
  } else {
    showToast('Invalid admin credentials. Use admin / admin123', 'error');
  }
}

/**
 * 1-Click Fast Login as Doctor
 */
function quickLoginDoctor(docId) {
  const doc = state.doctors.find(d => d.doctor_id === docId);
  if (!doc) return;
  const user = {
    role: 'doctor',
    doctor_id: doc.doctor_id,
    name: doc.name,
    specialization: doc.specialization,
    phone: doc.phone,
    email: doc.email,
    consultation_fee: doc.consultation_fee,
    department_id: doc.department_id,
    department_name: doc.department_name
  };
  loginSuccess(user, `Signed in as ${doc.name} (${doc.specialization})`);
}

/**
 * 1-Click Fast Login as Patient
 */
function quickLoginPatient(patId) {
  const pat = state.patients.find(p => p.patient_id === patId);
  if (!pat) return;
  const user = {
    role: 'patient',
    patient_id: pat.patient_id,
    name: pat.full_name || pat.name,
    contact: pat.contact,
    dob: pat.dob,
    gender: pat.gender,
    blood_group: pat.blood_group,
    emergency_contact: pat.emergency_contact,
    address: pat.address
  };
  loginSuccess(user, `Signed in as ${user.name} (Patient ID: #${pat.patient_id})`);
}

/**
 * Persists session and sets up role-separated layout
 */
function loginSuccess(user, welcomeMsg) {
  currentUser = user;
  localStorage.setItem('medicore_current_user', JSON.stringify(currentUser));
  applyUserRoleUI(user.role);
  showToast(welcomeMsg || 'Signed in successfully!', 'success');
}

/**
 * Logs out and resets view to Login Gateway
 */
function logoutUser() {
  currentUser = null;
  localStorage.removeItem('medicore_current_user');

  const authView = document.getElementById('auth-view');
  const appLayout = document.getElementById('app-layout');
  if (authView) authView.style.display = 'flex';
  if (appLayout) appLayout.style.display = 'none';

  renderAuthQuickPills();
  showToast('You have signed out successfully.', 'info');
}

/**
 * Dynamically updates sidebar navigation, badges, and top actions according to role
 */
function applyUserRoleUI(role) {
  const appLayout = document.getElementById('app-layout');
  const authView = document.getElementById('auth-view');
  if (appLayout) appLayout.style.display = 'flex';
  if (authView) authView.style.display = 'none';

  const navAdmins = document.querySelectorAll('.nav-admin');
  const navDoctors = document.querySelectorAll('.nav-doctor');
  const navPatients = document.querySelectorAll('.nav-patient');

  const btnNewPat = document.getElementById('btn-quick-register');
  const btnNewDoc = document.getElementById('btn-quick-doctor');
  const btnAdmit = document.getElementById('btn-quick-admit');
  const btnBook = document.getElementById('btn-quick-book');
  const portalBadge = document.getElementById('current-portal-badge');

  document.querySelectorAll('.portal-btn').forEach(b => b.classList.remove('active'));

  if (role === 'doctor') {
    navAdmins.forEach(el => el.style.display = 'none');
    navPatients.forEach(el => el.style.display = 'none');
    navDoctors.forEach(el => el.style.display = 'flex');

    if (btnNewPat) btnNewPat.style.display = 'none';
    if (btnNewDoc) btnNewDoc.style.display = 'none';
    if (btnAdmit) btnAdmit.style.display = 'inline-block';
    if (btnBook) btnBook.style.display = 'inline-block';

    const docName = currentUser.name || 'Doctor';
    const docSpec = currentUser.specialization || 'Clinical Specialist';
    const initials = docName.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);

    document.getElementById('sidebar-user-avatar').textContent = initials;
    document.getElementById('sidebar-user-name').textContent = docName;
    document.getElementById('sidebar-user-role').textContent = docSpec;

    if (portalBadge) {
      portalBadge.className = 'portal-badge topbar-user-badge doctor';
      portalBadge.innerHTML = `<span class="role-dot"></span> 🩺 Doctor Portal &bull; ${docName}`;
    }

    const btnPortalDoc = document.getElementById('btn-portal-doctor');
    if (btnPortalDoc) btnPortalDoc.classList.add('active');

    switchView('doctor-portal');
    renderDoctorPortal();
  } else if (role === 'patient') {
    navAdmins.forEach(el => el.style.display = 'none');
    navDoctors.forEach(el => el.style.display = 'none');
    navPatients.forEach(el => el.style.display = 'flex');

    if (btnNewPat) btnNewPat.style.display = 'none';
    if (btnNewDoc) btnNewDoc.style.display = 'none';
    if (btnAdmit) btnAdmit.style.display = 'none';
    if (btnBook) btnBook.style.display = 'inline-block';

    const patName = currentUser.name || currentUser.full_name || 'Patient';
    const blood = currentUser.blood_group || 'O+';
    const initials = patName.split(' ').map(n => n[0]).join('').substring(0, 2);

    document.getElementById('sidebar-user-avatar').textContent = initials;
    document.getElementById('sidebar-user-name').textContent = patName;
    document.getElementById('sidebar-user-role').textContent = `Patient #PAT-${currentUser.patient_id} (${blood})`;

    if (portalBadge) {
      portalBadge.className = 'portal-badge topbar-user-badge patient';
      portalBadge.innerHTML = `<span class="role-dot"></span> 👤 Patient Portal &bull; ${patName}`;
    }

    const btnPortalPat = document.getElementById('btn-portal-patient');
    if (btnPortalPat) btnPortalPat.classList.add('active');

    switchView('patient-portal');
    renderPatientPortal();
  } else {
    // Admin
    navAdmins.forEach(el => el.style.display = 'flex');
    navDoctors.forEach(el => el.style.display = 'none');
    navPatients.forEach(el => el.style.display = 'none');

    if (btnNewPat) btnNewPat.style.display = 'inline-block';
    if (btnNewDoc) btnNewDoc.style.display = 'inline-block';
    if (btnAdmit) btnAdmit.style.display = 'inline-block';
    if (btnBook) btnBook.style.display = 'inline-block';

    document.getElementById('sidebar-user-avatar').textContent = 'AD';
    document.getElementById('sidebar-user-name').textContent = 'Hospital Admin';
    document.getElementById('sidebar-user-role').textContent = 'System Staff';

    if (portalBadge) {
      portalBadge.className = 'portal-badge topbar-user-badge admin';
      portalBadge.innerHTML = `<span class="role-dot"></span> 🛡️ Admin Portal`;
    }

    const btnPortalAdm = document.getElementById('btn-portal-admin');
    if (btnPortalAdm) btnPortalAdm.classList.add('active');

    switchView('overview');
  }

  populateDropdowns();
}

/**
 * Handles tabs inside the Switch Role modal
 */
function switchLoginTab(tab) {
  document.querySelectorAll('#modal-login .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-login-${tab}`)?.classList.add('active');

  const panels = ['doctor', 'patient', 'admin'];
  panels.forEach(p => {
    const el = document.getElementById(`login-panel-${p}`);
    if (el) el.style.display = (p === tab) ? 'block' : 'none';
  });
}

function confirmDoctorLogin() {
  const sel = document.getElementById('login-select-doctor');
  const docId = parseInt(sel.value, 10);
  if (!docId) {
    showToast('Please select a doctor from the list', 'warning');
    return;
  }
  quickLoginDoctor(docId);
  closeModal('modal-login');
}

function confirmPatientLogin() {
  const sel = document.getElementById('login-select-patient');
  const patId = parseInt(sel.value, 10);
  if (!patId) {
    showToast('Please select a patient from the list', 'warning');
    return;
  }
  quickLoginPatient(patId);
  closeModal('modal-login');
}

function confirmAdminLogin() {
  const user = {
    role: 'admin',
    name: 'Hospital Administrator',
    username: 'admin',
    email: 'admin@hospital.org'
  };
  loginSuccess(user, 'Switched to System Administrator workspace.');
  closeModal('modal-login');
}

function switchPortal(targetPortal) {
  if (targetPortal === 'doctor') {
    if (currentUser && currentUser.role === 'doctor') {
      switchView('doctor-portal');
    } else {
      openModal('modal-login');
      switchLoginTab('doctor');
    }
  } else if (targetPortal === 'patient') {
    if (currentUser && currentUser.role === 'patient') {
      switchView('patient-portal');
    } else {
      openModal('modal-login');
      switchLoginTab('patient');
    }
  } else {
    if (currentUser && currentUser.role === 'admin') {
      switchView('overview');
    } else {
      openModal('modal-login');
      switchLoginTab('admin');
    }
  }
}

/**
 * Doctor Portal: Renders doctor header and their specific appointments roster
 */
function renderDoctorPortal() {
  const doc = (currentUser && currentUser.role === 'doctor') 
    ? currentUser 
    : (state.doctors[0] || { doctor_id: 1, name: 'Dr. Rajesh Sharma', specialization: 'Senior Cardiologist' });

  const docName = doc.name || 'Doctor';
  const initials = docName.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);
  
  const avatarEl = document.getElementById('doc-portal-avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('doc-portal-name');
  if (nameEl) nameEl.textContent = docName;

  const specEl = document.getElementById('doc-portal-spec');
  if (specEl) specEl.textContent = `${doc.specialization} • Department of ${doc.department_name || 'General Medicine'}`;

  const contactEl = document.getElementById('doc-portal-contact');
  if (contactEl) {
    contactEl.textContent = `Phone: ${doc.phone || '+91 9876543210'} • Email: ${doc.email || 'doctor@hospital.org'} • Consultation Fee: ₹${Number(doc.consultation_fee || 500).toFixed(2)}`;
  }

  const tbody = document.getElementById('doc-appointments-tbody');
  if (!tbody) return;

  const docAppts = state.appointments.filter(a => a.doctor_id === doc.doctor_id);
  if (docAppts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No appointments scheduled under your roster yet.</td></tr>';
    return;
  }

  tbody.innerHTML = docAppts.map(a => {
    const statusClass = `badge-${(a.status || '').toLowerCase()}`;
    return `
      <tr>
        <td><strong>#APT-${a.appointment_id}</strong></td>
        <td><strong>${escapeHtml(a.patient_name || 'Patient #' + a.patient_id)}</strong></td>
        <td>${escapeHtml(a.patient_contact || 'N/A')}</td>
        <td>${a.appointment_date} <br><small style="color:#64748b">${a.time_slot}</small></td>
        <td>${escapeHtml(a.reason || 'Consultation')}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(a.status)}</span></td>
        <td>
          <div style="display:flex;gap:5px;">
            ${a.status === 'Scheduled' ? `
              <button class="btn-success-sm" title="Mark Completed" onclick="updateAppointmentStatus(${a.appointment_id}, 'Completed')">✓ Complete</button>
            ` : ''}
            <button class="btn btn-outline btn-sm" onclick="openDiagnosisModal(${a.appointment_id})">📝 EMR / Prescribe</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Patient Portal: Renders patient profile banner and their personal appointments list
 */
function renderPatientPortal() {
  const pat = (currentUser && currentUser.role === 'patient')
    ? currentUser
    : (state.patients[0] || { patient_id: 1, full_name: 'Aarav Patel', blood_group: 'O+', dob: '1988-04-12' });

  const patName = pat.name || pat.full_name || 'Patient';
  const initials = patName.split(' ').map(n => n[0]).join('').substring(0, 2);

  const avatarEl = document.getElementById('pat-portal-avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('pat-portal-name');
  if (nameEl) nameEl.textContent = patName;

  const age = calculateAge(pat.dob || '1990-01-01');
  const metaEl = document.getElementById('pat-portal-meta');
  if (metaEl) {
    metaEl.textContent = `Patient ID: #PAT-${pat.patient_id} • Blood Group: ${pat.blood_group || 'O+'} • Age: ${age} yrs`;
  }

  const contactEl = document.getElementById('pat-portal-contact');
  if (contactEl) {
    contactEl.textContent = `Contact: ${pat.contact || 'N/A'} • Address: ${pat.address || 'Registered Address'}`;
  }

  const tbody = document.getElementById('pat-appointments-tbody');
  if (!tbody) return;

  const patAppts = state.appointments.filter(a => a.patient_id === pat.patient_id);
  if (patAppts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-loading">
          No appointments booked yet. 
          <button class="btn btn-sm btn-primary" style="margin-left:8px;" onclick="openModal('modal-appointment')">+ Book Your First Appointment</button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = patAppts.map(a => {
    const statusClass = `badge-${(a.status || '').toLowerCase()}`;
    const payStatus = a.payment_status || 'Pending';
    const payBadge = `badge-${payStatus.toLowerCase()}`;
    return `
      <tr>
        <td><strong>#APT-${a.appointment_id}</strong></td>
        <td><strong>${escapeHtml(a.doctor_name || 'Doctor')}</strong></td>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;">${escapeHtml(a.specialization || a.department_name || 'General')}</span></td>
        <td>${a.appointment_date} <br><small style="color:#64748b">${a.time_slot}</small></td>
        <td>${escapeHtml(a.reason || 'Checkup')}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(a.status)}</span></td>
        <td>
          <span class="badge ${payBadge}">${escapeHtml(payStatus)}</span>
          ${a.invoice_id && payStatus === 'Pending' ? `
            <button class="btn btn-primary btn-sm" style="margin-left:4px;padding:3px 8px;" onclick="openPaymentModal(${a.invoice_id})">Pay</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Optical Scanner: Links scanned prescription to the current patient's records
 */
function attachScannedPrescription() {
  const pat = (currentUser && currentUser.role === 'patient') 
    ? currentUser 
    : (state.patients[0] || { patient_id: 1, full_name: 'Aarav Patel' });

  const patName = pat.name || pat.full_name || 'Patient';
  const newRecId = (state.records.length > 0 ? Math.max(...state.records.map(r => r.record_id)) : 0) + 1;
  state.records.unshift({
    record_id: newRecId,
    patient_id: pat.patient_id,
    patient_name: patName,
    doctor_name: 'Dr. Rajesh Sharma',
    specialization: 'Senior Cardiologist',
    appointment_id: 1,
    appointment_date: new Date().toISOString().split('T')[0],
    diagnosis: 'Premature Ventricular Contractions (Mild Arrhythmia) [Scanned Rx]',
    treatment: 'Metoprolol 25mg (1 Tab OD), Ecosprin 75mg (1 Tab Post Lunch)',
    notes: 'Prescription scanned via Optical Rx Scanner and attached to your EMR.'
  });

  saveLocalState();
  showToast('Scanned prescription saved to your Electronic Health Records!', 'success');
  switchView('records');
}

/**
 * Prints or exports prescription summary
 */
function printPrescriptionSummary() {
  window.print();
}

