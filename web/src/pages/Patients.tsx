import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useAuth } from '../auth';
import { PatientForm } from '../components/PatientForm';
import { useToast } from '../toast';
import type { Patient } from '../types';
import { EmptyState, ErrorBanner, Modal, Spinner } from '../ui';
import { ageFrom, hasAlert } from '../utils';

export function PatientsPage() {
  const { user } = useAuth();
  const { meta, sedeId } = useAppData();
  const notify = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      api
        .patients(query.trim() || undefined, sedeId || undefined)
        .then((items) => {
          if (!cancelled) {
            setPatients(items);
            setError('');
          }
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, sedeId, reloadKey]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  async function remove(patient: Patient) {
    if (!window.confirm(`¿Eliminar a ${patient.name}? Se borran sus turnos, cobros y hallazgos.`)) {
      return;
    }
    try {
      await api.deletePatient(patient.id);
      notify('Paciente eliminado.');
      refresh();
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <>
      <div className="toolbar">
        <input
          className="input search"
          type="search"
          placeholder="Buscar por nombre o documento…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nuevo paciente
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Spinner label="Buscando pacientes…" />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Documento</th>
                <th>Edad</th>
                <th>Teléfono</th>
                <th>Alerta</th>
                <th className="th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>No hay pacientes que coincidan con la búsqueda.</EmptyState>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td data-label="Paciente">
                      <Link className="strong-link" to={`/pacientes/${patient.id}`}>
                        {patient.name}
                      </Link>
                      {patient.notes && (
                        <div className="sub" title={patient.notes}>
                          {patient.notes}
                        </div>
                      )}
                    </td>
                    <td data-label="Documento">{patient.doc}</td>
                    <td data-label="Edad">{ageFrom(patient.birth)}</td>
                    <td data-label="Teléfono">{patient.phone || '—'}</td>
                    <td data-label="Alerta">
                      {hasAlert(patient.allergies) ? (
                        <span className="badge badge-danger">⚠ {patient.allergies}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="actions" data-label="Acciones">
                      <Link className="btn btn-sm btn-secondary" to={`/pacientes/${patient.id}?tab=odonto`}>
                        Odontograma
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditing(patient)}
                      >
                        Editar
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => remove(patient)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="Nuevo paciente" onClose={() => setCreating(false)} wide>
          <PatientForm
            sedes={meta.sedes}
            onSaved={() => {
              setCreating(false);
              refresh();
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Editar paciente" onClose={() => setEditing(null)} wide>
          <PatientForm
            initial={editing}
            sedes={meta.sedes}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
