import { AnalysisResult } from '../types/index';
import mammoth from 'mammoth';
import { callGemini } from './geminiApi';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// IMPORTANT: You must copy node_modules/pdfjs-dist/legacy/build/pdf.worker.js to public/pdf.worker.js
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const RETRY_DELAY_MS = 2000;
const MAX_429_RETRIES = 2; // 429 only: 3 calls total

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
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      // DOCX extraction using mammoth
      try {
        const arrayBuffer = await file.arrayBuffer();
        const { value: text } = await mammoth.extractRawText({ arrayBuffer });
        if (!text || text.trim().length === 0) {
          throw new Error('DOCX file appears to be empty or could not be read.');
        }
        return text;
      } catch (docxError) {
        console.error('DOCX extraction failed:', docxError);
        throw new AnalysisError(
          'DOCX_EXTRACTION_FAILED',
          'Failed to extract text from DOCX',
          docxError instanceof Error ? docxError.message : 'Unknown DOCX extraction error',
          false
        );
      }
    } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
      // Plain text extraction
      return await file.text();
    } else {
      throw new AnalysisError(
        'UNSUPPORTED_FILE_TYPE',
        'Only PDF, DOCX, and TXT files are supported',
        `File type: ${file.type}. Only PDF, DOCX, and TXT files are supported.`,
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
    const response = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });
    return response as GeminiResponse;
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      code?: string;
      response?: { status?: number; data?: unknown; headers?: Record<string, string> };
      details?: { status?: number; body?: string };
    };

    const status = err.response?.status ?? err.details?.status;
    const msg = err.message || err.details?.body || 'Unknown error';

    console.error('Error in getCompletion:', {
      message: err.message,
      status,
    });

    // Only retry 429 when from direct (axios) path; callable already retries.
    if (status === 429 && retryCount < MAX_429_RETRIES && err.response) {
      const retryAfter = err.response?.headers?.['retry-after'] ?? err.response?.headers?.['retry-after-ms'];
      const delayMs = retryAfter
        ? Number(retryAfter) * (String(retryAfter).length <= 3 ? 1000 : 1)
        : Math.min(30_000, RETRY_DELAY_MS * Math.pow(2, retryCount));
      console.warn(`Rate limited (429). Retrying after ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
      return getCompletion(prompt, retryCount + 1);
    }

    if (status === 429) {
      throw new AnalysisError(
        'RATE_LIMIT',
        'Too many requests. Please wait a minute and try again.',
        msg,
        false
      );
    }

    if (err.code === 'functions/unauthenticated') {
      throw new AnalysisError('AUTH_REQUIRED', 'Sign in to use this feature.', msg, false);
    }

    throw new AnalysisError(
      'AI_REQUEST',
      'AI is temporarily unavailable. Please try again.',
      msg,
      false
    );
  }
};

function repairTruncatedJson(s: string): string {
  const t = s.trim();
  if (/[}\]]\s*$/.test(t)) return s;
  const openC = (t.match(/{/g) || []).length - (t.match(/}/g) || []).length;
  const openS = (t.match(/\[/g) || []).length - (t.match(/]/g) || []).length;
  return s + '"' + ']'.repeat(Math.max(0, openS)) + '}'.repeat(Math.max(0, openC));
}

/** Replaces raw newlines/carriage returns inside JSON string values with \\n / \\r. */
function replaceLiteralNewlinesInStrings(s: string): string {
  let inString = false;
  let escape = false;
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      out.push(c);
      escape = false;
    } else if (c === "\\") {
      out.push(c);
      escape = true;
    } else if (c === '"') {
      out.push(c);
      inString = !inString;
    } else if (inString && (c === "\n" || c === "\r")) {
      out.push(c === "\r" ? "\\r" : "\\n");
    } else {
      out.push(c);
    }
  }
  return out.join("");
}

function tryParseJson(completion: string): Record<string, unknown> {
  let jsonString = completion
    .replace(/^```(?:json)?\s*/g, '')
    .replace(/```\s*$/g, '')
    .trim();
  try {
    return JSON.parse(jsonString) as Record<string, unknown>;
  } catch (e) {
    if (!(e instanceof SyntaxError) || !/Unterminated string|Unexpected end/i.test(e.message)) throw e;
    for (const repair of [repairTruncatedJson, replaceLiteralNewlinesInStrings]) {
      try {
        return JSON.parse(repair(jsonString)) as Record<string, unknown>;
      } catch {
        /* try next */
      }
    }
    try {
      return JSON.parse(repairTruncatedJson(replaceLiteralNewlinesInStrings(jsonString))) as Record<string, unknown>;
    } catch {
      /* fallback: repair truncation after fixing newlines */
    }
    throw e;
  }
}

const parseCompletion = (completion: string): AnalysisResult => {
  try {
    // Cast: AI JSON shape varies; parseCompletion already handles missing/weird fields
    const parsed = tryParseJson(completion) as any;
    
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
    throw new Error('Failed to parse AI response as JSON');
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

  IMPORTANT: Your response MUST be valid JSON only (no extra text). In string values: escape newlines as \\n and double-quotes as \\". If you approach length limits, omit optional fields (exhibits, signatureBlocks) rather than cutting off mid-string. Use this structure:

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

export const analyzeDocumentWithGemini = async (file: File, content: string): Promise<AnalysisResult> => {
  const prompt = generatePrompt(content, file.name);
  const MAX_PARSE_RETRIES = 1;
  let parseAttempts = 0;

  while (true) {
    try {
      const response = await getCompletion(prompt);
      if (!response?.data) {
        throw new AnalysisError(
          'EMPTY_RESPONSE',
          'AI is temporarily unavailable. Please try again.',
          'No response data',
          false
        );
      }

      let completionText = '';
      const responseData = response.data;
      if (Array.isArray(responseData.candidates) && responseData.candidates.length > 0) {
        const c = responseData.candidates[0];
        if (c?.content?.parts?.[0]?.text) completionText = c.content.parts[0].text;
      } else if (Array.isArray(responseData.choices) && responseData.choices.length > 0) {
        const c = responseData.choices[0];
        if (c?.message?.content) completionText = c.message.content;
      } else if (typeof responseData.text === 'string') {
        completionText = responseData.text;
      } else if (typeof responseData === 'string') {
        completionText = responseData;
      } else {
        try { completionText = JSON.stringify(responseData); } catch (_) {}
      }

      if (!completionText || typeof completionText !== 'string' || completionText.trim().length === 0) {
        throw new AnalysisError(
          'EMPTY_RESPONSE',
          'AI is temporarily unavailable. Please try again.',
          'Empty completion',
          false
        );
      }

      const result = parseCompletion(completionText);

      return {
        id: result.id || uuidv4(),
        fileName: file.name,
        fileSize: file.size,
        analysisDate: result.analysisDate || new Date().toISOString(),
        summary: result.summary || { points: [] },
        documentType: result.documentType || 'Document',
        fields: Array.isArray(result.fields) ? result.fields : [],
        riskLevel: ['Low', 'Medium', 'High'].includes(result.riskLevel) ? result.riskLevel as 'Low' | 'Medium' | 'High' : 'Medium',
        completionScore: typeof result.completionScore === 'number' ? Math.min(1, Math.max(0, result.completionScore)) : 0.5,
        contractType: result.contractType,
        parties: Array.isArray(result.parties) ? result.parties : [],
        keyTerms: Array.isArray(result.keyTerms) ? result.keyTerms : [],
        importantDates: result.importantDates || {},
        paymentTerms: result.paymentTerms,
        terminationClauses: Array.isArray(result.terminationClauses) ? result.terminationClauses : [],
        concerningPoints: Array.isArray(result.concerningPoints) ? result.concerningPoints : [],
        overallSummary: result.overallSummary,
      };
    } catch (e) {
      if (e instanceof AnalysisError) throw e;

      if (parseAttempts < MAX_PARSE_RETRIES) {
        parseAttempts++;
        console.warn(`Parse attempt ${parseAttempts} failed, retrying once...`, e);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw new AnalysisError(
        'INVALID_RESPONSE',
        "We couldn't understand the AI response. Please try again.",
        (e as Error)?.message || 'Parse failed',
        false
      );
    }
  }
};

export {};