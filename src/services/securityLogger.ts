/**
 * Logger de eventos de segurança — OWASP A09 (Security Logging & Monitoring).
 * Grava na coleção `securityLogs` do Firestore.
 *
 * Eventos rastreados:
 *  - login_success / login_failure
 *  - logout
 *  - rate_limit_block
 *  - access_denied
 *  - password_change
 *  - permission_change
 *  - data_export
 *  - suspicious_activity
 *  - upload_rejected
 *  - admin_action
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'rate_limit_block'
  | 'access_denied'
  | 'password_change'
  | 'permission_change'
  | 'data_export'
  | 'suspicious_activity'
  | 'upload_rejected'
  | 'admin_action';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  userEmail?: string;
  module?: string;
  action?: string;
  result: 'success' | 'failure' | 'blocked' | 'alert';
  detail?: string;
  userAgent?: string;
  timestamp?: unknown;
}

async function writeSecurityLog(event: SecurityEvent): Promise<void> {
  try {
    await addDoc(collection(db, 'securityLogs'), {
      ...event,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Nunca falhar a operação principal por causa do log
    console.warn('[SecurityLogger] Falha ao gravar log de segurança');
  }
}

/** Login bem-sucedido */
export function logLoginSuccess(email: string, uid: string): Promise<void> {
  return writeSecurityLog({
    type: 'login_success',
    userId: uid,
    userEmail: email,
    result: 'success',
    detail: `Login realizado com sucesso`,
  });
}

/** Tentativa de login falha */
export function logLoginFailure(email: string, reason: string, attemptsLeft: number): Promise<void> {
  return writeSecurityLog({
    type: 'login_failure',
    userEmail: email,
    result: 'failure',
    detail: `Falha no login: ${reason}. Tentativas restantes: ${attemptsLeft}`,
  });
}

/** Login bloqueado por rate limit */
export function logRateLimitBlock(email: string, remainingLabel: string): Promise<void> {
  return writeSecurityLog({
    type: 'rate_limit_block',
    userEmail: email,
    result: 'blocked',
    detail: `Login bloqueado por excesso de tentativas. Desbloqueia em: ${remainingLabel}`,
  });
}

/** Logout */
export function logLogout(uid: string, email: string, reason: 'user_action' | 'inactivity_timeout' = 'user_action'): Promise<void> {
  return writeSecurityLog({
    type: 'logout',
    userId: uid,
    userEmail: email,
    result: 'success',
    detail: reason === 'inactivity_timeout'
      ? 'Sessão encerrada automaticamente por inatividade (30 min)'
      : 'Sessão encerrada pelo usuário',
  });
}

/** Acesso negado a módulo/ação */
export function logAccessDenied(userId: string, email: string, module: string, action: string): Promise<void> {
  return writeSecurityLog({
    type: 'access_denied',
    userId,
    userEmail: email,
    module,
    action,
    result: 'blocked',
    detail: `Acesso negado: ${action} em ${module}`,
  });
}

/** Alteração de permissão */
export function logPermissionChange(
  adminId: string,
  adminEmail: string,
  targetUserId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  return writeSecurityLog({
    type: 'permission_change',
    userId: adminId,
    userEmail: adminEmail,
    action: 'permission_change',
    result: 'success',
    detail: `Perfil de ${targetUserId} alterado de '${oldRole}' para '${newRole}'`,
  });
}

/** Exportação de dados */
export function logDataExport(userId: string, email: string, module: string, count: number): Promise<void> {
  return writeSecurityLog({
    type: 'data_export',
    userId,
    userEmail: email,
    module,
    action: 'export',
    result: 'success',
    detail: `Exportação de ${count} registros do módulo ${module}`,
  });
}

/** Upload rejeitado */
export function logUploadRejected(userId: string, email: string, filename: string, reason: string): Promise<void> {
  return writeSecurityLog({
    type: 'upload_rejected',
    userId,
    userEmail: email,
    result: 'blocked',
    detail: `Upload rejeitado — arquivo: ${filename}, motivo: ${reason}`,
  });
}

/** Ação administrativa crítica */
export function logAdminAction(
  userId: string,
  email: string,
  action: string,
  module: string,
  recordId?: string
): Promise<void> {
  return writeSecurityLog({
    type: 'admin_action',
    userId,
    userEmail: email,
    module,
    action,
    result: 'success',
    detail: `Ação crítica: ${action}${recordId ? ` — ID: ${recordId}` : ''}`,
  });
}

/** Atividade suspeita genérica */
export function logSuspiciousActivity(description: string, userId?: string, email?: string): Promise<void> {
  return writeSecurityLog({
    type: 'suspicious_activity',
    userId,
    userEmail: email,
    result: 'alert',
    detail: description,
  });
}
