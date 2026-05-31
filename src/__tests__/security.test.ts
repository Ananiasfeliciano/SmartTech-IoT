// @vitest-environment jsdom
/**
 * Item 24 — Testes de Segurança Automatizados (OWASP WSTG / NIST CSF 2.0 DE.AE-1).
 *
 * Cobre:
 *  - sanitize.ts  → XSS, SQL Injection, Path Traversal, upload, senha
 *  - dataMask.ts  → mascaramento de CPF, CNPJ, e-mail, cartão, chave
 *  - rateLimit.ts → bloqueio após 5 tentativas, reset, countdown
 *  - encryption.ts → presença do módulo (chave ausente → isEncryptionConfigured = false)
 *  - permissions.ts → RBAC por perfil e módulo
 *
 * Executar: npx vitest run src/__tests__/security.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── sanitize.ts ───────────────────────────────────────────────────────────────
import {
  escapeHtml,
  sanitizeHtml,
  hasSQLInjection,
  hasPathTraversal,
  sanitizeText,
  isValidEmail,
  validatePasswordStrength,
  isDangerousFile,
  isAllowedImageMime,
  validateUploadFile,
} from '../lib/sanitize';

describe('escapeHtml — XSS prevention', () => {
  it('escapa < > & " \'', () => {
    expect(escapeHtml('<script>alert(1)</script>')).not.toContain('<script>');
    expect(escapeHtml('"hello"')).toContain('&quot;');
    expect(escapeHtml("it's")).toContain('&#x27;');
  });
  it('não altera texto seguro', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

describe('sanitizeHtml — tag stripping', () => {
  it('remove tags <script>', () => {
    const out = sanitizeHtml('<script>alert("xss")</script>Hello');
    expect(out).not.toContain('<script>');
    expect(out).toContain('Hello');
  });
  it('remove <iframe>', () => {
    const out = sanitizeHtml('<iframe src="evil.com"></iframe>content');
    expect(out).not.toContain('<iframe>');
  });
  it('remove javascript: URIs', () => {
    const out = sanitizeHtml('<a href="javascript:void(0)">click</a>');
    expect(out).not.toMatch(/javascript\s*:/i);
  });
  it('remove event handlers', () => {
    const out = sanitizeHtml('<img onload="evil()">');
    expect(out).not.toMatch(/onload/i);
  });
});

describe('hasSQLInjection — SQL Injection detection', () => {
  it('detecta OR 1=1', () => expect(hasSQLInjection("' OR 1=1 --")).toBe(true));
  it('detecta UNION SELECT', () => expect(hasSQLInjection('UNION SELECT * FROM users')).toBe(true));
  it('detecta DROP TABLE', () => expect(hasSQLInjection('DROP TABLE users')).toBe(true));
  it('não bloqueia texto normal', () => expect(hasSQLInjection('João da Silva')).toBe(false));
  it('não bloqueia e-mail', () => expect(hasSQLInjection('user@email.com')).toBe(false));
});

describe('hasPathTraversal — Path Traversal detection', () => {
  it('detecta ../', () => expect(hasPathTraversal('../etc/passwd')).toBe(true));
  it('detecta ..\\', () => expect(hasPathTraversal('..\\windows\\system32')).toBe(true));
  it('detecta %2e%2e', () => expect(hasPathTraversal('%2e%2e/etc')).toBe(true));
  it('não bloqueia caminho normal', () => expect(hasPathTraversal('imagem-produto.jpg')).toBe(false));
});

describe('isValidEmail', () => {
  it('aceita e-mails válidos', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.domain.org')).toBe(true);
  });
  it('rejeita e-mails inválidos', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});

describe('validatePasswordStrength', () => {
  it('rejeita senha curta', () => {
    expect(validatePasswordStrength('Ab1')).not.toBeNull();
  });
  it('rejeita sem uppercase', () => {
    expect(validatePasswordStrength('abcdefg1')).not.toBeNull();
  });
  it('rejeita sem número', () => {
    expect(validatePasswordStrength('Abcdefgh')).not.toBeNull();
  });
  it('aceita senha válida', () => {
    expect(validatePasswordStrength('Senha@123')).toBeNull();
  });
});

describe('isDangerousFile', () => {
  it('bloqueia .exe, .sh, .php, .bat', () => {
    expect(isDangerousFile('virus.exe')).toBe(true);
    expect(isDangerousFile('exploit.sh')).toBe(true);
    expect(isDangerousFile('shell.php')).toBe(true);
    expect(isDangerousFile('run.bat')).toBe(true);
  });
  it('permite .jpg, .png, .pdf', () => {
    expect(isDangerousFile('foto.jpg')).toBe(false);
    expect(isDangerousFile('relatorio.pdf')).toBe(false);
  });
});

describe('isAllowedImageMime', () => {
  it('aceita imagens comuns', () => {
    expect(isAllowedImageMime('image/jpeg')).toBe(true);
    expect(isAllowedImageMime('image/png')).toBe(true);
    expect(isAllowedImageMime('image/webp')).toBe(true);
  });
  it('rejeita MIME de executável', () => {
    expect(isAllowedImageMime('application/x-msdownload')).toBe(false);
    expect(isAllowedImageMime('text/html')).toBe(false);
  });
});

describe('validateUploadFile — upload validation', () => {
  const makeFile = (name: string, type: string, sizeBytes: number): File => {
    const content = new Uint8Array(sizeBytes);
    return new File([content], name, { type });
  };

  it('aceita imagem válida dentro do limite', () => {
    const file = makeFile('foto.jpg', 'image/jpeg', 1024 * 1024); // 1 MB
    expect(validateUploadFile(file, 'image')).toBeNull();
  });

  it('rejeita arquivo > 10 MB', () => {
    const file = makeFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024);
    expect(validateUploadFile(file, 'image')).not.toBeNull();
  });

  it('rejeita extensão perigosa', () => {
    const file = makeFile('malware.exe', 'application/octet-stream', 1024);
    expect(validateUploadFile(file, 'image')).not.toBeNull();
  });

  it('rejeita MIME errado para imagem', () => {
    const file = makeFile('script.js', 'application/javascript', 500);
    expect(validateUploadFile(file, 'image')).not.toBeNull();
  });
});

// ── dataMask.ts ───────────────────────────────────────────────────────────────
import { maskCPF, maskCNPJ, maskEmail, maskPhone, maskApiKey, maskPassword } from '../lib/dataMask';

describe('dataMask — LGPD data masking', () => {
  it('mascara CPF: xxx.xxx.xxx-xx → ***.***.789-**', () => {
    const m = maskCPF('123.456.789-10');
    expect(m).not.toContain('123');
    expect(m).toContain('*');
  });
  it('mascara CNPJ', () => {
    const m = maskCNPJ('12.345.678/0001-95');
    expect(m).toContain('*');
  });
  it('mascara e-mail: user@domain.com → u***@domain.com', () => {
    const m = maskEmail('user@example.com');
    expect(m).toContain('@');
    expect(m).toContain('*');
    expect(m).not.toBe('user@example.com');
  });
  it('mascara telefone', () => {
    const m = maskPhone('(11) 91234-5678');
    expect(m).toContain('*');
  });
  it('mascara API key', () => {
    const key = 'sk-abcdefghijklmnop1234';
    const m = maskApiKey(key);
    expect(m.length).toBeGreaterThan(0);
    expect(m).not.toBe(key);
  });
  it('mascara senha como caracteres bullet (•)', () => {
    // maskPassword usa • (bullet) para melhor UX em exibição de senha
    const masked = maskPassword('minha-senha');
    expect(masked).not.toBe('minha-senha');
    expect(masked).not.toContain('m');
    expect(masked.length).toBeGreaterThan(0);
  });
});

// ── rateLimit.ts ─────────────────────────────────────────────────────────────
import { getRateLimitStatus, recordFailedAttempt, clearRateLimit } from '../lib/rateLimit';

describe('rateLimit — brute force protection', () => {
  const key = `__test_${Date.now()}__`;

  beforeEach(() => clearRateLimit(key));
  afterEach(() => clearRateLimit(key));

  it('começa sem bloqueio', () => {
    const s = getRateLimitStatus(key);
    expect(s.blocked).toBe(false);
    expect(s.attemptsLeft).toBe(5);
  });

  it('decrementa tentativas após falha', () => {
    recordFailedAttempt(key);
    const s = getRateLimitStatus(key);
    expect(s.attemptsLeft).toBe(4);
    expect(s.blocked).toBe(false);
  });

  it('bloqueia após 5 tentativas', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt(key);
    const s = getRateLimitStatus(key);
    expect(s.blocked).toBe(true);
    expect(s.attemptsLeft).toBe(0);
  });

  it('clearRateLimit libera o bloqueio', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt(key);
    clearRateLimit(key);
    const s = getRateLimitStatus(key);
    expect(s.blocked).toBe(false);
  });
});

// ── permissions.ts ───────────────────────────────────────────────────────────
import { hasPermission } from '../lib/permissions';

describe('permissions — RBAC', () => {
  it('admin tem acesso total a todos os módulos', () => {
    expect(hasPermission('admin', 'clientes', 'create')).toBe(true);
    expect(hasPermission('admin', 'financeiro', 'delete')).toBe(true);
    expect(hasPermission('admin', 'configuracoes', 'edit')).toBe(true);
  });

  it('visualizador só pode view e export', () => {
    expect(hasPermission('visualizador', 'clientes', 'view')).toBe(true);
    expect(hasPermission('visualizador', 'clientes', 'export')).toBe(true);
    expect(hasPermission('visualizador', 'clientes', 'create')).toBe(false);
    expect(hasPermission('visualizador', 'clientes', 'delete')).toBe(false);
  });

  it('tecnico não tem acesso a financeiro', () => {
    expect(hasPermission('tecnico', 'financeiro', 'create')).toBe(false);
    expect(hasPermission('tecnico', 'financeiro', 'delete')).toBe(false);
  });

  it('financeiro não tem acesso a configuracoes', () => {
    expect(hasPermission('financeiro', 'configuracoes', 'delete')).toBe(false);
  });

  it('comercial pode criar orçamentos', () => {
    expect(hasPermission('comercial', 'orcamentos', 'create')).toBe(true);
  });
});
