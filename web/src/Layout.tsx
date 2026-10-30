import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppData } from './appdata';
import { useAuth } from './auth';
import { ROLE_LABEL, initials, todayISO, formatLongDate } from './utils';
import {
  IconDashboard,
  IconPatients,
  IconAgenda,
  IconTooth,
  IconCash,
  IconAudit,
  IconUsers,
  IconBrand,
  IconClipboard,
  IconFileCheck,
  IconBudget,
  IconBox,
  IconInvoice,
  IconPercentage,
  IconBell,
  IconShield,
  IconPeriodontal,
  IconReport,
} from './icons';
import type { Role } from './types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Clínica',
    items: [
      { to: '/', label: 'Panel', icon: <IconDashboard />, roles: ['admin', 'odontologo', 'recepcion'] },
      { to: '/pacientes', label: 'Pacientes', icon: <IconPatients />, roles: ['admin', 'odontologo', 'recepcion'] },
      { to: '/agenda', label: 'Agenda', icon: <IconAgenda />, roles: ['admin', 'odontologo', 'recepcion'] },
      { to: '/odontograma', label: 'Odontograma', icon: <IconTooth />, roles: ['admin', 'odontologo'] },
      { to: '/periodontograma', label: 'Periodontograma', icon: <IconPeriodontal />, roles: ['admin', 'odontologo'] },
      { to: '/soep', label: 'Notas SOEP', icon: <IconClipboard />, roles: ['admin', 'odontologo'] },
      { to: '/consentimientos', label: 'Consentimientos', icon: <IconFileCheck />, roles: ['admin', 'odontologo'] },
    ],
  },
  {
    group: 'Administración',
    items: [
      { to: '/caja', label: 'Caja', icon: <IconCash />, roles: ['admin', 'recepcion'] },
      { to: '/presupuestos', label: 'Presupuestos', icon: <IconBudget />, roles: ['admin', 'odontologo', 'recepcion'] },
      { to: '/inventario', label: 'Inventario', icon: <IconBox />, roles: ['admin', 'recepcion'] },
      { to: '/facturacion', label: 'Facturación', icon: <IconInvoice />, roles: ['admin', 'recepcion'] },
      { to: '/comisiones', label: 'Comisiones', icon: <IconPercentage />, roles: ['admin'] },
      { to: '/reportes', label: 'Reportes', icon: <IconReport />, roles: ['admin'] },
      { to: '/notificaciones', label: 'Notificaciones', icon: <IconBell />, roles: ['admin', 'recepcion'] },
      { to: '/auditoria', label: 'Auditoría', icon: <IconAudit />, roles: ['admin'] },
      { to: '/usuarios', label: 'Usuarios', icon: <IconUsers />, roles: ['admin'] },
      { to: '/mfa', label: 'MFA / Seguridad', icon: <IconShield />, roles: ['admin', 'odontologo', 'recepcion'] },
    ],
  },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Panel', subtitle: 'Resumen del día' },
  '/pacientes': { title: 'Pacientes', subtitle: 'Fichas, alertas y acceso al odontograma' },
  '/agenda': { title: 'Agenda', subtitle: 'Turnos y estados de atención' },
  '/odontograma': { title: 'Odontograma', subtitle: 'Hallazgos por pieza dental' },
  '/periodontograma': { title: 'Periodontograma', subtitle: 'Sondaje y evaluación periodontal' },
  '/soep': { title: 'Notas SOEP', subtitle: 'Registro clínico de evolución (S-O-E-P)' },
  '/consentimientos': { title: 'Consentimientos', subtitle: 'Consentimientos informados y firma digital' },
  '/caja': { title: 'Caja', subtitle: 'Cobros y cierre ciego del día' },
  '/presupuestos': { title: 'Presupuestos', subtitle: 'Planes de tratamiento por fases y presupuestos' },
  '/inventario': { title: 'Inventario', subtitle: 'Control de insumos, stock y movimientos' },
  '/facturacion': { title: 'Facturación', subtitle: 'Comprobantes y facturación electrónica' },
  '/comisiones': { title: 'Comisiones', subtitle: 'Liquidación de honorarios profesionales' },
  '/reportes': { title: 'Reportes', subtitle: 'Métricas operativas, financieras y producción' },
  '/notificaciones': { title: 'Notificaciones', subtitle: 'Recordatorios automáticos y avisos' },
  '/auditoria': { title: 'Auditoría', subtitle: 'Trazabilidad y registro inmutable de acciones' },
  '/usuarios': { title: 'Usuarios', subtitle: 'Equipo de profesionales y roles de acceso' },
  '/mfa': { title: 'MFA / Seguridad', subtitle: 'Autenticación en dos pasos (TOTP)' },
};

export function Layout() {
  const { user, logout } = useAuth();
  const { meta, sedeId, setSedeId } = useAppData();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith('/pacientes/')
      ? { title: 'Ficha del paciente', subtitle: 'Datos, odontograma y turnos' }
      : TITLES['/']);

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <div 
          className="modal-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
          style={{ zIndex: 40 }}
        />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon" aria-hidden="true"><IconBrand /></div>
          <div className="brand-text">
            <strong>SIGO<span>Dental</span></strong>
            <small>React + Go</small>
          </div>
        </div>

        <nav className="nav" aria-label="Navegación principal" role="navigation">
          {NAV.map((group) => {
            const items = group.items.filter((item) => item.roles.includes(user.role));
            if (!items.length) return null;
            return (
              <div className="nav-group" key={group.group}>
                <span className="nav-group-title">{group.group}</span>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{ROLE_LABEL[user.role]}</small>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button 
            type="button" 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="page-heading">
            <h1>{title.title}</h1>
            <p>{title.subtitle}</p>
          </div>
          <div className="topbar-actions">
            <span className="today">{formatLongDate(todayISO())}</span>
            {meta.sedes.length > 1 && (
              <label className="sede-select">
                <span>Sede</span>
                <select
                  className="input input-sm"
                  value={sedeId}
                  onChange={(event) => setSedeId(event.target.value)}
                >
                  <option value="">Todas las sedes</option>
                  {meta.sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
