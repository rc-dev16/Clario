import { analyzeDocumentWithGemini, validateFile, extractFileContent } from './geminiService';
import { AnalysisResult } from '../types/index';
import { getFirestore, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
// @ts-ignore
import app from '../../firebase-config.js';

const db = getFirestore(app);

// Actual document analysis service using Gemini AI (extract once, pass content to avoid duplicate extraction)
export const analyzeDocument = async (file: File): Promise<AnalysisResult> => {
  try {
    const fileError = validateFile(file);
    if (fileError) throw fileError;

    const content = await extractFileContent(file);
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Failed to read file content: File content is empty or null');
    }

    return await analyzeDocumentWithGemini(file, content);
  } catch (error) {
    console.error('Document analysis failed:', error);
    throw error instanceof Error ? error : new Error('Failed to analyze document');
  }
};

// Increment contractsAnalyzed (1 write only, no read; fail fast, no retries)
export const incrementContractsAnalyzed = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { contractsAnalyzed: increment(1) });
};

// Fetch contractsAnalyzed count (1 read, no retries; returns 0 on Firestore error)
export const getContractsAnalyzed = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) return userSnap.data().contractsAnalyzed ?? 0;
    return 0;
  } catch (e) {
    console.warn('getContractsAnalyzed failed:', e);
    return 0;
  }
};