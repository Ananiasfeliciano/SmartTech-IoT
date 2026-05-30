import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export async function logAudit(
  action: 'create' | 'update' | 'delete',
  module: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,
      module,
      recordId,
      userId: auth.currentUser?.uid ?? 'unknown',
      userEmail: auth.currentUser?.email ?? 'unknown',
      timestamp: serverTimestamp(),
      data: JSON.stringify(data).slice(0, 1000),
    });
  } catch {
    // Não falhar a operação principal se o log de auditoria falhar
  }
}
