import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Field } from '../ui';
import { IconBrand } from '../icons';

const DEMO = [
  { role: 'Administración', email: 'admin@sigo.local', password: 'admin123' },
  { role: 'Odontología', email: 'odontologo@sigo.local', password: 'odonto123' },
  { role: 'Recepción', email: 'recepcion@sigo.local', password: 'recepcion123' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@sigo.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="brand brand-login">
          <div className="brand-icon" aria-hidden="true"><IconBrand /></div>
          <div className="brand-text">
            <strong>SIGO<span>Dental</span></strong>
            <small>Gestión odontológica</small>
          </div>
        </div>
        <h1>La clínica, ordenada de punta a punta.</h1>
        <p>
          Pacientes, agenda, odontograma, caja y auditoría sobre una API real en Go,
          con frontend React.
        </p>
        <ul className="login-features">
          <li>Expediente con alertas médicas visibles.</li>
          <li>Odontograma FDI persistido en base de datos.</li>
          <li>Roles de administración, odontología y recepción.</li>
          <li>Auditoría de cada acción sobre los datos.</li>
        </ul>
        <span className="login-stack">React 19 · Go 1.27 · SQLite · JWT</span>
      </section>

      <section className="login-card card">
        <h2>Ingresar</h2>
        <p className="muted">Usá una cuenta de demostración o tus credenciales.</p>

        <form onSubmit={submit} className="form-stack">
          {error && <div className="error-banner">⚠ {error}</div>}
          <Field label="Email" required>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field label="Contraseña" required>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="demo-users">
          <span>Cuentas de demo</span>
          {DEMO.map((item) => (
            <button
              key={item.email}
              type="button"
              className="demo-user"
              onClick={() => {
                setEmail(item.email);
                setPassword(item.password);
                setError('');
              }}
            >
              <strong>{item.role}</strong>
              <small>{item.email}</small>
              <code>{item.password}</code>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
