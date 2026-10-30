import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import { useAuth } from './auth';
import type { Meta } from './types';

const SEDE_KEY = 'sigo.sede';

interface AppDataValue {
  meta: Meta;
  sedeId: string;
  setSedeId: (id: string) => void;
  reloadMeta: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [meta, setMeta] = useState<Meta>({ sedes: [], professionals: [], chairs: [] });
  const [sedeId, setSedeIdState] = useState(() => localStorage.getItem(SEDE_KEY) ?? '');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .meta()
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  function setSedeId(id: string) {
    setSedeIdState(id);
    localStorage.setItem(SEDE_KEY, id);
  }

  async function reloadMeta() {
    const data = await api.meta();
    setMeta(data);
  }

  const value = useMemo(
    () => ({ meta, sedeId, setSedeId, reloadMeta }),
    [meta, sedeId],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData debe usarse dentro de AppDataProvider');
  return ctx;
}
