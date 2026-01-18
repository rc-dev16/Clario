import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User } from '../types';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider, signInWithRedirect, getRedirectResult, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
// @ts-ignore
import app from '../../firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

function mapFirebaseUser(firebaseUser: FirebaseUser, extraData?: any): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: extraData?.name || firebaseUser.displayName || '',
    plan: extraData?.plan || 'free',
    contractsAnalyzed: extraData?.contractsAnalyzed || 0,
    maxContracts: extraData?.maxContracts || 5,
    createdAt: extraData?.createdAt || firebaseUser.metadata.creationTime || new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          let extraData: Record<string, unknown> = {};
          try {
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            extraData = userDoc.exists() ? (userDoc.data() as Record<string, unknown>) : {};
            if (!userDoc.exists()) {
              await setDoc(doc(db, 'users', result.user.uid), {
                name: result.user.displayName,
                email: result.user.email,
                plan: 'free',
                contractsAnalyzed: 0,
                maxContracts: 5,
                createdAt: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.warn('Could not load/save user profile after redirect:', e);
          }
          setUser(mapFirebaseUser(result.user, extraData));
        }
      } catch (e) {
        console.warn('getRedirectResult failed:', e);
      }

      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          let extraData: Record<string, unknown> = {};
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            extraData = userDoc.exists() ? (userDoc.data() as Record<string, unknown>) : {};
          } catch (e) {
            console.warn('Could not load user profile from Firestore, using defaults:', e);
          }
          setUser(mapFirebaseUser(firebaseUser, extraData));
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    })();

    return () => { unsub?.(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will update user
    } catch (err: any) {
      // Firebase error code for user-not-found or invalid-credential
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential'
      ) {
        throw new Error('No account found with this email. Please sign up first.');
      }
      throw new Error(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      // Store extra user info in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name,
        plan: 'free',
        contractsAnalyzed: 0,
        maxContracts: 5,
        createdAt: new Date().toISOString(),
      });
      // onAuthStateChanged will update user
    } catch (err: any) {
      throw new Error(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const googleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      setLoading(false);
      throw new Error(err?.message || 'Google sign-in failed.');
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, googleSignIn, forgotPassword }),
    [user, loading, login, register, logout, googleSignIn, forgotPassword]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};