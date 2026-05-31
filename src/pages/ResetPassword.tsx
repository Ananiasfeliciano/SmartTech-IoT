import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { evaluatePassword } from '../components/PasswordStrength';
import PasswordStrength from '../components/PasswordStrength';
import { applyPasswordReset, verifyResetToken } from '../services/authRecovery';

type PageState = 'verifying' | 'form' | 'success' | 'expired' | 'invalid';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const oobCode = params.get('oobCode') ?? '';
  const mode    = params.get('mode') ?? '';

  const [state, setState]         = useState<PageState>('verifying');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  // ── Verificar token ao montar ────────────────────────────────────────────
  useEffect(() => {
    if (!oobCode || mode !== 'resetPassword') {
      setState('invalid');
      return;
    }

    verifyResetToken(oobCode).then((result) => {
      if (result.valid) {
        setUserEmail(result.email);
        setState('form');
      } else {
        setState((result as { valid: false; error: string }).error === 'token_expired' ? 'expired' : 'invalid');
      }
    });
  }, [oobCode, mode]);

  // ── Validação de senha ───────────────────────────────────────────────────
  const { criteria, level } = evaluatePassword(password);
  const allCriteriaMet = Object.values(criteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allCriteriaMet) {
      setError('A senha não atende todos os requisitos de segurança.');
      return;
    }

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    const result = await applyPasswordReset(oobCode, password, userEmail);
    setSaving(false);

    if (result.success) {
      setState('success');
    } else {
      const err = (result as { success: false; error: string }).error;
      if (err === 'token_expired') { setState('expired'); return; }
      if (err === 'token_invalid') { setState('invalid'); return; }
      if (err === 'weak_password') { setError('Senha não atende os critérios mínimos.'); return; }
      setError(err ?? 'Erro ao redefinir senha. Tente novamente.');
    }
  };

  // ── Wrapper de layout ────────────────────────────────────────────────────
  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020812] p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(0,132,255,0.18),transparent_35%),linear-gradient(135deg,#020812,#071525_50%,#02050c)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-blue-400/40" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-xl border border-blue-400/20 bg-[#06101b]/90 p-8 shadow-2xl shadow-blue-950/40 backdrop-blur-xl"
      >
        <div className="mb-6 text-center">
          <img
            src="/imagen/logo.png"
            alt="SMARTTECH IoT OS"
            className="mx-auto mb-3 h-14 w-14 rounded-xl object-cover ring-1 ring-blue-400/30"
          />
          <h1 className="text-xl font-bold">
            SMARTTECH <span className="text-blue-400">IoT OS</span>
          </h1>
        </div>
        {children}
        <p className="mt-6 flex items-center justify-center gap-1 text-center text-[10px] text-white/20">
          <Shield className="h-3 w-3" />
          Dados protegidos conforme LGPD · Sessões invalidadas após redefinição
        </p>
      </motion.div>
    </div>
  );

  // ── Estados de UI ────────────────────────────────────────────────────────
  if (state === 'verifying') {
    return (
      <Wrap>
        <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm">Verificando link de recuperação…</p>
        </div>
      </Wrap>
    );
  }

  if (state === 'expired') {
    return (
      <Wrap>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
            <Clock className="h-7 w-7 text-amber-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Link Expirado</h2>
          <p className="mb-5 text-sm text-slate-400">
            Este link de recuperação expirou (válido por 30 minutos). Solicite um novo.
          </p>
          <Link
            to="/forgot-password"
            className="os-button os-button-primary inline-flex w-full justify-center py-2.5"
          >
            Solicitar Novo Link
          </Link>
          <Link to="/login" className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-400 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Voltar para Login
          </Link>
        </div>
      </Wrap>
    );
  }

  if (state === 'invalid') {
    return (
      <Wrap>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Link Inválido</h2>
          <p className="mb-5 text-sm text-slate-400">
            Este link de recuperação é inválido ou já foi utilizado.
          </p>
          <Link
            to="/forgot-password"
            className="os-button os-button-primary inline-flex w-full justify-center py-2.5"
          >
            Solicitar Novo Link
          </Link>
          <Link to="/login" className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-400 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Voltar para Login
          </Link>
        </div>
      </Wrap>
    );
  }

  if (state === 'success') {
    return (
      <Wrap>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
            <CheckCircle className="h-7 w-7 text-green-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Senha Alterada com Sucesso!</h2>
          <p className="mb-2 text-sm text-slate-300">
            Sua senha foi redefinida. Todas as sessões ativas foram encerradas por segurança.
          </p>
          <p className="mb-6 text-xs text-slate-500">
            Faça login com sua nova senha para continuar.
          </p>
          <Link
            to="/login"
            className="os-button os-button-primary inline-flex w-full justify-center py-2.5"
          >
            Voltar para Login
          </Link>
        </motion.div>
      </Wrap>
    );
  }

  // ── Formulário de redefinição ────────────────────────────────────────────
  return (
    <Wrap>
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
            <KeyRound className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold">Redefinir Senha</h2>
            {userEmail && (
              <p className="text-xs text-slate-500">{userEmail}</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nova senha */}
        <div>
          <label className="mb-1.5 block text-xs text-slate-400">Nova Senha</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha segura"
              className="os-input w-full pr-10"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <PasswordStrength password={password} showCriteria />
            </div>
          )}
        </div>

        {/* Confirmar senha */}
        <div>
          <label className="mb-1.5 block text-xs text-slate-400">Confirmar Senha</label>
          <div className="relative">
            <input
              type={showCf ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              className={`os-input w-full pr-10 ${
                confirm && confirm !== password ? 'border-red-500/50 focus:border-red-500' : ''
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowCf((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="mt-1 text-xs text-red-400">As senhas não coincidem.</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !allCriteriaMet || password !== confirm}
          className="os-button os-button-primary w-full justify-center py-3 disabled:opacity-60"
        >
          {saving ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            <><KeyRound className="h-4 w-4" /> Redefinir Senha</>
          )}
        </button>
      </form>

      <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-xs text-slate-500">
        Após a alteração, todas as sessões ativas serão encerradas automaticamente por segurança.
      </div>

      <Link to="/login" className="mt-4 flex items-center justify-center gap-1 text-xs text-blue-400 hover:underline">
        <ArrowLeft className="h-3 w-3" /> Voltar para Login
      </Link>
    </Wrap>
  );
}
