import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  registerAdmin: (login: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula persistência local (não seguro para produção!)
    const stored = localStorage.getItem('adminUser');
    if (stored) {
      setUser(JSON.parse(stored));
      setProfile(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const signIn = async (login: string, password: string) => {
    const stored = localStorage.getItem('adminUser');
    if (!stored) throw new Error('Nenhum admin cadastrado.');
    const admin = JSON.parse(stored);
    if (admin.login === login && admin.password === password) {
      setUser(admin);
      setProfile(admin);
      localStorage.setItem('adminUser', JSON.stringify(admin));
    } else {
      throw new Error('Login ou senha inválidos.');
    }
  };

  // Função para registrar o primeiro admin
  const registerAdmin = async (login: string, password: string, name: string) => {
    if (localStorage.getItem('adminUser')) {
      throw new Error('Já existe um administrador cadastrado.');
    }
    const adminProfile = {
      login,
      password,
      name,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('adminUser', JSON.stringify(adminProfile));
    setUser(adminProfile);
    setProfile(adminProfile);
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('adminUser');
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
