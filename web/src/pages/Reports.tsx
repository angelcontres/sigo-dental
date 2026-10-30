import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAppData } from '../appdata';
import type { ReportsSummary } from '../types';
import { EmptyState, ErrorBanner, Field, Spinner } from '../ui';
import { todayISO } from '../utils';

export function ReportsPage() {
  const { meta, sedeId } = useAppData();
  const [selectedSede, setSelectedSede] = useState(sedeId || '');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().substring(0, 10);
  });
  const [to, setTo] = useState(todayISO());

  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .reportsSummary(from, to, selectedSede || undefined)
      .then((data) => {
        setSummary(data);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [from, to, selectedSede]);

  function exportCSV() {
    if (!summary) return;
    let csv = 'Reporte Operativo y Financiero - SIGO Dental\n';
    csv += `Período: ${summary.from} a ${summary.to}\n\n`;

    csv += '--- RESUMEN GENERAL ---\n';
    csv += `Total Cobrado,$${summary.totalRevenue}\n`;
    csv += `Total Pagos Registrados,${summary.totalPayments}\n`;
    csv += `Nuevos Pacientes,${summary.newPatientsCount}\n\n`;

    csv += '--- PRODUCCIÓN POR PROFESIONAL ---\n';
    csv += 'Profesional,Turnos Realizados,Monto Total\n';
    summary.productionByProfessional.forEach((p) => {
      csv += `"${p.professionalName}",${p.appointments},$${p.totalBilled}\n`;
    });
    csv += '\n';

    csv += '--- INGRESOS POR MEDIO DE PAGO ---\n';
    csv += 'Medio de Pago,Monto Total\n';
    summary.revenueByMethod.forEach((m) => {
      csv += `"${m.name}",$${m.value}\n`;
    });
    csv += '\n';

    csv += '--- CITAS POR ESTADO ---\n';
    csv += 'Estado,Cantidad\n';
    summary.appointmentsByStatus.forEach((s) => {
      csv += `"${s.name}",${s.value}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_sigo_${summary.from}_${summary.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div>
      <div className="toolbar toolbar-wrap">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Desde">
            <input
              type="date"
              className="input input-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              className="input input-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field label="Sede">
            <select
              className="input input-sm"
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
            >
              <option value="">Todas las sedes</option>
              {meta.sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <span className="spacer" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            🖨 Imprimir
          </button>
          <button type="button" className="btn btn-primary" onClick={exportCSV} disabled={!summary}>
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Calculando reportes operativos y financieros…" />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !summary ? (
        <EmptyState>No se generaron datos para el rango seleccionado.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tarjetas de indicadores */}
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="muted small">Total Ingresos Cobrados</span>
              <strong style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>
                ${summary.totalRevenue.toLocaleString()}
              </strong>
              <span className="small muted">{summary.totalPayments} pagos registrados</span>
            </div>
            <div className="card stat-card">
              <span className="muted small">Nuevos Pacientes Registrados</span>
              <strong style={{ fontSize: '1.75rem' }}>{summary.newPatientsCount}</strong>
              <span className="small muted">En el período seleccionado</span>
            </div>
            <div className="card stat-card">
              <span className="muted small">Profesionales con Actividad</span>
              <strong style={{ fontSize: '1.75rem' }}>
                {summary.productionByProfessional.filter((p) => p.appointments > 0).length}
              </strong>
              <span className="small muted">de {summary.productionByProfessional.length} registrados</span>
            </div>
          </div>

          <div className="grid grid-2">
            {/* Producción por profesional */}
            <section className="card">
              <h3>Producción por Profesional</h3>
              <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Profesional</th>
                      <th>Citas</th>
                      <th>Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.productionByProfessional.map((p) => (
                      <tr key={p.professionalId}>
                        <td>
                          <strong>{p.professionalName}</strong>
                        </td>
                        <td>{p.appointments}</td>
                        <td>
                          <strong>${p.totalBilled.toLocaleString()}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Ingresos por medio de pago */}
            <section className="card">
              <h3>Ingresos por Medio de Pago</h3>
              <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Medio de Pago</th>
                      <th>Total Cobrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.revenueByMethod.length === 0 ? (
                      <tr>
                        <td colSpan={2}>
                          <span className="muted">Sin cobros en el período</span>
                        </td>
                      </tr>
                    ) : (
                      summary.revenueByMethod.map((m) => (
                        <tr key={m.name}>
                          <td>
                            <strong>{m.name}</strong>
                          </td>
                          <td>
                            <strong>${m.value.toLocaleString()}</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Citas por estado */}
          <section className="card">
            <h3>Distribución de Citas y Asistencia</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {summary.appointmentsByStatus.map((s) => (
                <div
                  key={s.name}
                  style={{
                    flex: '1 1 180px',
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span className="muted small">{s.name}</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
