import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { InventoryItem } from '../types';
import { EmptyState, ErrorBanner, Spinner, Modal, Field } from '../ui';

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const notify = useToast();

  useEffect(() => {
    setLoading(true);
    api.inventory()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      category: (form.elements.namedItem('category') as HTMLInputElement).value,
      stock: parseInt((form.elements.namedItem('stock') as HTMLInputElement).value),
      minStock: parseInt((form.elements.namedItem('minStock') as HTMLInputElement).value),
      unit: (form.elements.namedItem('unit') as HTMLInputElement).value,
    };
    try {
      await api.createInventoryItem(input);
      notify('Ítem creado exitosamente');
      setCreating(false);
      api.inventory().then(setItems);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function handleMovement(e: FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    const form = e.target as HTMLFormElement;
    const input = {
      itemId: selectedItem.id,
      quantity: parseInt((form.elements.namedItem('quantity') as HTMLInputElement).value),
      type: (form.elements.namedItem('type') as HTMLSelectElement).value,
      reason: (form.elements.namedItem('reason') as HTMLInputElement).value,
    };
    try {
      await api.createInventoryMovement(input);
      notify('Movimiento registrado exitosamente');
      setMoving(false);
      setSelectedItem(null);
      api.inventory().then(setItems);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando inventario…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <div className="toolbar">
        <h2>Inventario</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nuevo ítem
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState>No hay ítems en el inventario.</EmptyState>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.category} · Stock: {item.stock} {item.unit} · Mínimo: {item.minStock}
                </span>
              </div>
              {item.stock <= item.minStock && (
                <span className="badge badge-cancelada">Stock bajo</span>
              )}
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setSelectedItem(item); setMoving(true); }}>
                Movimiento
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Nuevo ítem de inventario" onClose={() => setCreating(false)}>
          <form className="form-stack" onSubmit={handleCreate}>
            <Field label="Nombre" required>
              <input name="name" type="text" className="input" placeholder="Resina nanohíbrida" />
            </Field>
            <Field label="Categoría">
              <input name="category" type="text" className="input" placeholder="Materiales dentales" />
            </Field>
            <Field label="Stock inicial" required>
              <input name="stock" type="number" className="input" placeholder="50" />
            </Field>
            <Field label="Stock mínimo" required>
              <input name="minStock" type="number" className="input" placeholder="10" />
            </Field>
            <Field label="Unidad">
              <input name="unit" type="text" className="input" placeholder="unidad" />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Crear
              </button>
            </div>
          </form>
        </Modal>
      )}

      {moving && selectedItem && (
        <Modal title={`Movimiento de ${selectedItem.name}`} onClose={() => setMoving(false)}>
          <form className="form-stack" onSubmit={handleMovement}>
            <Field label="Cantidad" required>
              <input name="quantity" type="number" className="input" placeholder="5" />
            </Field>
            <Field label="Tipo" required>
              <select name="type" className="input">
                <option value="entrada">Entrada (agregar stock)</option>
                <option value="salida">Salida (descargar stock)</option>
              </select>
            </Field>
            <Field label="Motivo" required>
              <input name="reason" type="text" className="input" placeholder="Descargo por procedimiento" />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setMoving(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Registrar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
