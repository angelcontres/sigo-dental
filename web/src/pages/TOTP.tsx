import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useToast } from '../toast';
import { ErrorBanner, Spinner, Modal, Field } from '../ui';

export function TOTPPage() {
  const [status, setStatus] = useState<{ enabled: boolean; configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingUp, setSettingUp] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [totpData, setTotpData] = useState<{ secret: string; backupCodes: string; enabled: boolean } | null>(null);
  const notify = useToast();

  useEffect(() => {
    setLoading(true);
    api.totpStatus()
      .then(setStatus)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSetup() {
    try {
      const data = await api.totpSetup();
      setTotpData(data);
      setSettingUp(true);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function handleEnable(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const code = (form.elements.namedItem('code') as HTMLInputElement).value;
    
    try {
      await api.totpEnable(code);
      notify('MFA habilitado exitosamente');
      setEnabling(false);
      setSettingUp(false);
      api.totpStatus().then(setStatus);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function handleDisable() {
    try {
      await api.totpDisable();
      notify('MFA deshabilitado');
      api.totpStatus().then(setStatus);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (loading) return <Spinner label="Cargando estado de MFA…" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div>
      <h2>Autenticación de dos factores (MFA)</h2>
      
      {status && (
        <div className="card">
          <p>
            <strong>Estado actual:</strong>{' '}
            {status.enabled ? (
              <span className="badge badge-atendida">Habilitado</span>
            ) : (
              <span className="badge badge-cancelada">Deshabilitado</span>
            )}
          </p>
          
          {!status.enabled && (
            <button type="button" className="btn btn-primary" onClick={handleSetup}>
              Configurar MFA
            </button>
          )}
          
          {status.enabled && (
            <button type="button" className="btn btn-secondary" onClick={handleDisable}>
              Deshabilitar MFA
            </button>
          )}
        </div>
      )}

      {settingUp && totpData && (
        <Modal title="Configurar autenticación de dos factores" onClose={() => setSettingUp(false)}>
          <div className="form-stack">
            <div className="field">
              <label>Secret TOTP</label>
              <code>{totpData.secret}</code>
              <p className="hint">Escanear este código con tu aplicación de autenticación (Google Authenticator, Authy, etc.)</p>
            </div>
            
            <div className="field">
              <label>Códigos de recuperación</label>
              <code>{totpData.backupCodes}</code>
              <p className="hint">Guarda estos códigos en un lugar seguro. Úsalos si pierdes acceso a tu dispositivo.</p>
            </div>
            
            <button type="button" className="btn btn-primary" onClick={() => setEnabling(true)}>
              Verificar y habilitar
            </button>
          </div>
        </Modal>
      )}

      {enabling && (
        <Modal title="Verificar código TOTP" onClose={() => setEnabling(false)}>
          <form className="form-stack" onSubmit={handleEnable}>
            <Field label="Código de 6 dígitos" required>
              <input name="code" type="text" className="input" placeholder="123456" maxLength={6} />
            </Field>
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => setEnabling(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Habilitar MFA
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
