import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Try to get extra user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const extraData = userDoc.exists() ? userDoc.data() : {};
        setUser(mapFirebaseUser(firebaseUser, extraData));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will update user
    } catch (err: any) {
      throw new Error(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
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
  };

  const googleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      // Store extra user info in Firestore if not present
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          plan: 'free',
          contractsAnalyzed: 0,
          maxContracts: 5,
          createdAt: new Date().toISOString(),
        });
      }
      // onAuthStateChanged will update user
    } catch (err: any) {
      throw new Error(err?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleSignIn, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
};