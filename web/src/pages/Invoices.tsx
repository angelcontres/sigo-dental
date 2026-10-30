import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { Invoice } from '../types';
import { EmptyState, ErrorBanner, Spinner } from '../ui';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notify = useToast();

  useEffect(() => {
    setLoading(true);
    api.invoices()
      .then(setInvoices)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleIssue(invoiceId: string) {
    try {
      await api.issueInvoice(invoiceId);
      notify('Factura emitida exitosamente');
      api.invoices().then(setInvoices);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando facturas…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <h2>Facturación Electrónica</h2>
      {invoices.length === 0 ? (
        <EmptyState>No hay facturas registradas.</EmptyState>
      ) : (
        <div className="list">
          {invoices.map((inv) => (
            <div key={inv.id} className="list-item">
              <div>
                <strong>{inv.number}</strong>
                <span>Total: ${inv.total} · {inv.status}</span>
              </div>
              {inv.status === 'draft' && (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => handleIssue(inv.id)}>
                  Emitir
                </button>
              )}
              {inv.status === 'issued' && <span className="badge badge-atendida">Emitida</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
