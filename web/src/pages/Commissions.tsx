import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Commission } from '../types';
import { EmptyState, ErrorBanner, Spinner } from '../ui';

export function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.commissions()
      .then(setCommissions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Cargando comisiones…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <h2>Liquidación de Honorarios</h2>
      {commissions.length === 0 ? (
        <EmptyState>No hay comisiones registradas.</EmptyState>
      ) : (
        <div className="list">
          {commissions.map((comm) => (
            <div key={comm.id} className="list-item">
              <strong>${comm.amount}</strong>
              <span>{comm.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
