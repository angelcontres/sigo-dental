import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import type { Role, User } from '../types';
import { EmptyState, ErrorBanner, Field, Modal, Spinner } from '../ui';
import { ROLE_LABEL, formatDate } from '../utils';

export function UsersPage() {
  const notify = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    api
      .users()
      .then((items) => {
        setUsers(items);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <Spinner label="Cargando usuarios…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <>
      <div className="toolbar">
        <p className="muted">
          Los permisos se aplican en la API: recepción no accede a datos clínicos y solo
          administración gestiona usuarios y auditoría.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nuevo usuario
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Alta</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState>No hay usuarios.</EmptyState>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Nombre">
                    <strong>{user.name}</strong>
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Rol">{ROLE_LABEL[user.role] ?? user.role}</td>
                  <td data-label="Estado">
                    <span className={`badge ${user.active ? 'badge-atendida' : 'badge-cancelada'}`}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="Alta">{formatDate(user.createdAt.slice(0, 10))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <UserModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            notify('Usuario creado.');
            load();
          }}
        />
      )}
    </>
  );
}

function UserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('recepcion');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (name.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    if (!email.trim()) {
      setError('El email es obligatorio.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('El email debe ser válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password.length > 50) {
      setError('La contraseña no puede exceder 50 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await api.createUser({ name, email, password, role });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        {error && <div className="error-banner">⚠ {error}</div>}
        <div className="form-grid">
          <Field label="Nombre y apellido" required wide>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </Field>
          <Field label="Email" required wide>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Contraseña" required hint="Mínimo 6 caracteres.">
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Field label="Rol">
            <select className="input" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="recepcion">Recepción</option>
              <option value="odontologo">Odontología</option>
              <option value="admin">Administración</option>
            </select>
          </Field>
        </div>
        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
