import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useToast } from '../toast';
import type { Appointment, AppointmentStatus, Patient } from '../types';
import { EmptyState, ErrorBanner, Field, Modal, Spinner, StatusBadge } from '../ui';
import { formatDate, hasAlert, todayISO } from '../utils';

function nextSlot(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  const minutes = now.getMinutes();
  const add = minutes === 0 || minutes === 30 ? 30 : 30 - (minutes % 30);
  now.setMinutes(minutes + add);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function AgendaPage() {
  const { sedeId } = useAppData();
  const notify = useToast();
  const [date, setDate] = useState(todayISO());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .appointments(date, sedeId || undefined)
      .then((items) => {
        if (!cancelled) {
          setAppointments(items);
          setError('');
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, sedeId, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    api
      .patients(undefined, sedeId || undefined)
      .then((items) => {
        if (!cancelled) setPatients(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sedeId]);

  async function changeStatus(appointment: Appointment, status: AppointmentStatus) {
    if (
      status === 'CANCELADA' &&
      !window.confirm(`¿Cancelar el turno de las ${appointment.time}?`)
    ) {
      return;
    }
    try {
      await api.updateAppointment(appointment.id, status);
      notify(`Turno actualizado: ${status}.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  function actions(appointment: Appointment) {
    switch (appointment.status) {
      case 'PROGRAMADA':
        return (
          <>
            <button
              className="btn btn-sm"
              onClick={() => changeStatus(appointment, 'CONFIRMADA')}
            >
              Confirmar
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => changeStatus(appointment, 'EN_SALA')}
            >
              En sala
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => changeStatus(appointment, 'CANCELADA')}
            >
              Cancelar
            </button>
          </>
        );
      case 'CONFIRMADA':
        return (
          <>
            <button
              className="btn btn-sm"
              onClick={() => changeStatus(appointment, 'EN_SALA')}
            >
              En sala
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => changeStatus(appointment, 'CANCELADA')}
            >
              Cancelar
            </button>
          </>
        );
      case 'EN_SALA':
        return (
          <button className="btn btn-sm" onClick={() => changeStatus(appointment, 'ATENDIDA')}>
            Atender
          </button>
        );
      default:
        return <span className="muted">—</span>;
    }
  }

  return (
    <>
      <div className="toolbar">
        <label className="field-inline">
          <span>Fecha</span>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || todayISO())}
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nuevo turno
        </button>
      </div>

      <p className="muted small">
        {formatDate(date)} · {appointments.length} turno{appointments.length === 1 ? '' : 's'}
      </p>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Spinner label="Cargando agenda…" />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Profesional</th>
                <th>Sillón</th>
                <th>Estado</th>
                <th className="th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>No hay turnos para esa fecha.</EmptyState>
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td data-label="Hora">
                      <strong>{appointment.time}</strong>
                    </td>
                    <td data-label="Paciente">
                      <strong>{appointment.patientName}</strong>
                      {hasAlert(appointment.patientAllergies) && (
                        <div className="sub">⚠ {appointment.patientAllergies}</div>
                      )}
                    </td>
                    <td data-label="Profesional">{appointment.professionalName}</td>
                    <td data-label="Sillón">{appointment.chairName}</td>
                    <td data-label="Estado">
                      <StatusBadge status={appointment.status} />
                    </td>
                    <td className="actions" data-label="Acciones">
                      {actions(appointment)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <AppointmentModal
          date={date}
          patients={patients}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setReloadKey((key) => key + 1);
          }}
        />
      )}
    </>
  );
}

function AppointmentModal({
  date,
  patients,
  onClose,
  onCreated,
}: {
  date: string;
  patients: Patient[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { meta } = useAppData();
  const notify = useToast();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [professionalId, setProfessionalId] = useState(meta.professionals[0]?.id ?? '');
  const [time, setTime] = useState(nextSlot());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const patient = patients.find((item) => item.id === patientId);
  const chairs = useMemo(
    () => meta.chairs.filter((chair) => !patient || chair.sedeId === patient.sedeId),
    [meta.chairs, patient],
  );
  const [chairId, setChairId] = useState(chairs[0]?.id ?? '');

  useEffect(() => {
    if (!chairs.some((chair) => chair.id === chairId)) {
      setChairId(chairs[0]?.id ?? '');
    }
  }, [chairs, chairId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!patientId) {
      setError('Elegí un paciente.');
      return;
    }
    if (!professionalId) {
      setError('Elegí un profesional.');
      return;
    }
    if (!chairId) {
      setError('No hay sillones disponibles para la sede del paciente.');
      return;
    }
    if (!time) {
      setError('Elegí una hora.');
      return;
    }
    if (reason && reason.length > 200) {
      setError('El motivo no puede exceder 200 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await api.createAppointment({
        patientId,
        professionalId,
        chairId,
        date,
        time,
        reason,
      });
      notify('Turno creado.');
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo turno" onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        {error && <div className="error-banner">⚠ {error}</div>}
        <div className="form-grid">
          <Field label="Paciente" required wide>
            <select
              className="input"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
            >
              {patients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input className="input" value={formatDate(date)} disabled />
          </Field>
          <Field label="Hora" required>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
          <Field label="Profesional">
            <select
              className="input"
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
            >
              {meta.professionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.specialty}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sillón">
            <select
              className="input"
              value={chairId}
              onChange={(event) => setChairId(event.target.value)}
            >
              {chairs.map((chair) => (
                <option key={chair.id} value={chair.id}>
                  {chair.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Motivo" wide>
            <input
              className="input"
              value={reason}
              placeholder="Control, limpieza, dolor…"
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creando…' : 'Crear turno'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
