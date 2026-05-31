/**
 * TwoFactorSetup — configuração de autenticação 2FA com TOTP
 * (Google Authenticator / Microsoft Authenticator)
 *
 * Fluxo:
 *  1. Gera secret TOTP via Firebase Auth
 *  2. Exibe QR code e chave manual
 *  3. Usuário escaneia com o autenticador
 *  4. Usuário insere o código de 6 dígitos para confirmar
 *  5. Firebase enrola o fator de autenticação
 *
 * Requisito: Firebase Auth com MFA habilitado no Console
 * (Authentication → Sign-in method → Multi-factor authentication)
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  ChevronLeft,
  Copy,
  KeyRound,
  QrCode,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  X,
} from 'lucide-react';
import {
  multiFactor,
  TotpMultiFactorGenerator,
  type MultiFactorSession,
  type TotpSecret,
} from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { logAdminAction } from '../services/securityLogger';

type Step = 'intro' | 'qrcode' | 'verify' | 'done' | 'remove_confirm' | 'removing';

interface Props {
  onClose?: () => void;
}

export default function TwoFactorSetup({ onClose }: Props) {
  const { user, profile } = useAuth();

  const [step, setStep]           = useState<Step>('intro');
  const [secret, setSecret]       = useState<TotpSecret | null>(null);
  const [qrUrl, setQrUrl]         = useState('');
  const [manualKey, setManualKey] = useState('');
  const [code, setCode]           = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);

  const isEnrolled = user
    ? multiFactor(user).enrolledFactors.some((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID)
    : false;

  // ── Gerar secret e QR ────────────────────────────────────────────────────
  const startSetup = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const mfaUser = multiFactor(user);
      const session: MultiFactorSession = await mfaUser.getSession();
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);

      const qr = totpSecret.generateQrCodeUrl(
        user.email ?? 'usuario',
        'SMARTTECH IoT OS',
      );

      setSecret(totpSecret);
      setQrUrl(qr);
      setManualKey(totpSecret.secretKey);
      setStep('qrcode');
    } catch (err) {
      setError((err as Error)?.message ?? 'Erro ao gerar QR code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verificar código e enrolar ────────────────────────────────────────────
  const verifyAndEnroll = async () => {
    if (!user || !secret) return;
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Informe um código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(user).enroll(assertion, 'SMARTTECH IoT OS – TOTP');
      logAdminAction(
        user.uid,
        user.email ?? '',
        'mfa_enrolled',
        '2FA TOTP habilitado com sucesso',
      );
      setStep('done');
    } catch (err) {
      const errCode = (err as { code?: string })?.code ?? '';
      if (errCode === 'auth/invalid-verification-code') {
        setError('Código incorreto. Verifique o autenticador e tente novamente.');
      } else {
        setError((err as Error)?.message ?? 'Erro ao ativar 2FA.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Remover 2FA ───────────────────────────────────────────────────────────
  const removeTotp = async () => {
    if (!user) return;
    setStep('removing');
    try {
      const mfaUser = multiFactor(user);
      const totp = mfaUser.enrolledFactors.find(
        (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (totp) {
        await mfaUser.unenroll(totp);
        logAdminAction(user.uid, user.email ?? '', 'mfa_removed', '2FA TOTP removido');
      }
      onClose?.();
    } catch (err) {
      setError((err as Error)?.message ?? 'Erro ao remover 2FA. Pode ser necessário relogar.');
      setStep('remove_confirm');
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(manualKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── UI por step ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* ── Intro ── */}
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Autenticação em Dois Fatores</h3>
                <p className="text-xs text-slate-400">
                  {isEnrolled ? '2FA habilitado' : 'Adicione uma camada extra de segurança'}
                </p>
              </div>
            </div>

            {isEnrolled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Autenticação 2FA está ativa na sua conta.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <p className="mb-1 font-medium">Aplicativos compatíveis:</p>
                  <ul className="list-disc pl-4 text-xs text-slate-400">
                    <li>Google Authenticator</li>
                    <li>Microsoft Authenticator</li>
                    <li>Authy, 1Password, Bitwarden, etc.</li>
                  </ul>
                </div>
                <button
                  onClick={() => setStep('remove_confirm')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <ShieldOff className="h-4 w-4" />
                  Remover 2FA
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                  <p className="mb-2 font-medium text-slate-200">Como funciona:</p>
                  <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-400">
                    <li>Instale Google Authenticator ou Microsoft Authenticator</li>
                    <li>Escaneie o QR code exibido</li>
                    <li>No login, informe o código de 6 dígitos gerado</li>
                  </ol>
                </div>
                <button
                  onClick={startSetup}
                  disabled={loading}
                  className="os-button os-button-primary w-full justify-center py-2.5 disabled:opacity-60"
                >
                  {loading ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><QrCode className="h-4 w-4" /> Configurar 2FA</>
                  )}
                </button>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
            )}
          </motion.div>
        )}

        {/* ── QR Code ── */}
        {step === 'qrcode' && (
          <motion.div
            key="qrcode"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <button
              onClick={() => setStep('intro')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>

            <h3 className="font-semibold">Escaneie o QR Code</h3>
            <p className="text-xs text-slate-400">
              Abra seu aplicativo autenticador e escaneie o código abaixo.
            </p>

            {/* QR Code via API pública (noscript fallback: chave manual) */}
            <div className="flex justify-center rounded-xl border border-white/10 bg-white p-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
                alt="QR Code 2FA"
                width={180}
                height={180}
                className="rounded"
              />
            </div>

            {/* Chave manual */}
            <div>
              <p className="mb-1 text-xs text-slate-400">
                Não consegue escanear? Use a chave manual:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-xs font-mono text-blue-300">
                  {manualKey}
                </code>
                <button
                  onClick={copyKey}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  title="Copiar chave"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => { setCode(''); setError(''); setStep('verify'); }}
              className="os-button os-button-primary w-full justify-center py-2.5"
            >
              Já escanei → Confirmar Código
            </button>
          </motion.div>
        )}

        {/* ── Verificar código ── */}
        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <button
              onClick={() => setStep('qrcode')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>

            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold">Confirmar Código</h3>
            </div>
            <p className="text-xs text-slate-400">
              Informe o código de 6 dígitos exibido no seu aplicativo autenticador.
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="os-input w-full text-center text-2xl tracking-[0.4em] font-mono"
              autoFocus
            />

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
            )}

            <button
              onClick={verifyAndEnroll}
              disabled={loading || code.length !== 6}
              className="os-button os-button-primary w-full justify-center py-2.5 disabled:opacity-60"
            >
              {loading ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Ativando...</>
              ) : (
                <><KeyRound className="h-4 w-4" /> Ativar 2FA</>
              )}
            </button>
          </motion.div>
        )}

        {/* ── Concluído ── */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
              <ShieldCheck className="h-7 w-7 text-green-400" />
            </div>
            <h3 className="font-semibold">2FA Ativado!</h3>
            <p className="text-sm text-slate-300">
              A autenticação em dois fatores está habilitada. A partir do próximo login,
              será solicitado o código do autenticador.
            </p>
            <button
              onClick={onClose}
              className="os-button os-button-primary w-full justify-center py-2.5"
            >
              <Check className="h-4 w-4" /> Concluir
            </button>
          </motion.div>
        )}

        {/* ── Confirmar remoção ── */}
        {step === 'remove_confirm' && (
          <motion.div
            key="remove_confirm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="font-medium">Remover 2FA?</p>
              <p className="mt-1 text-xs text-red-200/70">
                Sua conta ficará protegida apenas por senha. Isso reduz a segurança
                do acesso. Tem certeza?
              </p>
            </div>
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('intro')}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={removeTotp}
                className="flex-1 rounded-xl border border-red-500/30 bg-red-500/15 py-2.5 text-sm text-red-300 hover:bg-red-500/25"
              >
                Confirmar Remoção
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Removendo ── */}
        {step === 'removing' && (
          <motion.div
            key="removing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-8 text-slate-400"
          >
            <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm">Removendo 2FA…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
