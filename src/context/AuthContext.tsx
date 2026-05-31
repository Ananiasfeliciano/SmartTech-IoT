import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logLogout } from '../services/securityLogger';

/** Item 7 — Tempo máximo de inatividade antes de logout automático (ms) */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart'] as const;

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  registerAdmin: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Reinicia o temporizador de inatividade */
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await logLogout(currentUser.uid, currentUser.email ?? '', 'inactivity_timeout');
        await signOut(auth);
      }
    }, INACTIVITY_TIMEOUT_MS);
  };

  /** Registra listeners de atividade do usuário */
  const attachActivityListeners = () => {
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
  };

  const detachActivityListeners = () => {
    ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          setProfile(snap.exists() ? snap.data() : { email: firebaseUser.email, role: 'admin' });
        } catch {
          setProfile({ email: firebaseUser.email, role: 'admin' });
        }
        // Inicia monitoramento de inatividade quando o usuário faz login
        attachActivityListeners();
        resetInactivityTimer();
      } else {
        setUser(null);
        setProfile(null);
        detachActivityListeners();
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      detachActivityListeners();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerAdmin = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      name,
      email,
      role: 'admin',
      uid: credential.user.uid,
      createdAt: new Date().toISOString(),
    });
  };

  const logout = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await logLogout(currentUser.uid, currentUser.email ?? '', 'user_action');
    }
    detachActivityListeners();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, registerAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
