/**
 * Mascaramento de dados sensíveis — conformidade LGPD.
 * Use em qualquer exibição de dados pessoais ou sensíveis na UI.
 */

/** CPF: oculta 3 primeiros e 2 dígitos finais — ex: ***.456.789-** */
export function maskCPF(cpf: string): string {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11) return '***.***.***.***';
  return `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**`;
}

/** CNPJ: oculta filial e dígitos verificadores — ex: 12.345.xxx/0001-xx */
export function maskCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14) return '**.***/****-**';
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.***/${c.slice(8, 12)}-**`;
}

/** Telefone: oculta dígitos centrais — ex: (11) *****-9999 */
export function maskPhone(phone: string): string {
  const c = phone.replace(/\D/g, '');
  if (c.length >= 11) return `(${c.slice(0, 2)}) *****-${c.slice(-4)}`;
  if (c.length >= 8) return `(${c.slice(0, 2)}) ****-${c.slice(-4)}`;
  return `****-${c.slice(-4)}`;
}

/** E-mail: mostra só a 1ª letra e domínio — ex: u***@email.com */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return '***@***.***';
  const [local, domain] = parts;
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

/** Senha Wi-Fi / credenciais: substitui por bolinhas */
export function maskPassword(value?: string): string {
  if (!value) return '••••••••';
  return '•'.repeat(Math.min(value.length, 12));
}

/** Número de cartão: mantém apenas últimos 4 dígitos */
export function maskCard(card: string): string {
  const c = card.replace(/\D/g, '');
  return `**** **** **** ${c.slice(-4).padStart(4, '*')}`;
}

/** Qualquer string sensível: mantém últimos N chars */
export function maskSensitive(value: string, visibleEnd = 4): string {
  if (!value) return '****';
  if (value.length <= visibleEnd) return '*'.repeat(value.length);
  return '*'.repeat(value.length - visibleEnd) + value.slice(-visibleEnd);
}

/** Endereço IP: oculta último octeto */
export function maskIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  return ip;
}

/** Chave API / token: mostra apenas prefixo de 6 chars */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return `${key.slice(0, 6)}${'*'.repeat(key.length - 6)}`;
}
