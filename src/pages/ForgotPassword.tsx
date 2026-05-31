import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Mail, RefreshCw, Send, Shield } from 'lucide-react';
import { isValidEmail } from '../lib/sanitize';
import { checkResetRateLimit, requestPasswordReset } from '../services/authRecovery';

type Step = 'form' | 'sent';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blockLabel, setBlockLabel] = useState('');

  // Countdown de bloqueio em tempo real
  useEffect(() => {
    if (!blockLabel) return;
    const id = setInterval(() => {
      const s = checkResetRateLimit(email.toLowerCase().trim());
      if (!s.blocked) { setBlockLabel(''); clearInterval(id); }
      else setBlockLabel(s.label);
    }, 1000);
    return () => clearInterval(id);
  }, [blockLabel, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Informe um e-mail válido.');
      return;
    }

    const rl = checkResetRateLimit(email.toLowerCase().trim());
    if (rl.blocked) {
      setBlockLabel(rl.label);
      setError(`Muitas solicitações. Tente novamente em ${rl.label}.`);
      return;
    }

    setSubmitting(true);
    try {
      // Anti-enumeração: requestPasswordReset nunca falha visivelmente
      await requestPasswordReset(email);
      setStep('sent');
    } catch {
      // Nunca deve chegar aqui — o serviço swallows erros para anti-enumeração
      setStep('sent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020812] p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(0,132,255,0.18),transparent_35%),linear-gradient(135deg,#020812,#071525_50%,#02050c)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-blue-400/40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-xl border border-blue-400/20 bg-[#06101b]/90 p-8 shadow-2xl shadow-blue-950/40 backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <img
            src="/imagen/logo.png"
            alt="SMARTTECH IoT OS"
            className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover ring-1 ring-blue-400/30"
          />
          <h1 className="mb-1 text-2xl font-bold">
            SMARTTECH <span className="text-blue-400">IoT OS</span>
          </h1>
        </div>

        {step === 'form' ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Recuperar Senha</h2>
              <p className="mt-1 text-sm text-slate-400">
                Informe seu e-mail cadastrado. Se existir uma conta associada, enviaremos
                as instruções de recuperação.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">E-mail cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="os-input w-full pl-9"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {blockLabel && <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !!blockLabel}
                className="os-button os-button-primary w-full justify-center py-3 disabled:opacity-60"
              >
                {submitting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4" /> Enviar Instruções</>
                )}
              </button>
            </form>
          </>
        ) : (
          /* ── Tela de confirmação ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15">
              <Mail className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Verifique seu e-mail</h2>
            <p className="mb-1 text-sm text-slate-300">
              Se existir uma conta associada ao e-mail{' '}
              <span className="font-medium text-white">{email}</span>, enviaremos as
              instruções de recuperação em breve.
            </p>
            <p className="mb-6 text-xs text-slate-500">
              O link expira em <span className="text-amber-400">30 minutos</span>. Verifique
              também a pasta de spam.
            </p>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left text-xs text-amber-200">
              <p className="font-medium">Não recebeu o e-mail?</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-200/70">
                <li>Verifique a pasta de spam / lixo eletrônico</li>
                <li>Aguarde até 5 minutos</li>
                <li>Verifique se o e-mail digitado está correto</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Rodapé */}
        <div className="mt-6 space-y-3">
          {step === 'sent' && (
            <button
              onClick={() => { setStep('form'); setEmail(''); }}
              className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              Tentar outro e-mail
            </button>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <Link to="/login" className="flex items-center gap-1 text-blue-400 hover:underline">
              <ArrowLeft className="h-3 w-3" /> Voltar para Login
            </Link>
            <Link to="/recover-user" className="hover:text-slate-300 transition-colors">
              Recuperar usuário
            </Link>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1 text-center text-[10px] text-white/20">
          <Shield className="h-3 w-3" />
          Dados protegidos conforme LGPD · Token com expiração de 30 min
        </p>
      </motion.div>
    </div>
  );
}
