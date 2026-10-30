import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useAuth } from '../auth';
import { Odontogram } from '../components/Odontogram';
import type { Patient } from '../types';
import { EmptyState, ErrorBanner, Spinner } from '../ui';

export function OdontogramPage() {
  const { user } = useAuth();
  const { sedeId } = useAppData();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .patients(undefined, sedeId || undefined)
      .then((items) => {
        if (cancelled) return;
        setPatients(items);
        setPatientId((current) =>
          items.some((patient) => patient.id === current) ? current : items[0]?.id ?? '',
        );
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
  }, [sedeId]);

  const canEdit = user?.role === 'admin' || user?.role === 'odontologo';

  if (loading) return <Spinner label="Cargando pacientes…" />;
  if (error) return <ErrorBanner message={error} />;

  if (patients.length === 0) {
    return (
      <EmptyState>
        No hay pacientes en esta sede. <Link to="/pacientes">Creá uno</Link> para empezar.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="toolbar toolbar-wrap">
        <label className="field-inline">
          <span>Paciente</span>
          <select
            className="input"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </label>
        <div className="toolbar-actions">
          <span className="hint">Hacé clic en un diente para marcar una condición.</span>
          {patientId && (
            <Link className="link-btn" to={`/pacientes/${patientId}`}>
              Ver ficha →
            </Link>
          )}
        </div>
      </div>

      {patientId && <Odontogram patientId={patientId} canEdit={canEdit} />}
    </>
  );
}
