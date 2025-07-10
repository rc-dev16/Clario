import axios from 'axios';
import { AnalysisResult } from '../types/index';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// IMPORTANT: You must copy node_modules/pdfjs-dist/legacy/build/pdf.worker.js to public/pdf.worker.js
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const INITIAL_DELAY = 1000;
const RETRY_DELAY = 2000;
const MAX_RETRIES = 5;

export class AnalysisError extends Error {
  code: string;
  details: string;
  isRetryable: boolean;

  constructor(code: string, message: string, details: string, isRetryable: boolean) {
    super(message);
    this.code = code;
    this.details = details;
    this.isRetryable = isRetryable;
  }
}

export const validateFile = (file: File): AnalysisError | null => {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return new AnalysisError(
      'FILE_READ',
      'Unsupported file type',
      `File type: ${file.type}. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`,
      false
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return new AnalysisError(
      'FILE_READ',
      'File size exceeds maximum limit',
      `File size: ${file.size} bytes. Maximum allowed: ${MAX_FILE_SIZE} bytes`,
      false
    );
  }

  return null;
};

export const extractFileContent = async (file: File): Promise<string> => {
  try {
    const fileType = file.type;
    if (fileType === 'application/pdf') {
      // PDF extraction using pdfjs-dist
      const arrayBuffer = await file.arrayBuffer();
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return text;
      } catch (pdfError) {
        console.error('PDF extraction failed:', pdfError);
        throw new AnalysisError(
          'PDF_EXTRACTION_FAILED',
          'Failed to extract text from PDF',
          pdfError instanceof Error ? pdfError.message : 'Unknown PDF extraction error',
          false
        );
      }
    } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
      // Plain text extraction
      return await file.text();
    } else {
      throw new AnalysisError(
        'UNSUPPORTED_FILE_TYPE',
        'Only PDF and TXT files are supported',
        `File type: ${file.type}. Only PDF and TXT files are supported.`,
        false
      );
    }
  } catch (error) {
    console.error('File extraction failed:', error);
    throw new AnalysisError(
      'FILE_READ',
      'Failed to extract file content',
      error instanceof Error ? error.message : 'Unknown error',
      false
    );
  }
};

interface GeminiResponse {
  data: {
    candidates?: Array<{
      content: {
        parts: Array<{
          text: string;
        }>;
      };
    }>;
    choices?: Array<{
      message: {
        content: string;
      };
    }>;
    text?: string;
  };
}

const getCompletion = async (prompt: string, retryCount = 0): Promise<GeminiResponse> => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new AnalysisError(
        'MISSING_API_KEY',
        'Google API key is not configured',
        'Please set the VITE_GOOGLE_API_KEY environment variable',
        false
      );
    }

    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY));
    }
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // API key is now in the URL
        timeout: 30000 // 30 seconds timeout
      }
    );
    
    return response;
    
  } catch (error: unknown) {
    const errorResponse = error as {
      message: string;
      response?: {
        status?: number;
        data?: any;
        headers?: {
          'retry-after'?: string;
          'retry-after-ms'?: string;
        };
      };
      config?: {
        url?: string;
        method?: string;
        params?: any;
      };
    };
    
    console.error('Error in getCompletion:', {
      message: errorResponse.message,
      status: errorResponse.response?.status,
      data: errorResponse.response?.data,
      config: {
        url: errorResponse.config?.url,
        method: errorResponse.config?.method,
        params: errorResponse.config?.params,
      }
    });
    
    if (errorResponse.response?.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = errorResponse.response?.headers?.['retry-after'] || 
                        errorResponse.response?.headers?.['retry-after-ms'];
      const delay = retryAfter 
        ? Number(retryAfter) * (retryAfter.toString().length <= 3 ? 1000 : 1) // Handle both seconds and milliseconds
        : RETRY_DELAY * Math.pow(2, retryCount);
      
      console.log(`Rate limited. Retrying after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getCompletion(prompt, retryCount + 1);
    }
    
    throw new AnalysisError(
      'AI_REQUEST', 
      'Failed to process document', 
      errorResponse.response?.data?.error?.message || errorResponse.message || 'Unknown error', 
      false
    );
  }
};

const parseCompletion = (completion: string): AnalysisResult => {
  try {
    // Clean up the response - remove markdown code block markers if present
    let jsonString = completion
      .replace(/^```(?:json)?\s*/g, '')  // Remove starting ```json or ```
      .replace(/```\s*$/g, '')           // Remove ending ```
      .trim();
    
    // Try to parse the completion as JSON
    const parsed = JSON.parse(jsonString);
    
    // Format the summary points from the contract analysis
    const summaryPoints: string[] = [];
    
    // Helper function to safely add a section with title
    const addSection = (title: string, content: any) => {
      if (content) {
        if (Array.isArray(content) && content.length > 0) {
          summaryPoints.push(`\n${title}:`, ...content.map((item: string) => `• ${item}`));
        } else if (typeof content === 'object' && content !== null) {
          const entries = Object.entries(content);
          if (entries.length > 0) {
            summaryPoints.push(`\n${title}:`);
            entries.forEach(([key, value]) => {
              if (value) summaryPoints.push(`• ${key}: ${value}`);
            });
          }
        }
      }
    };
    
    // Add basic contract info
    if (parsed.contractType) {
      summaryPoints.push(`Contract Type: ${parsed.contractType}`);
    }
    
    // Add parties if available
    if (parsed.parties?.length) {
      summaryPoints.push(`Parties: ${parsed.parties.join(', ')}`);
    }
    
    // Add important dates if available
    if (parsed.importantDates) {
      addSection('Important Dates', parsed.importantDates);
    }
    
    // Add payment terms if available
    if (parsed.paymentTerms) {
      addSection('Payment Terms', parsed.paymentTerms);
    }
    
    // Add key terms if available
    if (parsed.keyTerms?.length) {
      addSection('Key Terms', parsed.keyTerms);
    }
    
    // Add termination clauses if available
    if (parsed.terminationClauses?.length) {
      addSection('Termination Clauses', parsed.terminationClauses);
    }
    
    // Add concerning points if any
    if (parsed.concerningPoints?.length) {
      addSection('Points of Concern', parsed.concerningPoints);
    }
    
    // Add overall summary if available
    if (parsed.overallSummary) {
      addSection('Summary', parsed.overallSummary);
    }
    
    // If no summary points were added, add a default message
    if (summaryPoints.length === 0) {
      summaryPoints.push('No contract information could be extracted.');
    }
    
    // Determine risk level (default to Medium if not specified)
    const riskLevel = ['Low', 'Medium', 'High'].includes(parsed.riskLevel) 
      ? parsed.riskLevel 
      : 'Medium';
    
    const analysisResult: AnalysisResult = {
      id: uuidv4(),
      fileName: 'Contract',
      fileSize: '0', // Will be set by the calling function
      analysisDate: new Date().toISOString(),
      summary: {
        points: summaryPoints,
        contractType: parsed.contractType,
        missingOrAmbiguousTerms: parsed.missingOrAmbiguousTerms || [],
      },
      documentType: 'Contract',
      fields: [] as any[], // ContractField[] is removed, so use any[] for now
      riskLevel: riskLevel as 'Low' | 'Medium' | 'High',
      completionScore: 1.0,
      // Add additional fields from the parsed data
      contractType: parsed.contractType,
      parties: parsed.parties,
      keyTerms: parsed.keyTerms,
      importantDates: parsed.importantDates,
      paymentTerms: parsed.paymentTerms,
      terminationClauses: parsed.terminationClauses,
      concerningPoints: parsed.concerningPoints,
      overallSummary: parsed.overallSummary
    };
    
    return analysisResult;
  } catch (error) {
    console.error('Error parsing contract analysis:', error);
    
    // Fallback response if parsing fails
    const fallbackResult: AnalysisResult = {
      id: uuidv4(),
      fileName: 'Contract',
      fileSize: '0',
      analysisDate: new Date().toISOString(),
      summary: {
        points: [
          'Could not analyze the contract content.',
          'Please ensure the document is a valid contract and try again.'
        ]
      },
      documentType: 'Contract',
      fields: [] as any[], // ContractField[] is removed, so use any[] for now
      riskLevel: 'High',
      completionScore: 0
    };
    
    return fallbackResult;
  }
};

const generatePrompt = (content: string, fileName: string): string => {
  return `Analyze this contract document and provide a detailed analysis focusing on the actual contract terms and conditions. Ignore document metadata and focus on the legal content.

  Document: ${fileName}
  Content: ${content.substring(0, 10000)}...

  Provide a comprehensive analysis including:
  ✓ Type of contract (e.g., Employment, NDA, Service Agreement, etc.)
  ✓ All parties involved and their roles
  ✓ All obligations and responsibilities of each party
  ✓ Key terms and conditions
  ✓ Important dates and durations (list all dates)
  ✓ Payment terms (all monetary amounts and currencies)
  ✓ Termination clauses
  ✓ Renewal or extension terms
  ✓ Governing law or jurisdiction
  ✓ Signature blocks and signatories
  ✓ Any referenced exhibits or attachments
  ✓ Any unusual, missing, or ambiguous clauses or terms
  ✓ Overall risk assessment

  IMPORTANT: Your response MUST be a valid JSON object with NO additional text before or after. Use this exact structure:

  {
    "contractType": "[Type of contract]",
    "parties": [
      { "name": "Party 1", "role": "[role]" },
      { "name": "Party 2", "role": "[role]" }
    ],
    "obligations": ["obligation 1", "obligation 2"],
    "keyTerms": ["term 1", "term 2"],
    "importantDates": {
      "effectiveDate": "[date]",
      "expirationDate": "[date]",
      "otherDates": ["date1", "date2"]
    },
    "paymentTerms": "[description]",
    "terminationClauses": ["clause 1", "clause 2"],
    "renewalTerms": "[description]",
    "governingLaw": "[jurisdiction]",
    "signatureBlocks": ["signatory 1", "signatory 2"],
    "exhibits": ["exhibit 1", "exhibit 2"],
    "concerningPoints": ["point 1", "point 2"],
    "missingOrAmbiguousTerms": ["term 1", "term 2"],
    "riskLevel": "Low",
    "overallSummary": "[2-3 sentence summary]"
  }

  For the "missingOrAmbiguousTerms" array:
  - ONLY include fields, clauses, or terms that are specifically required, referenced, or implied by this contract's type and content.
  - Do NOT include generic legal terms or boilerplate clauses that are not relevant to this contract.
  - Be precise and context-aware: only list missing or ambiguous items that are truly expected for this contract.
  - Do NOT guess or fill in information that is not clearly stated. If a field is not found or is unclear, include it in this array. This is critical for contract review.

  Example:
  If the contract is a Service Agreement and the document does not specify the effective date, payment terms, or governing law, then:
  "missingOrAmbiguousTerms": [
    "Effective date",
    "Payment terms",
    "Governing law"
  ]
`;
};

export const analyzeDocumentWithGemini = async (file: File | null): Promise<AnalysisResult> => {
  // 1. Validate file
  if (!file) {
    throw new AnalysisError('INVALID_INPUT', 'No file provided', 'Please provide a valid file', true);
  }

  try {
    // 2. Validate file type and size
    const validationError = validateFile(file);
    if (validationError) {
      throw validationError;
    }

    // 3. Extract text content
    const content = await extractFileContent(file);
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new AnalysisError(
        'EMPTY_CONTENT',
        'Document is empty',
        'The provided document appears to be empty or could not be read.',
        false
      );
    }
    
    // 4. Generate prompt with strict JSON format requirement
    const prompt = generatePrompt(content, file.name);
    
    // 5. Get completion from Gemini with retry logic for JSON parsing
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error | null = null;
    
    while (attempts < maxAttempts) {
      try {
        const response = await getCompletion(prompt);
        
        if (!response?.data) {
          throw new Error('Received empty or invalid response from AI service');
        }
        
        // Extract the text content from the response
        let completionText = '';
        const responseData = response.data;
        
        // Handle different possible response structures with better type safety
        if (Array.isArray(responseData.candidates) && responseData.candidates.length > 0) {
          const candidate = responseData.candidates[0];
          if (candidate?.content?.parts?.[0]?.text) {
            // Google Gemini response format
            completionText = candidate.content.parts[0].text;
          }
        } else if (Array.isArray(responseData.choices) && responseData.choices.length > 0) {
          const choice = responseData.choices[0];
          if (choice?.message?.content) {
            // OpenAI-compatible format
            completionText = choice.message.content;
          }
        } else if (typeof responseData.text === 'string') {
          // Direct text response
          completionText = responseData.text;
        } else if (typeof responseData === 'string') {
          // If the response is already a string
          completionText = responseData;
        } else {
          // Fallback: try to stringify the response
          try {
            completionText = JSON.stringify(responseData);
          } catch (e) {
            console.error('Failed to stringify response data:', e);
          }
        }
        
        if (!completionText || typeof completionText !== 'string' || completionText.trim().length === 0) {
          throw new Error('Received empty or invalid completion text from the AI service');
        }
        
        // Parse the completion and ensure all required fields are present
        const result = parseCompletion(completionText);
        
        // Create a complete result object with all required fields
        const completeResult: AnalysisResult = {
          id: result.id || uuidv4(),
          fileName: file.name,
          fileSize: file.size,
          analysisDate: result.analysisDate || new Date().toISOString(),
          summary: result.summary || { points: [] },
          documentType: result.documentType || 'Document',
          fields: Array.isArray(result.fields) ? result.fields : [],
          riskLevel: ['Low', 'Medium', 'High'].includes(result.riskLevel) 
            ? result.riskLevel as 'Low' | 'Medium' | 'High' 
            : 'Medium',
          completionScore: typeof result.completionScore === 'number' 
            ? Math.min(1, Math.max(0, result.completionScore)) // Ensure between 0 and 1
            : 0.5, // Default to 50% if not provided
          // Include any additional fields
          contractType: result.contractType,
          parties: Array.isArray(result.parties) ? result.parties : [],
          keyTerms: Array.isArray(result.keyTerms) ? result.keyTerms : [],
          importantDates: result.importantDates || {},
          paymentTerms: result.paymentTerms,
          terminationClauses: Array.isArray(result.terminationClauses) ? result.terminationClauses : [],
          concerningPoints: Array.isArray(result.concerningPoints) ? result.concerningPoints : [],
          overallSummary: result.overallSummary
        };
        
        return completeResult;
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        // If we've tried too many times, give up
        if (attempts >= maxAttempts) {
          const errorMessage = lastError?.message || 'Unknown error occurred';
          console.error('All attempts failed. Last error:', errorMessage);
          throw new AnalysisError(
            'INVALID_RESPONSE',
            'Failed to parse AI response',
            `The AI response could not be processed. ${errorMessage}`,
            true
          );
        }
        
        // Wait a bit before retrying
        const waitTime = 1000 * attempts;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // This should theoretically never be reached due to the throw above
    throw lastError || new Error('Unknown error occurred during analysis');
    
  } catch (error) {
    // If it's already an AnalysisError, just rethrow it
    if (error instanceof AnalysisError) {
      throw error;
    }
    
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      console.error('Axios error during analysis:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      throw new AnalysisError(
        'API_ERROR',
        'Failed to communicate with the AI service',
        error.response?.data?.message || error.message,
        true
      );
    }
    
    // Handle other unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Unexpected error during analysis:', error);
    
    throw new AnalysisError(
      'ANALYSIS_FAILED',
      'Failed to analyze document',
      errorMessage,
      true
    );
  }
};

export {};