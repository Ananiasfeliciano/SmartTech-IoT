/**
 * Sanitização e validação de entrada — prevenção de XSS, SQL Injection e Path Traversal.
 * OWASP Top 10: A03 (Injection) e A07 (XSS).
 *
 * Nota: o React já escapa HTML em JSX. Este módulo serve como camada extra
 * para dados que chegam de fontes externas (imports, APIs) ou que são
 * armazenados como texto puro e depois exibidos fora do React.
 */

/** Escapa caracteres HTML perigosos */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/** Remove tags <script>, atributos de evento e URLs perigosas */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '');
}

/** Verifica se a entrada contém padrões de SQL Injection */
export function hasSQLInjection(input: string): boolean {
  const patterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|SCRIPT)\b|--|;|\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i;
  return patterns.test(input);
}

/** Verifica se a entrada contém padrões de Path Traversal */
export function hasPathTraversal(input: string): boolean {
  // Detecta: ../ ..\  URL-encoded (%2e%2e seguido de / ou %2f) e double-encoded
  return /(\.\.(\/|\\)|%2e%2e(\/|%2f)|%252e%252e%252f)/i.test(input);
}

/** Remove caracteres de controle e null bytes */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x1F\x7F\uFEFF]/g, '');
}

/**
 * Sanitização geral de texto livre (nomes, descrições, observações).
 * Aplica: strip null bytes + trim + limitar tamanho.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  return stripControlChars(input).trim().slice(0, maxLength);
}

/** Valida formato de e-mail (client-side básico) */
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

/** Valida força de senha — mínimo 8 chars, 1 maiúscula, 1 número */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Senha deve ter no mínimo 8 caracteres.';
  if (!/[A-Z]/.test(password)) return 'Senha deve ter ao menos uma letra maiúscula.';
  if (!/[0-9]/.test(password)) return 'Senha deve ter ao menos um número.';
  return null;
}

/** Verifica se extensão de arquivo é perigosa */
export function isDangerousFile(filename: string): boolean {
  const dangerous = /\.(exe|sh|php|js|bat|cmd|scr|jar|py|rb|ps1|vbs|wsf|msi|dll|so|dylib|cgi|pl|asp|aspx)$/i;
  return dangerous.test(filename);
}

/** Valida MIME type de imagem */
export function isAllowedImageMime(mime: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(mime);
}

/** Valida MIME type de documento */
export function isAllowedDocumentMime(mime: string): boolean {
  return [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ].includes(mime);
}

/** Limite de upload: 10 MB */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Valida um arquivo antes de upload */
export function validateUploadFile(file: File, allowedTypes: 'images' | 'documents' | 'both'): string | null {
  if (isDangerousFile(file.name)) return `Tipo de arquivo não permitido: ${file.name}`;
  if (file.size > MAX_UPLOAD_BYTES) return `Arquivo muito grande (máximo ${MAX_UPLOAD_BYTES / 1024 / 1024}MB).`;
  const allowed =
    allowedTypes === 'images'
      ? isAllowedImageMime(file.type)
      : allowedTypes === 'documents'
        ? isAllowedDocumentMime(file.type)
        : isAllowedImageMime(file.type) || isAllowedDocumentMime(file.type);
  if (!allowed) return `Tipo MIME não permitido: ${file.type}`;
  return null;
}
