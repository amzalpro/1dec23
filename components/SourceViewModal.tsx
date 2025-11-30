
import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Project } from '../types';

interface SourceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: Project;
}

export const SourceViewModal: React.FC<SourceViewModalProps> = ({ isOpen, onClose, projectData }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(projectData, null, 2);

  const handleCopy = async () => {
    try {
        // Ensure document has focus before writing to clipboard to avoid "Document is not focused" error
        if (!document.hasFocus()) {
            window.focus();
        }
        await navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        console.error("Failed to copy to clipboard:", err);
        // If automatic copy fails, the user can still manually select text from the <pre> tag
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] no-print backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Données du Projet (JSON)
          </h2>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${copied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copié !' : 'Copier tout'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded transition-colors">
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#1e293b] p-4">
            <pre className="text-xs font-mono text-green-400 leading-relaxed whitespace-pre-wrap break-all">
                {jsonString}
            </pre>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between">
            <span>Taille totale : {jsonString.length} caractères</span>
            <span>Structure brute des pages et préférences</span>
        </div>
      </div>
    </div>
  );
};
