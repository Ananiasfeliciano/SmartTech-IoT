import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ModuleConfig, OsRecord } from '../data/osData';
import { logAudit } from '../services/auditService';

/**
 * Hook que sincroniza dados de um módulo com o Firestore em tempo real.
 * Se a coleção estiver vazia, exibe os registros-semente de `module.records`.
 */
export function useFirestoreRecords(module: ModuleConfig) {
  const [records, setRecords] = useState<OsRecord[]>(module.records);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setRecords(module.records); // reset enquanto carrega

    const colRef = collection(db, module.id);
    // Módulos sem campo data usam createdAt como fallback
    const q = query(colRef, orderBy('data', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          setRecords(
            snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<OsRecord, 'id'>),
            }))
          );
        }
        setLoading(false);
      },
      () => {
        // Em caso de erro de permissão, tenta sem orderBy
        const fallbackQ = query(colRef);
        const fallbackUnsub = onSnapshot(
          fallbackQ,
          (snap) => {
            if (!snap.empty) {
              setRecords(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OsRecord, 'id'>) })));
            }
            setLoading(false);
          },
          () => setLoading(false)
        );
        return fallbackUnsub;
      }
    );

    return unsubscribe;
  }, [module.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRecord = useCallback(
    async (data: Omit<OsRecord, 'id'>): Promise<string> => {
      const docRef = await addDoc(collection(db, module.id), {
        ...data,
        valor: Number(data.valor) || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAudit('create', module.id, docRef.id, { titulo: data.titulo, cliente: data.cliente });
      return docRef.id;
    },
    [module.id]
  );

  const updateRecord = useCallback(
    async (id: string, data: Partial<OsRecord>): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = data as OsRecord;
      await updateDoc(doc(db, module.id, id), {
        ...rest,
        valor: Number(rest.valor) || 0,
        updatedAt: serverTimestamp(),
      });
      await logAudit('update', module.id, id, { titulo: data.titulo, status: data.status });
    },
    [module.id]
  );

  const removeRecord = useCallback(
    async (id: string, titulo: string): Promise<void> => {
      await deleteDoc(doc(db, module.id, id));
      await logAudit('delete', module.id, id, { titulo });
    },
    [module.id]
  );

  return { records, loading, addRecord, updateRecord, removeRecord };
}
