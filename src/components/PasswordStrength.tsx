/**
 * PasswordStrength — indicador visual de força da senha.
 * Critérios: comprimento ≥8, maiúscula, minúscula, número, caractere especial.
 */

import React from 'react';
import { Check, X } from 'lucide-react';

export interface PasswordCriteria {
  length: boolean;       // ≥ 8 caracteres
  uppercase: boolean;    // ao menos 1 maiúscula
  lowercase: boolean;    // ao menos 1 minúscula
  number: boolean;       // ao menos 1 número
  special: boolean;      // ao menos 1 caractere especial
}

export type StrengthLevel = 'fraca' | 'média' | 'forte';

export function evaluatePassword(password: string): { criteria: PasswordCriteria; level: StrengthLevel; score: number } {
  const criteria: PasswordCriteria = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(criteria).filter(Boolean).length;
  const level: StrengthLevel = score <= 2 ? 'fraca' : score <= 4 ? 'média' : 'forte';

  return { criteria, level, score };
}

const LEVEL_CONFIG = {
  fraca:  { color: 'bg-red-500',    label: 'Senha Fraca',  bars: 1 },
  média:  { color: 'bg-amber-500',  label: 'Senha Média',  bars: 3 },
  forte:  { color: 'bg-green-500',  label: 'Senha Forte',  bars: 5 },
};

const CRITERIA_LABELS: Record<keyof PasswordCriteria, string> = {
  length:    'Mínimo 8 caracteres',
  uppercase: 'Letra maiúscula',
  lowercase: 'Letra minúscula',
  number:    'Número',
  special:   'Caractere especial (!@#$...)',
};

interface Props {
  password: string;
  showCriteria?: boolean;
}

export default function PasswordStrength({ password, showCriteria = true }: Props) {
  if (!password) return null;

  const { criteria, level, score } = evaluatePassword(password);
  const cfg = LEVEL_CONFIG[level];

  return (
    <div className="space-y-2">
      {/* Barra de força */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= score ? cfg.color : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <span
          className={`text-xs font-medium ${
            level === 'forte' ? 'text-green-400' : level === 'média' ? 'text-amber-400' : 'text-red-400'
          }`}
        >
          {cfg.label}
        </span>
      </div>

      {/* Lista de critérios */}
      {showCriteria && (
        <ul className="grid grid-cols-2 gap-1">
          {(Object.entries(criteria) as [keyof PasswordCriteria, boolean][]).map(([key, ok]) => (
            <li key={key} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-green-400' : 'text-slate-500'}`}>
              {ok ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
              {CRITERIA_LABELS[key]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
