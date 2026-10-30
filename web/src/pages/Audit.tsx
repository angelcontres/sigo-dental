import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { AuditEntry } from '../types';
import { EmptyState, ErrorBanner, Spinner } from '../ui';
import { formatDateTime } from '../utils';

const ENTITY_LABEL: Record<string, string> = {
  session: 'Sesión',
  patient: 'Paciente',
  appointment: 'Turno',
  finding: 'Odontograma',
  payment: 'Cobro',
  closure: 'Caja',
  user: 'Usuario',
};

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entity, setEntity] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .audit()
      .then((items) => {
        if (!cancelled) setEntries(items);
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
  }, []);

  const filtered = useMemo(
    () => (entity ? entries.filter((entry) => entry.entity === entity) : entries),
    [entries, entity],
  );

  if (loading) return <Spinner label="Cargando auditoría…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <>
      <div className="toolbar">
        <label className="field-inline">
          <span>Entidad</span>
          <select className="input" value={entity} onChange={(event) => setEntity(event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ENTITY_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className="muted small">{filtered.length} eventos</span>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState>No hay eventos para ese filtro.</EmptyState>
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="Fecha y hora">{formatDateTime(entry.at)}</td>
                  <td data-label="Usuario">{entry.userName || '—'}</td>
                  <td data-label="Acción">
                    <code className="code">{entry.action}</code>
                  </td>
                  <td data-label="Entidad">{ENTITY_LABEL[entry.entity] ?? entry.entity}</td>
                  <td data-label="Detalle">{entry.detail || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
