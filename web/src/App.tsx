import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppDataProvider } from './appdata';
import { useAuth } from './auth';
import { Layout } from './Layout';
import { Spinner } from './ui';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { PatientsPage } from './pages/Patients';
import { PatientDetailPage } from './pages/PatientDetail';
import { AgendaPage } from './pages/Agenda';
import { OdontogramPage } from './pages/OdontogramPage';
import { CashPage } from './pages/Cash';
import { AuditPage } from './pages/Audit';
import { UsersPage } from './pages/Users';
import { PeriodontogramPage } from './pages/Periodontogram';
import { SOEPPage } from './pages/SOEP';
import { BudgetsPage } from './pages/Budgets';
import { InventoryPage } from './pages/Inventory';
import { ConsentsPage } from './pages/Consents';
import { CommissionsPage } from './pages/Commissions';
import { ReportsPage } from './pages/Reports';
import { TOTPPage } from './pages/TOTP';
import { NotificationsPage } from './pages/Notifications';
import { InvoicesPage } from './pages/Invoices';
import type { Role } from './types';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Verificando sesión…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <AppDataProvider>
              <Layout />
            </AppDataProvider>
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pacientes" element={<PatientsPage />} />
        <Route path="pacientes/:id" element={<PatientDetailPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route
          path="odontograma"
          element={
            <RoleGate roles={['admin', 'odontologo']}>
              <OdontogramPage />
            </RoleGate>
          }
        />
        <Route
          path="caja"
          element={
            <RoleGate roles={['admin', 'recepcion']}>
              <CashPage />
            </RoleGate>
          }
        />
        <Route
          path="auditoria"
          element={
            <RoleGate roles={['admin']}>
              <AuditPage />
            </RoleGate>
          }
        />
        <Route
          path="usuarios"
          element={
            <RoleGate roles={['admin']}>
              <UsersPage />
            </RoleGate>
          }
        />
        <Route
          path="periodontograma"
          element={
            <RoleGate roles={['admin', 'odontologo']}>
              <PeriodontogramPage />
            </RoleGate>
          }
        />
        <Route
          path="soep"
          element={
            <RoleGate roles={['admin', 'odontologo']}>
              <SOEPPage />
            </RoleGate>
          }
        />
        <Route
          path="presupuestos"
          element={
            <RoleGate roles={['admin', 'odontologo', 'recepcion']}>
              <BudgetsPage />
            </RoleGate>
          }
        />
        <Route
          path="inventario"
          element={
            <RoleGate roles={['admin', 'recepcion']}>
              <InventoryPage />
            </RoleGate>
          }
        />
        <Route
          path="consentimientos"
          element={
            <RoleGate roles={['admin', 'odontologo']}>
              <ConsentsPage />
            </RoleGate>
          }
        />
        <Route
          path="comisiones"
          element={
            <RoleGate roles={['admin']}>
              <CommissionsPage />
            </RoleGate>
          }
        />
        <Route
          path="reportes"
          element={
            <RoleGate roles={['admin']}>
              <ReportsPage />
            </RoleGate>
          }
        />
        <Route
          path="mfa"
          element={
            <RoleGate roles={['admin', 'odontologo', 'recepcion']}>
              <TOTPPage />
            </RoleGate>
          }
        />
        <Route
          path="notificaciones"
          element={
            <RoleGate roles={['admin', 'recepcion']}>
              <NotificationsPage />
            </RoleGate>
          }
        />
        <Route
          path="facturacion"
          element={
            <RoleGate roles={['admin', 'recepcion']}>
              <InvoicesPage />
            </RoleGate>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
