/**
 * Item 22 — Proteção de Ações Administrativas Críticas (OWASP A01: Broken Access Control).
 *
 * Modal de confirmação explícita para ações irreversíveis:
 *  - Deletar registros
 *  - Alterar perfil/permissão de usuário
 *  - Exportar dados sensíveis
 *  - Resetar configurações
 *
 * Uso:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Excluir cliente"
 *     description={`Tem certeza que deseja excluir "${record.titulo}"? Esta ação é irreversível.`}
 *     confirmLabel="Excluir"
 *     variant="danger"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */

import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  icon: React.ReactNode;
  iconBg: string;
  confirmBg: string;
  confirmHover: string;
}> = {
  danger: {
    icon: <Trash2 size={22} />,
    iconBg: 'bg-red-500/15 text-red-400',
    confirmBg: 'bg-red-600',
    confirmHover: 'hover:bg-red-700',
  },
  warning: {
    icon: <AlertTriangle size={22} />,
    iconBg: 'bg-amber-500/15 text-amber-400',
    confirmBg: 'bg-amber-600',
    confirmHover: 'hover:bg-amber-700',
  },
  info: {
    icon: <Info size={22} />,
    iconBg: 'bg-blue-500/15 text-blue-400',
    confirmBg: 'bg-blue-600',
    confirmHover: 'hover:bg-blue-700',
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1526] p-6 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Close */}
            <button
              onClick={onCancel}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            {/* Icon + title */}
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
                {cfg.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${cfg.confirmBg} ${cfg.confirmHover}`}
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
