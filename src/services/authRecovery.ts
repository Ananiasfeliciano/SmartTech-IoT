/**
 * Serviço de Recuperação de Acesso — OWASP A07 (Identification & Authentication Failures)
 *
 * Funcionalidades:
 *  - requestPasswordReset   → envia e-mail de recuperação de senha (anti-enumeração)
 *  - verifyResetToken       → valida oobCode do link no e-mail
 *  - applyPasswordReset     → aplica nova senha e invalida sessões
 *  - requestUserRecovery    → busca conta por e-mail ou telefone (anti-enumeração)
 *  - checkResetRateLimit    → 5 solicitações por 15 min por e-mail
 *
 * Segurança:
 *  - Anti-enumeração: sempre retorna a mesma mensagem de sucesso
 *  - Rate limit separado do login (sessionStorage)
 *  - Logs de auditoria em `passwordResets` no Firestore
 *  - Token gerenciado pelo Firebase Auth (não armazenado em Firestore)
 */

import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset as fbConfirmPasswordReset,
  type ActionCodeSettings,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// ── Rate limit constants ───────────────────────────────────────────────────
const RESET_MAX     = 5;
const RESET_WINDOW  = 15 * 60 * 1000; // 15 min
const STORAGE_KEY   = '__pwr_';       // password_reset rate limit prefix

interface ResetRecord {
  count: number;
  firstAt: number;
  blockedUntil?: number;
}

// ── Rate limit helpers ─────────────────────────────────────────────────────
function readRecord(email: string): ResetRecord | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}${email}`);
    return raw ? (JSON.parse(raw) as ResetRecord) : null;
  } catch { return null; }
}

function writeRecord(email: string, rec: ResetRecord): void {
  try { sessionStorage.setItem(`${STORAGE_KEY}${email}`, JSON.stringify(rec)); } catch {/* ignore */}
}

function formatMs(ms: number): string {
  const m = Math.ceil(ms / 60000);
  return `${m} min`;
}

export interface ResetRateStatus {
  blocked: boolean;
  remaining: number;
  label: string;
}

/** Retorna o status atual de rate limit para o e-mail dado */
export function checkResetRateLimit(email: string): ResetRateStatus {
  const key = email.toLowerCase().trim();
  const rec = readRecord(key);
  const now = Date.now();

  if (!rec) return { blocked: false, remaining: RESET_MAX, label: '' };

  if (rec.blockedUntil && now < rec.blockedUntil) {
    return { blocked: true, remaining: 0, label: formatMs(rec.blockedUntil - now) };
  }

  if (now - rec.firstAt > RESET_WINDOW) {
    sessionStorage.removeItem(`${STORAGE_KEY}${key}`);
    return { blocked: false, remaining: RESET_MAX, label: '' };
  }

  return { blocked: false, remaining: Math.max(0, RESET_MAX - rec.count), label: '' };
}

function incrementResetAttempt(email: string): void {
  const key = email.toLowerCase().trim();
  const rec = readRecord(key);
  const now = Date.now();

  if (!rec || now - rec.firstAt > RESET_WINDOW) {
    writeRecord(key, { count: 1, firstAt: now });
    return;
  }

  const next = rec.count + 1;
  writeRecord(key, {
    ...rec,
    count: next,
    ...(next >= RESET_MAX ? { blockedUntil: now + RESET_WINDOW } : {}),
  });
}

// ── Audit helper ───────────────────────────────────────────────────────────
async function auditLog(data: Record<string, unknown>): Promise<void> {
  try {
    await addDoc(collection(db, 'passwordResets'), {
      ...data,
      requestedAt: serverTimestamp(),
      userAgent: navigator.userAgent,
    });
  } catch {/* nunca falhar a operação principal */}
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Solicita redefinição de senha.
 * ANTI-ENUMERAÇÃO: nunca diferencia "e-mail encontrado" de "não encontrado".
 * Sempre retorna sem lançar — a mensagem exibida é sempre a genérica.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();

  incrementResetAttempt(normalized);

  const actionCodeSettings: ActionCodeSettings = {
    // Firebase redirecionará para esta URL após o usuário clicar no link
    // Configure em Firebase Console → Auth → Templates → Action URL
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: false,
  };

  try {
    await sendPasswordResetEmail(auth, normalized, actionCodeSettings);
    await auditLog({ type: 'password_reset_request', email: normalized, status: 'sent' });
  } catch (err) {
    // Anti-enumeração: log interno + swallow error
    const code = (err as { code?: string })?.code ?? 'unknown';
    await auditLog({ type: 'password_reset_request', email: normalized, status: 'failed', reason: code });
    // NÃO relançar — cliente sempre vê a mesma mensagem
  }
}

export type VerifyResult =
  | { valid: true; email: string }
  | { valid: false; error: 'token_expired' | 'token_invalid' };

/** Verifica se o oobCode do link é válido e não expirou. Retorna o e-mail associado. */
export async function verifyResetToken(oobCode: string): Promise<VerifyResult> {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { valid: true, email };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    await auditLog({ type: 'token_verify', oobCodePrefix: oobCode.slice(0, 8), status: code });
    if (code === 'auth/expired-action-code') return { valid: false, error: 'token_expired' };
    return { valid: false, error: 'token_invalid' };
  }
}

export type ApplyResult =
  | { success: true }
  | { success: false; error: 'token_expired' | 'token_invalid' | 'weak_password' | string };

/**
 * Aplica a nova senha.
 * Firebase invalida o token e encerra todas as sessões ativas automaticamente.
 */
export async function applyPasswordReset(
  oobCode: string,
  newPassword: string,
  email: string,
): Promise<ApplyResult> {
  try {
    await fbConfirmPasswordReset(auth, oobCode, newPassword);
    await auditLog({ type: 'password_reset_success', email, status: 'success' });
    return { success: true };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    await auditLog({ type: 'password_reset_failed', email, status: 'failed', reason: code });
    if (code === 'auth/expired-action-code') return { success: false, error: 'token_expired' };
    if (code === 'auth/invalid-action-code') return { success: false, error: 'token_invalid' };
    if (code === 'auth/weak-password') return { success: false, error: 'weak_password' };
    return { success: false, error: (err as Error)?.message ?? 'unknown' };
  }
}

export type RecoveryResult = { queued: true };

/**
 * Busca conta por e-mail ou telefone e registra solicitação.
 * ANTI-ENUMERAÇÃO: sempre retorna sucesso.
 * Em produção, a notificação deve ser enviada por uma Cloud Function.
 */
export async function requestUserRecovery(
  searchValue: string,
  type: 'email' | 'phone',
): Promise<RecoveryResult> {
  try {
    const normalized = searchValue.toLowerCase().trim();
    const field = type === 'email' ? 'email' : 'phone';
    const q = query(collection(db, 'users'), where(field, '==', normalized), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const u = snap.docs[0].data() as { name?: string; email?: string };
      await auditLog({
        type: 'user_recovery_request',
        searchType: type,
        // Não gravar o valor de busca inteiro — apenas os 3 primeiros chars (privacy)
        searchHint: normalized.slice(0, 3) + '***',
        userName: u.name ?? '—',
        status: 'found',
      });
    } else {
      await auditLog({
        type: 'user_recovery_request',
        searchType: type,
        searchHint: normalized.slice(0, 3) + '***',
        status: 'not_found',
      });
    }
  } catch {/* Anti-enumeração — fail silently */}

  return { queued: true };
}
