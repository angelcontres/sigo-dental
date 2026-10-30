import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Notification as NotificationType } from '../types';
import { EmptyState, ErrorBanner, Spinner } from '../ui';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.notifications()
      .then(setNotifications)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Cargando notificaciones…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <h2>Notificaciones</h2>
      {notifications.length === 0 ? (
        <EmptyState>No hay notificaciones registradas.</EmptyState>
      ) : (
        <div className="list">
          {notifications.map((n) => (
            <div key={n.id} className="list-item">
              <div>
                <strong>{n.type}</strong>
                <span>{n.channel} · {n.scheduledAt}</span>
              </div>
              <span className={`badge badge-${n.status === 'sent' ? 'atendida' : 'programada'}`}>
                {n.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
