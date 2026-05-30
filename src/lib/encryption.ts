/**
 * Criptografia AES-256-GCM usando Web Crypto API (nativa do browser).
 * Usado para campos sensíveis: senhas de Wi-Fi, credenciais de roteadores,
 * tokens de integração, chaves API.
 *
 * A chave de criptografia vem de VITE_ENCRYPTION_KEY no .env
 * (nunca hardcode a chave no código).
 */

const ENC_KEY = import.meta.env.VITE_ENCRYPTION_KEY as string | undefined;
const enc = new TextEncoder();
const dec = new TextDecoder();

/** Importa a chave bruta como CryptoKey para AES-256-GCM */
async function getAesKey(rawKey: string): Promise<CryptoKey> {
  // Deriva 32 bytes a partir da chave string (padding/trim)
  const keyBytes = enc.encode(rawKey.padEnd(32, '\0').slice(0, 32));
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Criptografa um valor de texto com AES-256-GCM.
 * Retorna uma string base64 no formato: iv(12B) + ciphertext.
 */
export async function encryptField(value: string): Promise<string> {
  if (!ENC_KEY) throw new Error('VITE_ENCRYPTION_KEY não está configurada.');
  const key = await getAesKey(ENC_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(value));
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Descriptografa um valor criptografado por `encryptField`.
 */
export async function decryptField(ciphertext: string): Promise<string> {
  if (!ENC_KEY) throw new Error('VITE_ENCRYPTION_KEY não está configurada.');
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await getAesKey(ENC_KEY);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return dec.decode(decrypted);
}

/** Retorna true se a chave de criptografia está configurada */
export function isEncryptionConfigured(): boolean {
  return Boolean(ENC_KEY && ENC_KEY.length >= 16);
}

/** Indicador visual para campo criptografado */
export const ENCRYPTED_PLACEHOLDER = '••••••••••••••••';
