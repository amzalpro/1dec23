
import React, { useMemo } from 'react';
import { X, Maximize2, Loader2 } from 'lucide-react';
import { Project } from '../types';
import { generateFlipbookHtml } from '../services/exportService';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: Project;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, projectData }) => {
  if (!isOpen) return null;

  // Memoize HTML generation to avoid re-calculating on every render if props don't change
  const htmlContent = useMemo(() => {
    return generateFlipbookHtml(projectData);
  }, [projectData]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shadow-lg">
        <div className="flex items-center gap-3">
            <span className="text-indigo-400 font-bold tracking-wider uppercase text-xs border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 rounded">
                Aperçu
            </span>
            <h2 className="text-white font-medium text-sm">
                {projectData.name} <span className="text-slate-500 mx-2">|</span> Liseuse Interactive
            </h2>
        </div>
        <div className="flex items-center gap-4">
             <div className="text-xs text-slate-400 flex items-center gap-2">
                 <Loader2 size={12} className="animate-spin text-indigo-500" />
                 Chargement des librairies (Three.js, PageFlip)...
             </div>
             <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
                title="Fermer l'aperçu"
             >
                <X size={20} />
             </button>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 w-full h-full bg-slate-950 relative">
        <iframe 
            srcDoc={htmlContent}
            title="Preview"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
};
