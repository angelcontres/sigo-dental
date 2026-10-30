import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAppData } from '../appdata';
import { useToast } from '../toast';
import type { Closure, Patient, Payment } from '../types';
import { EmptyState, ErrorBanner, Field, Spinner } from '../ui';
import { formatDate, formatDateTime, money, todayISO } from '../utils';

export function CashPage() {
  const { sedeId } = useAppData();
  const notify = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [openCount, setOpenCount] = useState(0);

  const [patientId, setPatientId] = useState('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Efectivo');
  const [saving, setSaving] = useState(false);
  const date = todayISO();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.payments(date),
      api.closures(),
      api.patients(undefined, sedeId || undefined),
      api.cashCount(),
    ])
      .then(([paymentList, closureList, patientList, count]) => {
        if (cancelled) return;
        setPayments(paymentList);
        setClosures(closureList);
        setPatients(patientList);
        setOpenCount(count.count);
        setPatientId((current) =>
          patientList.some((patient) => patient.id === current)
            ? current
            : patientList[0]?.id ?? '',
        );
        setError('');
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

  const openPayments = useMemo(
    () => payments.filter((payment) => !payment.closureId),
    [payments],
  );
  const total = openPayments.reduce((sum, payment) => sum + payment.amount, 0);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!patientId) {
      notify('Elegí un paciente.', 'error');
      return;
    }
    if (!concept.trim()) {
      notify('Escribí un concepto para el cobro.', 'error');
      return;
    }
    if (concept.trim().length > 100) {
      notify('El concepto no puede exceder 100 caracteres.', 'error');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      notify('El monto debe ser mayor a cero.', 'error');
      return;
    }
    if (value > 10000000) {
      notify('El monto no puede exceder $10,000,000.', 'error');
      return;
    }
    if (!method) {
      notify('Elegí un medio de pago.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.createPayment({ patientId, concept, amount: value, method });
      notify('Cobro registrado.');
      setConcept('');
      setAmount('');
      setReloadKey((key) => key + 1);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function closeCash() {
    // RN-02: Cierre ciego - no mostrar el total al recepcionista
    if (!window.confirm(`¿Cerrar la caja con ${openCount} cobros?`)) {
      return;
    }
    try {
      await api.closeCash();
      notify('Caja cerrada correctamente.');
      setReloadKey((key) => key + 1);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando caja…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <>
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Registrar cobro</h2>
          </div>
          <form onSubmit={submit} className="form-grid">
            <Field label="Paciente" required wide>
              <select
                className="input"
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
              >
                {patients.length === 0 && <option value="">Sin pacientes</option>}
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Concepto" required>
              <input
                className="input"
                value={concept}
                placeholder="Consulta, limpieza…"
                onChange={(event) => setConcept(event.target.value)}
              />
            </Field>
            <Field label="Monto" required>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={amount}
                placeholder="15000"
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label="Medio de pago">
              <select
                className="input"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
              </select>
            </Field>
            <button
              type="submit"
              className="btn btn-primary field-wide"
              disabled={saving || patients.length === 0}
            >
              {saving ? 'Registrando…' : 'Registrar cobro'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Caja de hoy</h2>
            <strong className="cash-total">{money(total)}</strong>
          </div>
          {openPayments.length ? (
            <div className="list">
              {openPayments.map((payment) => (
                <div className="list-item" key={payment.id}>
                  <div>
                    <strong>{payment.concept}</strong>
                    <span>
                      {payment.patientName} · {payment.method} · {payment.time}
                    </span>
                  </div>
                  <strong>{money(payment.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No hay cobros abiertos en la caja de hoy.</EmptyState>
          )}
          <button
            type="button"
            className="btn btn-danger btn-block"
            disabled={openPayments.length === 0}
            onClick={closeCash}
            style={{ marginTop: 12 }}
          >
            Cerrar caja
          </button>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Cierres anteriores</h2>
        </div>
        {closures.length ? (
          <div className="list">
            {closures.map((closure) => (
              <div className="list-item" key={closure.id}>
                <div>
                  <strong>{formatDate(closure.date)}</strong>
                  <span>
                    {closure.count} cobros · cerrada por {closure.closedBy} ·{' '}
                    {formatDateTime(closure.closedAt)}
                  </span>
                </div>
                <strong>{money(closure.total)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Todavía no hay cierres de caja.</EmptyState>
        )}
      </section>
    </>
  );
}
