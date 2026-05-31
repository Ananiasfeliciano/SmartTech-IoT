/**
 * Item 18 — Alertas de Segurança (OWASP A09: Security Logging & Monitoring).
 *
 * Detecta padrões suspeitos nos logs de segurança e gera alertas visuais
 * para o painel admin. Regras:
 *  - 3+ login_failure em 5 min para o mesmo e-mail → alerta brute force
 *  - 2+ access_denied em qualquer módulo em 10 min → alerta acesso forçado
 *  - rate_limit_block → alerta imediato
 *  - suspicious_activity → alerta imediato
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityAlert {
  id?: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  relatedEmail?: string;
  relatedModule?: string;
  resolved: boolean;
  createdAt?: unknown;
}

// ── Regras de detecção ────────────────────────────────────────────────────────
const BRUTE_FORCE_THRESHOLD  = 3;  // logins falhados
const BRUTE_FORCE_WINDOW_MS  = 5 * 60 * 1000;  // 5 minutos
const ACCESS_DENIED_THRESHOLD = 2;
const ACCESS_DENIED_WINDOW_MS = 10 * 60 * 1000;

/** Salva um alerta na coleção securityAlerts */
async function saveAlert(alert: SecurityAlert): Promise<void> {
  try {
    await addDoc(collection(db, 'securityAlerts'), {
      ...alert,
      createdAt: serverTimestamp(),
    });
  } catch {
    console.warn('[SecurityAlerts] Falha ao gravar alerta');
  }
}

/**
 * Verifica brute force para um e-mail específico.
 * Chame esta função após cada logLoginFailure.
 */
export async function checkBruteForce(email: string): Promise<void> {
  try {
    const since = Timestamp.fromMillis(Date.now() - BRUTE_FORCE_WINDOW_MS);
    const q = query(
      collection(db, 'securityLogs'),
      where('type', '==', 'login_failure'),
      where('userEmail', '==', email),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'desc'),
      limit(BRUTE_FORCE_THRESHOLD + 1),
    );
    const snap = await getDocs(q);
    if (snap.size >= BRUTE_FORCE_THRESHOLD) {
      await saveAlert({
        severity: 'critical',
        title: 'Possível Ataque de Brute Force',
        detail: `${snap.size} tentativas de login falhas nos últimos 5 minutos para o e-mail: ${email}`,
        relatedEmail: email,
        resolved: false,
      });
    }
  } catch {
    // Silencioso — nunca bloquear operação principal
  }
}

/**
 * Verifica tentativas repetidas de acesso negado.
 * Chame esta função após cada logAccessDenied.
 */
export async function checkAccessDenied(userId: string, module: string): Promise<void> {
  try {
    const since = Timestamp.fromMillis(Date.now() - ACCESS_DENIED_WINDOW_MS);
    const q = query(
      collection(db, 'securityLogs'),
      where('type', '==', 'access_denied'),
      where('userId', '==', userId),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'desc'),
      limit(ACCESS_DENIED_THRESHOLD + 1),
    );
    const snap = await getDocs(q);
    if (snap.size >= ACCESS_DENIED_THRESHOLD) {
      await saveAlert({
        severity: 'high',
        title: 'Tentativas Repetidas de Acesso Não Autorizado',
        detail: `Usuário ${userId} recebeu ${snap.size} acessos negados nos últimos 10 minutos (módulo: ${module})`,
        relatedModule: module,
        resolved: false,
      });
    }
  } catch {
    // Silencioso
  }
}

/**
 * Cria um alerta imediato para eventos críticos (rate_limit_block, suspicious_activity).
 */
export async function raiseImmediateAlert(
  severity: AlertSeverity,
  title: string,
  detail: string,
  email?: string,
): Promise<void> {
  await saveAlert({ severity, title, detail, relatedEmail: email, resolved: false });
}

/**
 * Hook-like: retorna os últimos alertas não resolvidos (para o dashboard admin).
 * Máx. 20 alertas.
 */
export async function getUnresolvedAlerts(): Promise<SecurityAlert[]> {
  try {
    const q = query(
      collection(db, 'securityAlerts'),
      where('resolved', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SecurityAlert));
  } catch {
    return [];
  }
}
