import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAppData } from '../appdata';
import { EmptyState, ErrorBanner, Spinner, StatusBadge } from '../ui';
import type { Dashboard } from '../types';
import { formatDate, hasAlert, money, todayISO } from '../utils';

export function DashboardPage() {
  const { sedeId } = useAppData();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const date = todayISO();

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    api
      .dashboard(date, sedeId || undefined)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [date, sedeId]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="stats-grid">
        <article className="card stat">
          <span className="stat-label">Pacientes</span>
          <strong className="stat-value">{data.patients}</strong>
          <span className="stat-hint">registrados</span>
        </article>
        <article className="card stat">
          <span className="stat-label">Turnos de hoy</span>
          <strong className="stat-value">{data.appointments}</strong>
          <span className="stat-hint">{data.pending} pendientes</span>
        </article>
        <article className="card stat">
          <span className="stat-label">Cobrado hoy</span>
          <strong className="stat-value">{money(data.collected)}</strong>
          <span className="stat-hint">caja abierta + cerrada</span>
        </article>
        <article className="card stat stat-alert">
          <span className="stat-label">Alertas médicas</span>
          <strong className="stat-value">{data.alertCount}</strong>
          <span className="stat-hint">pacientes con alerta</span>
        </article>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Turnos de hoy</h2>
            <Link className="link-btn" to="/agenda">Ver agenda →</Link>
          </div>
          {data.todayAppointments.length ? (
            <div className="list">
              {data.todayAppointments.map((appointment) => (
                <div className="list-item" key={appointment.id}>
                  <div>
                    <strong>
                      {appointment.time} · {appointment.patientName}
                    </strong>
                    <span>
                      {appointment.professionalName} · {appointment.chairName}
                      {appointment.reason ? ` · ${appointment.reason}` : ''}
                    </span>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No hay turnos para hoy.</EmptyState>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Alertas médicas</h2>
            <span className="pill">{data.alertCount}</span>
          </div>
          {data.alerts.length ? (
            <div className="list">
              {data.alerts.map((patient) => (
                <div className="list-item alert" key={patient.id}>
                  <div>
                    <strong>{patient.name}</strong>
                    <span>⚠ {patient.allergies}</span>
                  </div>
                  <Link className="btn btn-sm btn-secondary" to={`/pacientes/${patient.id}`}>
                    Ver ficha
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Sin alertas médicas registradas.</EmptyState>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Últimos cobros</h2>
          <Link className="link-btn" to="/caja">Ir a caja →</Link>
        </div>
        {data.recentPayments.length ? (
          <div className="list">
            {data.recentPayments.map((payment) => (
              <div className="list-item" key={payment.id}>
                <div>
                  <strong>
                    {payment.concept} · {payment.patientName}
                  </strong>
                  <span>
                    {payment.method} · {payment.time} · {formatDate(payment.date)}
                  </span>
                </div>
                <strong>{money(payment.amount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Todavía no hay cobros registrados.</EmptyState>
        )}
      </section>

      {data.upcoming.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Próximos turnos</h2>
          </div>
          <div className="list">
            {data.upcoming.map((appointment) => (
              <div className="list-item" key={appointment.id}>
                <div>
                  <strong>
                    {formatDate(appointment.date)} {appointment.time} · {appointment.patientName}
                  </strong>
                  <span>
                    {appointment.professionalName}
                    {hasAlert(appointment.patientAllergies)
                      ? ` · ⚠ ${appointment.patientAllergies}`
                      : ''}
                  </span>
                </div>
                <StatusBadge status={appointment.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
