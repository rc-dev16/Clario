import { analyzeDocumentWithGemini, validateFile, extractFileContent } from './geminiService';
import { AnalysisResult } from '../types/index';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
// @ts-ignore
import app from '../../firebase-config.js';

const db = getFirestore(app);

// Actual document analysis service using Gemini AI
export const analyzeDocument = async (file: File): Promise<AnalysisResult> => {
  try {
    // Validate file
    const fileError = validateFile(file);
    if (fileError) {
      throw fileError;
    }

    // Extract file content
    const content = await extractFileContent(file);
    
    if (!content) {
      throw new Error(
        'Failed to read file content: File content is empty or null'
      );
    }

    // Use Gemini AI service to analyze the document
    const analysisResult = await analyzeDocumentWithGemini(file);
    return analysisResult;
  } catch (error) {
    console.error('Document analysis failed:', error);
    throw error instanceof Error ? error : new Error('Failed to analyze document');
  }
};

// Increment contractsAnalyzed for a user
export const incrementContractsAnalyzed = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    contractsAnalyzed: (await getContractsAnalyzed(userId)) + 1
  });
};

// Fetch contractsAnalyzed count for a user
export const getContractsAnalyzed = async (userId: string): Promise<number> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data().contractsAnalyzed || 0;
  }
  return 0;
};