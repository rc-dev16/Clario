
import { 
  FileText,
  Clock,
  Info,
  Share2,
  Download,
  AlertTriangle,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { AnalysisResult } from '../../types';
import ContractSummary from '../ContractSummary';
import DocumentChat from './DocumentChat';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Helper to format dates
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Helper to format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getDocumentTypeIcon = (documentType: string) => {
  switch ((documentType || '').toLowerCase()) {
    case 'nda':
      return <FileText className="h-6 w-6 text-blue-600" />;
    case 'employment':
      return <FileText className="h-6 w-6 text-green-600" />;
    case 'contract':
      return <FileText className="h-6 w-6 text-purple-600" />;
    default:
      return <FileText className="h-6 w-6 text-gray-600" />;
  }
};

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'High': return 'from-red-500 to-red-600';
    case 'Medium': return 'from-amber-500 to-orange-500';
    case 'Low': return 'from-emerald-500 to-green-500';
    default: return 'from-gray-500 to-gray-600';
  }
};

const getRiskBadgeColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'High': return 'bg-red-100 text-red-800 border-red-200';
    case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Low': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const AnalysisResults = ({ result, setShowChat }: { result: AnalysisResult, setShowChat: (open: boolean) => void }) => {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // Share logic: copy link to clipboard
  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(null), 2000);
    } catch {
      setShareMsg('Failed to copy link');
      setTimeout(() => setShareMsg(null), 2000);
    }
  };

  // Export logic: download JSON file
  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `${result.fileName || 'contract-analysis'}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      setExportMsg('Exported!');
      setTimeout(() => setExportMsg(null), 2000);
    } catch {
      setExportMsg('Export failed');
      setTimeout(() => setExportMsg(null), 2000);
    }
  };

  const completionPercentage = Math.round((result.completionScore || 0) * 100);
  const scoreColor = completionPercentage >= 80 ? 'text-emerald-600' : 
    completionPercentage >= 60 ? 'text-amber-600' : 'text-red-600';

  const analysisDate = result.analysisDate ? formatDate(result.analysisDate) : 'N/A';
  const fileSize = result.fileSize ? formatFileSize(typeof result.fileSize === 'string' ? parseInt(result.fileSize) : (result.fileSize as number)) : 'N/A';

  return (
    <div className="p-8 mt-30">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-xl">
              {getDocumentTypeIcon(result.documentType)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{result.fileName}</h1>
              <p className="text-gray-600 font-medium text-sm">{result.documentType}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 relative"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share
            {shareMsg && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 shadow-lg">{shareMsg}</span>
            )}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 relative"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
            {exportMsg && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 shadow-lg">{exportMsg}</span>
            )}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-900 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={() => setShowChat(true)}
          >
            <Sparkles className="h-4 w-4" />
            Chat with AI
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Completion Score */}
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{completionPercentage}%</p>
              <p className="text-gray-600 font-medium text-sm">Complete</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                completionPercentage >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                completionPercentage >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                'bg-gradient-to-r from-red-500 to-red-600'
              }`}
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 bg-gradient-to-r ${getRiskColor(result.riskLevel)} rounded-xl flex items-center justify-center shadow-lg`}>
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{result.riskLevel}</p>
              <p className="text-gray-600 font-medium text-sm">Risk Level</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getRiskBadgeColor(result.riskLevel)}`}>
            <span>Risk Assessment</span>
          </div>
        </div>

        {/* Analysis Info */}
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{analysisDate}</p>
              <p className="text-gray-600 font-medium text-sm">Analyzed</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Info className="h-4 w-4" />
            <span>{fileSize}</span>
          </div>
        </div>
      </div>

      {/* Contract Summary */}
      <ContractSummary
        summary={result.summary}
        documentType={result.documentType}
        riskLevel={result.riskLevel}
        parties={result.parties}
        importantDates={result.importantDates}
        paymentTerms={result.paymentTerms}
        overallSummary={result.overallSummary}
        keyTerms={result.keyTerms}
        terminationClauses={result.terminationClauses}
        concerningPoints={result.concerningPoints}
        fields={result.fields}
      />
    </div>
  );
};