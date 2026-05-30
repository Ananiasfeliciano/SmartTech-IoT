/**
 * Rate limiter client-side para proteção contra brute force.
 * Complementa a proteção server-side do Firebase Auth.
 *
 * Regra: 5 tentativas por 15 minutos por chave (e-mail ou IP).
 * Após esgotar: bloqueia por 15 minutos adicionais.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;  // 15 minutos
const BLOCK_MS   = 15 * 60 * 1000;  // bloqueio de 15 minutos
const STORAGE_PREFIX = '__rl_';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function read(key: string): AttemptRecord | null {
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    return raw ? (JSON.parse(raw) as AttemptRecord) : null;
  } catch {
    return null;
  }
}

function write(key: string, record: AttemptRecord): void {
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(record));
  } catch {
    /* sessionStorage indisponível — falha silenciosa */
  }
}

export interface RateLimitStatus {
  blocked: boolean;
  attemptsLeft: number;
  remainingMs: number;
  remainingLabel: string;
}

/** Retorna o status atual de rate limit para a chave dada (e.g., e-mail) */
export function getRateLimitStatus(key: string): RateLimitStatus {
  const rec = read(key);
  const now = Date.now();

  if (!rec) return { blocked: false, attemptsLeft: MAX_ATTEMPTS, remainingMs: 0, remainingLabel: '' };

  // Bloqueio ativo
  if (rec.blockedUntil && now < rec.blockedUntil) {
    const ms = rec.blockedUntil - now;
    return { blocked: true, attemptsLeft: 0, remainingMs: ms, remainingLabel: formatMs(ms) };
  }

  // Janela expirou → limpa
  if (now - rec.firstAttemptAt > WINDOW_MS) {
    clearRateLimit(key);
    return { blocked: false, attemptsLeft: MAX_ATTEMPTS, remainingMs: 0, remainingLabel: '' };
  }

  const left = Math.max(0, MAX_ATTEMPTS - rec.count);
  return { blocked: false, attemptsLeft: left, remainingMs: 0, remainingLabel: '' };
}

/** Registra uma tentativa falha — retorna o status atualizado */
export function recordFailedAttempt(key: string): RateLimitStatus {
  const now = Date.now();
  const rec = read(key);

  let updated: AttemptRecord;

  if (!rec || now - rec.firstAttemptAt > WINDOW_MS) {
    updated = { count: 1, firstAttemptAt: now };
  } else {
    updated = { ...rec, count: rec.count + 1 };
  }

  if (updated.count >= MAX_ATTEMPTS && !updated.blockedUntil) {
    updated.blockedUntil = now + BLOCK_MS;
  }

  write(key, updated);

  if (updated.blockedUntil && now < updated.blockedUntil) {
    const ms = updated.blockedUntil - now;
    return { blocked: true, attemptsLeft: 0, remainingMs: ms, remainingLabel: formatMs(ms) };
  }

  return {
    blocked: false,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - updated.count),
    remainingMs: 0,
    remainingLabel: '',
  };
}

/** Limpa o contador após login bem-sucedido */
export function clearRateLimit(key: string): void {
  try {
    sessionStorage.removeItem(storageKey(key));
  } catch {
    /* silencioso */
  }
}

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}
