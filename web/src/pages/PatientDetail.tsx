import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useAuth } from '../auth';
import { Odontogram } from '../components/Odontogram';
import { PatientForm } from '../components/PatientForm';
import { useToast } from '../toast';
import type { PatientDetail } from '../types';
import { EmptyState, ErrorBanner, Modal, Spinner, StatusBadge } from '../ui';
import { ageFrom, formatDate, hasAlert, initials } from '../utils';

type Tab = 'datos' | 'odonto' | 'turnos';

export function PatientDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { meta } = useAppData();
  const notify = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab = tabParam === 'odonto' || tabParam === 'turnos' ? tabParam : 'datos';

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError('');
    api
      .patient(id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <ErrorBanner message={error} />;
  if (!detail) return <Spinner />;

  const { patient, findings, appointments } = detail;
  const sede = meta.sedes.find((item) => item.id === patient.sedeId);
  const canEditClinical = user?.role === 'admin' || user?.role === 'odontologo';

  async function remove() {
    if (!window.confirm(`¿Eliminar a ${patient.name}? Se borran sus turnos, cobros y hallazgos.`)) {
      return;
    }
    try {
      await api.deletePatient(patient.id);
      notify('Paciente eliminado.');
      navigate('/pacientes');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <>
      <Link className="back-link" to="/pacientes">← Volver a pacientes</Link>

      <section className="card patient-hero">
        <div className="patient-identity">
          <span className="avatar avatar-lg">{initials(patient.name)}</span>
          <div>
            <h2>{patient.name}</h2>
            <p className="muted">
              {patient.doc} · {ageFrom(patient.birth)} años · {sede?.name ?? 'Sin sede'}
            </p>
          </div>
        </div>
        <div className="patient-hero-actions">
          {hasAlert(patient.allergies) && (
            <span className="badge badge-danger">⚠ {patient.allergies}</span>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Editar ficha
          </button>
          {user?.role === 'admin' && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              Eliminar
            </button>
          )}
        </div>
      </section>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'datos'}
          className={`tab${tab === 'datos' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'datos' })}
        >
          Datos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'odonto'}
          className={`tab${tab === 'odonto' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'odonto' })}
        >
          Odontograma <span className="pill">{findings.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'turnos'}
          className={`tab${tab === 'turnos' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'turnos' })}
        >
          Turnos <span className="pill">{appointments.length}</span>
        </button>
      </div>

      {tab === 'datos' && (
        <section className="card">
          <div className="detail-grid">
            <div>
              <span>Documento</span>
              <strong>{patient.doc}</strong>
            </div>
            <div>
              <span>Fecha de nacimiento</span>
              <strong>{formatDate(patient.birth)}</strong>
            </div>
            <div>
              <span>Teléfono</span>
              <strong>{patient.phone || '—'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{patient.email || '—'}</strong>
            </div>
            <div>
              <span>Dirección</span>
              <strong>{patient.address || '—'}</strong>
            </div>
            <div>
              <span>Sede</span>
              <strong>{sede?.name ?? '—'}</strong>
            </div>
            <div className="detail-wide">
              <span>Alergias / alertas</span>
              <strong className={hasAlert(patient.allergies) ? 'text-danger' : ''}>
                {patient.allergies || 'Sin alertas registradas'}
              </strong>
            </div>
            <div className="detail-wide">
              <span>Notas</span>
              <strong>{patient.notes || '—'}</strong>
            </div>
          </div>
          {appointments.length > 0 && (
            <p className="muted small detail-footnote">
              Último turno: {formatDate(appointments[0].date)} · {appointments[0].status}
            </p>
          )}
        </section>
      )}

      {tab === 'odonto' && (
        <Odontogram patientId={patient.id} canEdit={canEditClinical} />
      )}

      {tab === 'turnos' && (
        <section className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Profesional</th>
                <th>Sillón</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>Este paciente todavía no tiene turnos.</EmptyState>
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td data-label="Fecha">{formatDate(appointment.date)}</td>
                    <td data-label="Hora">{appointment.time}</td>
                    <td data-label="Profesional">{appointment.professionalName}</td>
                    <td data-label="Sillón">{appointment.chairName}</td>
                    <td data-label="Motivo">{appointment.reason || '—'}</td>
                    <td data-label="Estado">
                      <StatusBadge status={appointment.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {editing && (
        <Modal title="Editar paciente" onClose={() => setEditing(false)} wide>
          <PatientForm
            initial={patient}
            sedes={meta.sedes}
            onSaved={(saved) => {
              setEditing(false);
              setDetail((prev) =>
                prev
                  ? {
                      ...prev,
                      patient: saved,
                    }
                  : prev,
              );
              notify('Paciente actualizado.');
            }}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </>
  );
}
