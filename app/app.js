'use strict';

/* ============================================================
   SIGO-Dental · MVP 1 hora
   Prototipo estático con persistencia en localStorage.
   ============================================================ */

const STORAGE_KEY = 'sigo_mvp_v1';

const TEETH_UPPER = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const TEETH_LOWER = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

const CONDITIONS = {
  caries: { label: 'Caries', color: '#d32f2f' },
  restauracion: { label: 'Restauración', color: '#1565c0' },
  endodoncia: { label: 'Endodoncia', color: '#6a1b9a' },
  ausente: { label: 'Ausente', color: '#90a4ae' },
  corona: { label: 'Corona', color: '#b8860b' },
  implante: { label: 'Implante', color: '#2e7d32' },
  sellante: { label: 'Sellante', color: '#f9a825' }
};

const STATUS = {
  PROGRAMADA: { label: 'Programada', cls: 'badge-programada' },
  CONFIRMADA: { label: 'Confirmada', cls: 'badge-confirmada' },
  EN_SALA: { label: 'En sala', cls: 'badge-en_sala' },
  ATENDIDA: { label: 'Atendida', cls: 'badge-atendida' },
  CANCELADA: { label: 'Cancelada', cls: 'badge-cancelada' }
};

const VIEW_META = {
  dashboard: { title: 'Panel', subtitle: 'Resumen del día' },
  pacientes: { title: 'Pacientes', subtitle: 'Fichas, alertas y accesos rápidos' },
  agenda: { title: 'Agenda', subtitle: 'Turnos y estados de atención' },
  odontograma: { title: 'Odontograma', subtitle: 'Hallazgos por pieza dental' },
  caja: { title: 'Caja', subtitle: 'Cobros y cierre del día' }
};

const els = {};
let db = null;
let selectedOdontoPatientId = null;
let selectedTooth = null;
let editingPatientId = null;
let toastTimer = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  Object.assign(els, {
    viewTitle: document.getElementById('viewTitle'),
    viewSubtitle: document.getElementById('viewSubtitle'),
    todayLabel: document.getElementById('todayLabel'),
    statPatients: document.getElementById('statPatients'),
    statAppointments: document.getElementById('statAppointments'),
    statPendingHint: document.getElementById('statPendingHint'),
    statCollected: document.getElementById('statCollected'),
    statAlerts: document.getElementById('statAlerts'),
    dashboardAppointments: document.getElementById('dashboardAppointments'),
    dashboardAlerts: document.getElementById('dashboardAlerts'),
    dashboardAlertCount: document.getElementById('dashboardAlertCount'),
    dashboardPayments: document.getElementById('dashboardPayments'),
    patientSearch: document.getElementById('patientSearch'),
    patientsBody: document.getElementById('patientsBody'),
    appointmentDate: document.getElementById('appointmentDate'),
    appointmentsBody: document.getElementById('appointmentsBody'),
    odontoPatient: document.getElementById('odontoPatient'),
    legend: document.getElementById('legend'),
    teethUpper: document.getElementById('teethUpper'),
    teethLower: document.getElementById('teethLower'),
    toothTitle: document.getElementById('toothTitle'),
    toothMeta: document.getElementById('toothMeta'),
    toothForm: document.getElementById('toothForm'),
    toothCondition: document.getElementById('toothCondition'),
    toothNote: document.getElementById('toothNote'),
    toothSavedHint: document.getElementById('toothSavedHint'),
    saveToothBtn: document.getElementById('saveToothBtn'),
    clearToothBtn: document.getElementById('clearToothBtn'),
    paymentForm: document.getElementById('paymentForm'),
    paymentPatient: document.getElementById('paymentPatient'),
    paymentConcept: document.getElementById('paymentConcept'),
    paymentAmount: document.getElementById('paymentAmount'),
    paymentMethod: document.getElementById('paymentMethod'),
    paymentsList: document.getElementById('paymentsList'),
    cashTotal: document.getElementById('cashTotal'),
    closeCashBtn: document.getElementById('closeCashBtn'),
    closuresList: document.getElementById('closuresList'),
    patientDialog: document.getElementById('patientDialog'),
    patientDialogTitle: document.getElementById('patientDialogTitle'),
    patientForm: document.getElementById('patientForm'),
    patientName: document.getElementById('patientName'),
    patientDoc: document.getElementById('patientDoc'),
    patientBirth: document.getElementById('patientBirth'),
    patientPhone: document.getElementById('patientPhone'),
    patientAllergies: document.getElementById('patientAllergies'),
    patientNotes: document.getElementById('patientNotes'),
    patientDeleteBtn: document.getElementById('patientDeleteBtn'),
    appointmentDialog: document.getElementById('appointmentDialog'),
    appointmentForm: document.getElementById('appointmentForm'),
    appointmentPatient: document.getElementById('appointmentPatient'),
    appointmentDateInput: document.getElementById('appointmentDateInput'),
    appointmentTime: document.getElementById('appointmentTime'),
    appointmentProfessional: document.getElementById('appointmentProfessional'),
    appointmentChair: document.getElementById('appointmentChair'),
    appointmentReason: document.getElementById('appointmentReason'),
    toast: document.getElementById('toast')
  });

  db = loadDB();
  saveDB();

  els.appointmentDate.value = todayISO();
  els.todayLabel.textContent = formatLongDate(todayISO());

  renderLegend();
  bindEvents();
  renderAll();
}

/* ---------------- Eventos ---------------- */

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.getElementById('quickPatientBtn').addEventListener('click', () => openPatientDialog());
  document.getElementById('newPatientBtn').addEventListener('click', () => openPatientDialog());
  document.getElementById('newAppointmentBtn').addEventListener('click', () => openAppointment());
  document.getElementById('resetBtn').addEventListener('click', resetDemo);

  els.patientSearch.addEventListener('input', renderPatients);
  els.appointmentDate.addEventListener('change', renderAppointments);

  els.odontoPatient.addEventListener('change', () => {
    selectedOdontoPatientId = els.odontoPatient.value || null;
    selectedTooth = null;
    renderOdonto();
  });

  els.teethUpper.addEventListener('click', handleToothClick);
  els.teethLower.addEventListener('click', handleToothClick);
  els.saveToothBtn.addEventListener('click', saveTooth);
  els.clearToothBtn.addEventListener('click', clearTooth);

  els.patientForm.addEventListener('submit', submitPatient);
  els.patientDeleteBtn.addEventListener('click', deletePatient);
  els.appointmentForm.addEventListener('submit', submitAppointment);
  els.paymentForm.addEventListener('submit', submitPayment);
  els.closeCashBtn.addEventListener('click', closeCash);

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dialog = document.getElementById(btn.dataset.close);
      if (dialog) dialog.close();
    });
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.addEventListener('click', handleGlobalAction);
}

function handleGlobalAction(event) {
  const jump = event.target.closest('[data-view-jump]');
  if (jump) {
    showView(jump.dataset.viewJump);
    return;
  }

  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const { action, id, status } = actionEl.dataset;

  if (action === 'odonto') {
    selectedOdontoPatientId = id;
    selectedTooth = null;
    showView('odontograma');
  } else if (action === 'agendar') {
    openAppointment(id);
  } else if (action === 'edit') {
    const patient = patientById(id);
    if (patient) openPatientDialog(patient);
  } else if (action === 'status') {
    updateAppointmentStatus(id, status);
  }
}

function showView(view) {
  const meta = VIEW_META[view];
  if (!meta) return;

  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  els.viewTitle.textContent = meta.title;
  els.viewSubtitle.textContent = meta.subtitle;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view === 'dashboard') renderDashboard();
  if (view === 'pacientes') renderPatients();
  if (view === 'agenda') renderAppointments();
  if (view === 'odontograma') renderOdonto();
  if (view === 'caja') renderCash();
}

/* ---------------- Persistencia ---------------- */

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDB();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.patients)) return seedDB();
    return {
      patients: parsed.patients || [],
      appointments: parsed.appointments || [],
      odontograms: parsed.odontograms || {},
      payments: parsed.payments || [],
      closures: parsed.closures || []
    };
  } catch (error) {
    console.warn('No se pudo leer localStorage. Se reinicia la demo.', error);
    return seedDB();
  }
}

function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('No se pudo guardar en localStorage.', error);
    toast('No se pudo guardar. Revisá el almacenamiento del navegador.', 'error');
  }
}

function seedDB() {
  const today = todayISO();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toISODate(tomorrowDate);

  return {
    patients: [
      {
        id: 'p1',
        name: 'María González',
        doc: '30123456',
        birth: '1984-03-15',
        phone: '+54 9 11 2345-6789',
        allergies: 'Penicilina (severa)',
        notes: 'Ansiedad dental. Prefiere turnos por la mañana.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'p2',
        name: 'Juan Pérez',
        doc: '28456789',
        birth: '1976-07-22',
        phone: '+54 9 11 3456-7890',
        allergies: 'Ninguna',
        notes: 'Derivado para evaluación de implante.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'p3',
        name: 'Lucía Fernández',
        doc: '41234567',
        birth: '1999-11-03',
        phone: '+54 9 11 4567-8901',
        allergies: 'Látex (leve)',
        notes: '',
        createdAt: new Date().toISOString()
      },
      {
        id: 'p4',
        name: 'Carlos Rodríguez',
        doc: '25678901',
        birth: '1968-01-30',
        phone: '+54 9 11 5678-9012',
        allergies: 'Ninguna',
        notes: 'Control de prótesis.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'p5',
        name: 'Sofía Martínez',
        doc: '38901234',
        birth: '1990-05-18',
        phone: '+54 9 11 6789-0123',
        allergies: 'Ibuprofeno',
        notes: '',
        createdAt: new Date().toISOString()
      }
    ],
    appointments: [
      { id: 'a1', patientId: 'p1', date: today, time: '09:00', professional: 'Dra. Gómez', chair: 'Sillón 1', reason: 'Control', status: 'CONFIRMADA' },
      { id: 'a2', patientId: 'p2', date: today, time: '10:00', professional: 'Dr. Pérez', chair: 'Sillón 2', reason: 'Limpieza', status: 'PROGRAMADA' },
      { id: 'a3', patientId: 'p3', date: today, time: '11:30', professional: 'Dra. Ruiz', chair: 'Sillón 3', reason: 'Dolor', status: 'EN_SALA' },
      { id: 'a4', patientId: 'p4', date: today, time: '15:00', professional: 'Dra. Gómez', chair: 'Sillón 1', reason: 'Control de prótesis', status: 'ATENDIDA' },
      { id: 'a5', patientId: 'p5', date: tomorrow, time: '09:30', professional: 'Dr. Pérez', chair: 'Sillón 2', reason: 'Presupuesto', status: 'PROGRAMADA' }
    ],
    odontograms: {
      p1: {
        36: { condition: 'caries', surfaces: ['O'], note: 'Caries oclusal profunda', updatedAt: new Date().toISOString() },
        46: { condition: 'restauracion', surfaces: ['O', 'V'], note: 'Restauración de resina existente', updatedAt: new Date().toISOString() },
        11: { condition: 'sellante', surfaces: ['O'], note: '', updatedAt: new Date().toISOString() }
      }
    },
    payments: [
      {
        id: 'pay1',
        patientId: 'p4',
        concept: 'Consulta de control',
        amount: 15000,
        method: 'Efectivo',
        date: today,
        time: '08:45'
      }
    ],
    closures: []
  };
}

function resetDemo() {
  if (!confirm('¿Reiniciar la demo? Se borran los datos cargados en este navegador.')) return;
  db = seedDB();
  saveDB();
  selectedOdontoPatientId = null;
  selectedTooth = null;
  els.appointmentDate.value = todayISO();
  els.patientSearch.value = '';
  renderAll();
  toast('Demo reiniciada con datos de ejemplo.');
}

/* ---------------- Render general ---------------- */

function renderAll() {
  renderDashboard();
  renderPatients();
  renderAppointments();
  renderOdonto();
  renderCash();
}

function renderLegend() {
  els.legend.innerHTML = Object.entries(CONDITIONS)
    .map(([, condition]) => `<span class="legend-item"><span class="legend-dot" style="--c:${condition.color}"></span>${condition.label}</span>`)
    .join('');
}

/* ---------------- Panel ---------------- */

function renderDashboard() {
  const today = todayISO();
  const todayAppointments = db.appointments.filter((a) => a.date === today && a.status !== 'CANCELADA');
  const pending = todayAppointments.filter((a) => ['PROGRAMADA', 'CONFIRMADA', 'EN_SALA'].includes(a.status));
  const collected = db.payments
    .filter((p) => p.date === today)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const alerts = db.patients.filter(hasAlert);

  els.statPatients.textContent = String(db.patients.length);
  els.statAppointments.textContent = String(todayAppointments.length);
  els.statPendingHint.textContent = `${pending.length} pendientes`;
  els.statCollected.textContent = money(collected);
  els.statAlerts.textContent = String(alerts.length);
  els.dashboardAlertCount.textContent = String(alerts.length);

  els.dashboardAppointments.innerHTML = todayAppointments.length
    ? todayAppointments
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((appointment) => {
          const patient = patientById(appointment.patientId);
          return `<div class="list-item">
            <div>
              <strong>${esc(appointment.time)} · ${esc(patient ? patient.name : 'Paciente eliminado')}</strong>
              <span>${esc(appointment.professional)} · ${esc(appointment.chair)}${appointment.reason ? ' · ' + esc(appointment.reason) : ''}</span>
            </div>
            <span class="badge ${STATUS[appointment.status] ? STATUS[appointment.status].cls : ''}">${statusLabel(appointment.status)}</span>
          </div>`;
        })
        .join('')
    : empty('No hay turnos para hoy.');

  els.dashboardAlerts.innerHTML = alerts.length
    ? alerts
        .map(
          (patient) => `<div class="list-item alert">
            <div>
              <strong>${esc(patient.name)}</strong>
              <span>⚠ ${esc(patient.allergies)}</span>
            </div>
            <button class="btn btn-sm btn-secondary" type="button" data-action="odonto" data-id="${patient.id}">Ver ficha</button>
          </div>`
        )
        .join('')
    : empty('Sin alertas médicas registradas.');

  const recentPayments = db.payments
    .slice()
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .slice(0, 5);

  els.dashboardPayments.innerHTML = recentPayments.length
    ? recentPayments
        .map((payment) => {
          const patient = patientById(payment.patientId);
          return `<div class="list-item">
            <div>
              <strong>${esc(payment.concept)} · ${esc(patient ? patient.name : 'Paciente eliminado')}</strong>
              <span>${esc(payment.method)} · ${esc(payment.time)} · ${formatShortDate(payment.date)}</span>
            </div>
            <strong>${money(payment.amount)}</strong>
          </div>`;
        })
        .join('')
    : empty('Todavía no hay cobros registrados.');
}

/* ---------------- Pacientes ---------------- */

function renderPatients() {
  const query = els.patientSearch.value.trim().toLowerCase();
  const patients = db.patients
    .filter((patient) => {
      if (!query) return true;
      return patient.name.toLowerCase().includes(query) || String(patient.doc).toLowerCase().includes(query);
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  els.patientsBody.innerHTML = patients.length
    ? patients
        .map((patient) => {
          const alert = hasAlert(patient);
          return `<tr>
            <td data-label="Paciente">
              <strong>${esc(patient.name)}</strong>
              ${patient.notes ? `<div class="sub" title="${esc(patient.notes)}">${esc(patient.notes)}</div>` : ''}
            </td>
            <td data-label="Documento">${esc(patient.doc)}</td>
            <td data-label="Edad">${patient.birth ? ageFrom(patient.birth) : '—'}</td>
            <td data-label="Teléfono">${esc(patient.phone || '—')}</td>
            <td data-label="Alerta">${alert ? `<span class="badge badge-danger">⚠ ${esc(patient.allergies)}</span>` : '<span class="muted">—</span>'}</td>
            <td class="actions" data-label="Acciones">
              <button class="btn btn-sm btn-secondary" type="button" data-action="odonto" data-id="${patient.id}">Odontograma</button>
              <button class="btn btn-sm btn-secondary" type="button" data-action="agendar" data-id="${patient.id}">Agendar</button>
              <button class="btn btn-sm btn-secondary" type="button" data-action="edit" data-id="${patient.id}">Editar</button>
            </td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="6">${empty('No hay pacientes que coincidan con la búsqueda.')}</td></tr>`;
}

function openPatientDialog(patient) {
  editingPatientId = patient ? patient.id : null;
  els.patientForm.reset();
  els.patientDialogTitle.textContent = patient ? 'Editar paciente' : 'Nuevo paciente';
  els.patientDeleteBtn.classList.toggle('hidden', !patient);

  if (patient) {
    els.patientName.value = patient.name || '';
    els.patientDoc.value = patient.doc || '';
    els.patientBirth.value = patient.birth || '';
    els.patientPhone.value = patient.phone || '';
    els.patientAllergies.value = patient.allergies || '';
    els.patientNotes.value = patient.notes || '';
  }

  els.patientDialog.showModal();
  setTimeout(() => els.patientName.focus(), 50);
}

function submitPatient(event) {
  event.preventDefault();

  const name = els.patientName.value.trim();
  const doc = els.patientDoc.value.trim();

  if (!name || !doc) {
    toast('Nombre y documento son obligatorios.', 'error');
    return;
  }

  const duplicate = db.patients.find((patient) => patient.doc === doc && patient.id !== editingPatientId);
  if (duplicate) {
    toast('Ya existe un paciente con ese documento.', 'error');
    return;
  }

  const data = {
    name,
    doc,
    birth: els.patientBirth.value || '',
    phone: els.patientPhone.value.trim(),
    allergies: els.patientAllergies.value.trim(),
    notes: els.patientNotes.value.trim()
  };

  if (editingPatientId) {
    const patient = patientById(editingPatientId);
    if (patient) Object.assign(patient, data);
    toast('Paciente actualizado.');
  } else {
    const patient = { id: uid(), ...data, createdAt: new Date().toISOString() };
    db.patients.push(patient);
    selectedOdontoPatientId = patient.id;
    toast('Paciente creado.');
  }

  saveDB();
  els.patientDialog.close();
  editingPatientId = null;
  renderAll();
}

function deletePatient() {
  if (!editingPatientId) return;
  const patient = patientById(editingPatientId);
  if (!patient) return;
  if (!confirm(`¿Eliminar a ${patient.name}? También se borran sus turnos, cobros y marcas del odontograma.`)) return;

  db.patients = db.patients.filter((item) => item.id !== editingPatientId);
  db.appointments = db.appointments.filter((item) => item.patientId !== editingPatientId);
  db.payments = db.payments.filter((item) => item.patientId !== editingPatientId);
  delete db.odontograms[editingPatientId];

  if (selectedOdontoPatientId === editingPatientId) {
    selectedOdontoPatientId = null;
    selectedTooth = null;
  }

  saveDB();
  els.patientDialog.close();
  editingPatientId = null;
  renderAll();
  toast('Paciente eliminado.');
}

/* ---------------- Agenda ---------------- */

function renderAppointments() {
  if (!els.appointmentDate.value) els.appointmentDate.value = todayISO();
  const date = els.appointmentDate.value;

  const appointments = db.appointments
    .filter((appointment) => appointment.date === date)
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));

  els.appointmentsBody.innerHTML = appointments.length
    ? appointments
        .map((appointment) => {
          const patient = patientById(appointment.patientId);
          return `<tr>
            <td data-label="Hora"><strong>${esc(appointment.time)}</strong></td>
            <td data-label="Paciente">
              <strong>${esc(patient ? patient.name : 'Paciente eliminado')}</strong>
              ${patient && hasAlert(patient) ? `<div class="sub">⚠ ${esc(patient.allergies)}</div>` : ''}
            </td>
            <td data-label="Profesional">${esc(appointment.professional)}</td>
            <td data-label="Sillón">${esc(appointment.chair)}</td>
            <td data-label="Estado"><span class="badge ${STATUS[appointment.status] ? STATUS[appointment.status].cls : ''}">${statusLabel(appointment.status)}</span></td>
            <td class="actions" data-label="Acciones">${appointmentActions(appointment)}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="6">${empty('No hay turnos para esa fecha.')}</td></tr>`;
}

function appointmentActions(appointment) {
  const button = (status, label, variant = '') =>
    `<button class="btn btn-sm ${variant}" type="button" data-action="status" data-id="${appointment.id}" data-status="${status}">${label}</button>`;

  if (appointment.status === 'PROGRAMADA') {
    return button('CONFIRMADA', 'Confirmar') + button('EN_SALA', 'En sala', 'btn-secondary') + button('CANCELADA', 'Cancelar', 'btn-danger');
  }
  if (appointment.status === 'CONFIRMADA') {
    return button('EN_SALA', 'En sala') + button('CANCELADA', 'Cancelar', 'btn-danger');
  }
  if (appointment.status === 'EN_SALA') {
    return button('ATENDIDA', 'Atender');
  }
  return '<span class="muted">—</span>';
}

function openAppointment(patientId) {
  if (!db.patients.length) {
    toast('Primero creá un paciente.', 'error');
    return;
  }

  els.appointmentForm.reset();
  fillPatientSelect(els.appointmentPatient, patientId || selectedOdontoPatientId);
  els.appointmentDateInput.value = els.appointmentDate.value || todayISO();
  els.appointmentTime.value = nextTime();
  els.appointmentProfessional.value = 'Dra. Gómez';
  els.appointmentChair.value = 'Sillón 1';

  els.appointmentDialog.showModal();
  setTimeout(() => els.appointmentReason.focus(), 50);
}

function submitAppointment(event) {
  event.preventDefault();

  const patientId = els.appointmentPatient.value;
  const date = els.appointmentDateInput.value;
  const time = els.appointmentTime.value;
  const professional = els.appointmentProfessional.value;
  const chair = els.appointmentChair.value;
  const reason = els.appointmentReason.value.trim();

  if (!patientId || !patientById(patientId)) {
    toast('Elegí un paciente válido.', 'error');
    return;
  }
  if (!date || !time) {
    toast('Fecha y hora son obligatorias.', 'error');
    return;
  }

  const conflict = db.appointments.some(
    (appointment) =>
      appointment.date === date &&
      appointment.time === time &&
      appointment.status !== 'CANCELADA' &&
      (appointment.professional === professional || appointment.chair === chair)
  );

  if (conflict) {
    toast('Ese horario ya está ocupado para el profesional o el sillón.', 'error');
    return;
  }

  db.appointments.push({
    id: uid(),
    patientId,
    date,
    time,
    professional,
    chair,
    reason,
    status: 'PROGRAMADA'
  });

  saveDB();
  els.appointmentDialog.close();
  els.appointmentDate.value = date;
  showView('agenda');
  renderAppointments();
  renderDashboard();
  toast('Turno creado.');
}

function updateAppointmentStatus(id, status) {
  const appointment = db.appointments.find((item) => item.id === id);
  if (!appointment || !STATUS[status]) return;

  if (status === 'CANCELADA' && !confirm(`¿Cancelar el turno de las ${appointment.time}?`)) return;

  appointment.status = status;
  if (status === 'ATENDIDA') appointment.finishedAt = new Date().toISOString();

  saveDB();
  renderAppointments();
  renderDashboard();
  toast(`Turno actualizado: ${statusLabel(status)}.`);
}

/* ---------------- Odontograma ---------------- */

function renderOdonto() {
  if (!db.patients.length) {
    selectedOdontoPatientId = null;
    selectedTooth = null;
    els.odontoPatient.innerHTML = '<option value="">Sin pacientes</option>';
    els.odontoPatient.disabled = true;
    els.teethUpper.innerHTML = empty('Creá un paciente para empezar.');
    els.teethLower.innerHTML = empty('Creá un paciente para empezar.');
    updateToothPanel();
    return;
  }

  els.odontoPatient.disabled = false;
  fillPatientSelect(els.odontoPatient, selectedOdontoPatientId);
  selectedOdontoPatientId = els.odontoPatient.value || db.patients[0].id;

  renderArches();
  updateToothPanel();
}

function renderArches() {
  if (!selectedOdontoPatientId) return;
  const findings = db.odontograms[selectedOdontoPatientId] || {};

  const toothHtml = (tooth) => {
    const finding = findings[tooth];
    const condition = finding ? CONDITIONS[finding.condition] : null;
    const classes = ['tooth', finding ? 'marked' : '', selectedTooth === tooth ? 'selected' : ''].filter(Boolean).join(' ');
    const style = condition ? `--c:${condition.color}` : '';
    const title = condition ? `${tooth} · ${condition.label}` : `${tooth} · sin marca`;
    return `<button class="${classes}" type="button" data-tooth="${tooth}" style="${style}" title="${esc(title)}" aria-label="Diente ${tooth}${condition ? ', ' + esc(condition.label) : ''}" aria-pressed="${selectedTooth === tooth}">
      <span class="tooth-num">${tooth}</span>
      <span class="tooth-mark" aria-hidden="true"></span>
    </button>`;
  };

  els.teethUpper.innerHTML = TEETH_UPPER.map(toothHtml).join('');
  els.teethLower.innerHTML = TEETH_LOWER.map(toothHtml).join('');
}

function handleToothClick(event) {
  const button = event.target.closest('[data-tooth]');
  if (!button) return;

  if (!selectedOdontoPatientId) {
    toast('Elegí un paciente primero.', 'error');
    return;
  }

  selectedTooth = button.dataset.tooth;
  renderArches();
  updateToothPanel();
}

function updateToothPanel() {
  if (!selectedOdontoPatientId) {
    els.toothTitle.textContent = 'Elegí un paciente';
    els.toothMeta.textContent = 'Seleccioná un paciente para cargar hallazgos.';
    els.toothForm.classList.add('hidden');
    return;
  }

  if (!selectedTooth) {
    els.toothTitle.textContent = selectedTooth || 'Seleccioná un diente';
    els.toothMeta.textContent = 'Hacé clic en una pieza dental para marcarla.';
    els.toothForm.classList.add('hidden');
    return;
  }

  const finding = (db.odontograms[selectedOdontoPatientId] || {})[selectedTooth];

  els.toothTitle.textContent = `Diente ${selectedTooth}`;
  els.toothMeta.textContent = `FDI ${selectedTooth} · Universal ${universal(selectedTooth)}`;
  els.toothForm.classList.remove('hidden');
  els.toothCondition.value = finding ? finding.condition : '';
  els.toothNote.value = finding ? finding.note || '' : '';
  els.toothSavedHint.textContent = finding ? 'Hallazgo guardado para este paciente.' : 'Sin marca en este diente.';
  els.clearToothBtn.disabled = !finding;

  document.querySelectorAll('input[name="surface"]').forEach((checkbox) => {
    checkbox.checked = Boolean(finding && Array.isArray(finding.surfaces) && finding.surfaces.includes(checkbox.value));
  });
}

function saveTooth() {
  if (!selectedOdontoPatientId || !selectedTooth) return;

  const condition = els.toothCondition.value;
  const surfaces = Array.from(document.querySelectorAll('input[name="surface"]:checked')).map((checkbox) => checkbox.value);
  const note = els.toothNote.value.trim();

  if (!db.odontograms[selectedOdontoPatientId]) db.odontograms[selectedOdontoPatientId] = {};

  if (!condition) {
    delete db.odontograms[selectedOdontoPatientId][selectedTooth];
    toast('Marca quitada.');
  } else {
    db.odontograms[selectedOdontoPatientId][selectedTooth] = {
      condition,
      surfaces,
      note,
      updatedAt: new Date().toISOString()
    };
    toast('Hallazgo guardado.');
  }

  saveDB();
  renderArches();
  updateToothPanel();
}

function clearTooth() {
  if (!selectedOdontoPatientId || !selectedTooth) return;
  if (db.odontograms[selectedOdontoPatientId]) {
    delete db.odontograms[selectedOdontoPatientId][selectedTooth];
  }
  saveDB();
  renderArches();
  updateToothPanel();
  toast('Marca quitada.');
}

/* ---------------- Caja ---------------- */

function renderCash() {
  fillPatientSelect(els.paymentPatient, els.paymentPatient.value || null);

  const openPayments = todayPayments().filter((payment) => !payment.closureId);
  const total = openPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  els.cashTotal.textContent = money(total);
  els.closeCashBtn.disabled = openPayments.length === 0;

  els.paymentsList.innerHTML = openPayments.length
    ? openPayments
        .slice()
        .sort((a, b) => b.time.localeCompare(a.time))
        .map((payment) => {
          const patient = patientById(payment.patientId);
          return `<div class="list-item">
            <div>
              <strong>${esc(payment.concept)}</strong>
              <span>${esc(patient ? patient.name : 'Paciente eliminado')} · ${esc(payment.method)} · ${esc(payment.time)}</span>
            </div>
            <strong>${money(payment.amount)}</strong>
          </div>`;
        })
        .join('')
    : empty('No hay cobros abiertos en la caja de hoy.');

  const closures = db.closures.slice(0, 5);
  els.closuresList.innerHTML = closures.length
    ? closures
        .map((closure) => {
          const closedTime = new Date(closure.closedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          return `<div class="list-item">
            <div>
              <strong>${formatShortDate(closure.date)}</strong>
              <span>${closure.count} cobros · cerrada ${closedTime}</span>
            </div>
            <strong>${money(closure.total)}</strong>
          </div>`;
        })
        .join('')
    : empty('Todavía no hay cierres de caja.');
}

function submitPayment(event) {
  event.preventDefault();

  const patientId = els.paymentPatient.value;
  const concept = els.paymentConcept.value.trim();
  const amount = Number(els.paymentAmount.value);
  const method = els.paymentMethod.value;

  if (!patientId || !patientById(patientId)) {
    toast('Elegí un paciente válido.', 'error');
    return;
  }
  if (!concept) {
    toast('Escribí un concepto para el cobro.', 'error');
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    toast('El monto debe ser mayor a cero.', 'error');
    return;
  }

  db.payments.push({
    id: uid(),
    patientId,
    concept,
    amount,
    method,
    date: todayISO(),
    time: nowTime()
  });

  saveDB();
  renderCash();
  renderDashboard();
  els.paymentConcept.value = '';
  els.paymentAmount.value = '';
  toast('Cobro registrado.');
}

function closeCash() {
  const openPayments = todayPayments().filter((payment) => !payment.closureId);
  if (!openPayments.length) {
    toast('No hay cobros abiertos para cerrar.', 'error');
    return;
  }

  const total = openPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  if (!confirm(`¿Cerrar la caja con ${openPayments.length} cobros por ${money(total)}?`)) return;

  const closureId = uid();
  openPayments.forEach((payment) => {
    payment.closureId = closureId;
  });

  db.closures.unshift({
    id: closureId,
    date: todayISO(),
    total,
    count: openPayments.length,
    closedAt: new Date().toISOString()
  });

  saveDB();
  renderCash();
  renderDashboard();
  toast('Caja cerrada correctamente.');
}

/* ---------------- Utilidades ---------------- */

function fillPatientSelect(select, selectedId) {
  const current = selectedId || select.value;
  const patients = db.patients.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));

  select.innerHTML = patients.length
    ? patients.map((patient) => `<option value="${patient.id}">${esc(patient.name)}</option>`).join('')
    : '<option value="">Sin pacientes</option>';

  select.disabled = patients.length === 0;

  if (current && patients.some((patient) => patient.id === current)) {
    select.value = current;
  }
}

function patientById(id) {
  return db.patients.find((patient) => patient.id === id) || null;
}

function hasAlert(patient) {
  const value = String(patient.allergies || '').trim().toLowerCase();
  return Boolean(value) && !['ninguna', 'ninguno', 'sin alergias', 'no'].includes(value);
}

function todayPayments() {
  const today = todayISO();
  return db.payments.filter((payment) => payment.date === today);
}

function statusLabel(status) {
  return STATUS[status] ? STATUS[status].label : status;
}

function universal(fdi) {
  const quadrant = Number(String(fdi)[0]);
  const position = Number(String(fdi)[1]);
  if (quadrant === 1) return 9 - position;
  if (quadrant === 2) return 8 + position;
  if (quadrant === 3) return 16 + position;
  if (quadrant === 4) return 33 - position;
  return fdi;
}

function ageFrom(birth) {
  const date = new Date(`${birth}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1;
  return age >= 0 ? `${age}` : '—';
}

function todayISO() {
  return toISODate(new Date());
}

function toISODate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function nowTime() {
  const date = new Date();
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextTime() {
  const date = new Date();
  date.setSeconds(0, 0);
  const minutes = date.getMinutes();
  const add = minutes === 0 || minutes === 30 ? 30 : 30 - (minutes % 30);
  date.setMinutes(minutes + add);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatLongDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const text = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatShortDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function money(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function uid() {
  return `id-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36).slice(-4)}`;
}

function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[character];
  });
}

function toast(message, type = 'ok') {
  els.toast.textContent = message;
  els.toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.className = 'toast';
  }, 2800);
}
