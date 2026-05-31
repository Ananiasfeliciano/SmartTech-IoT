/**
 * Setup de testes — mocka módulos externos (Firebase) para que os testes
 * unitários de segurança rodem sem dependências de rede ou config de ambiente.
 */
import { vi } from 'vitest';

// Mock do core do Firebase (evita initializeApp fazer chamadas de rede)
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
}));

// Mock completo do Firebase para testes unitários
vi.mock('../../src/firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

vi.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], size: 0 })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms, seconds: ms / 1000, nanoseconds: 0 }) },
  getFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}));
