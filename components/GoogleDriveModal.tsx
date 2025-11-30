
import React, { useState } from 'react';
import { X, Cloud, Download, Link2, FileJson, Check, AlertCircle, ExternalLink, FileText, Image as ImageIcon, Video, File } from 'lucide-react';
import { Project, ElementType } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (type: ElementType, content: string) => void;
  projectData: Project;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose, onImport, projectData }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importLink, setImportLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
      setError(null);
      setSuccessMsg(null);
      
      const link = importLink.trim();
      if (!link) return;

      let fileId = null;
      let embedUrl = null;
      let type = ElementType.HTML;

      // 1. Extract ID
      // Matches /d/ID, id=ID, /e/ID (forms)
      const idMatch = link.match(/(?:\/d\/|id=|\/e\/)([a-zA-Z0-9_-]{20,})/);
      
      if (idMatch && idMatch[1]) {
          fileId = idMatch[1];
      }

      if (!fileId) {
          setError("Impossible de trouver l'ID du fichier dans ce lien.");
          return;
      }

      // 2. Determine Service Type & Construct Embed URL
      if (link.includes('docs.google.com/document')) {
          embedUrl = `https://docs.google.com/document/d/${fileId}/preview?embedded=true`;
      } else if (link.includes('docs.google.com/spreadsheets')) {
          embedUrl = `https://docs.google.com/spreadsheets/d/${fileId}/preview?embedded=true`;
      } else if (link.includes('docs.google.com/presentation')) {
          embedUrl = `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`;
      } else if (link.includes('docs.google.com/forms') || link.includes('/forms/')) {
          embedUrl = `https://docs.google.com/forms/d/e/${fileId}/viewform?embedded=true`;
      } else if (link.includes('drive.google.com/file')) {
          // Generic file (Video, PDF, Image)
          embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      } else {
          // Fallback
          embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }

      if (embedUrl) {
          const iframeContent = `<iframe src="${embedUrl}" width="100%" height="100%" style="border:none; border-radius:12px;" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
          onImport(ElementType.HTML, iframeContent);
          setSuccessMsg("Fichier importé avec succès sur la page !");
          setTimeout(() => {
              setImportLink('');
              setSuccessMsg(null);
              onClose();
          }, 1500);
      } else {
          setError("Type de lien non reconnu.");
      }
  };

  const handleExport = () => {
      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projet-manuel-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      setSuccessMsg("Fichier téléchargé !");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Cloud className="text-indigo-600" size={20} />
            Google Drive
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('import')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
                Importer un Fichier
            </button>
            <button 
                onClick={() => setActiveTab('export')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'export' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
                Exporter vers Drive
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            {activeTab === 'import' ? (
                <div className="flex flex-col gap-6">
                    {/* Step 1: Open Drive */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <p className="text-sm text-slate-600 mb-3 font-medium">1. Ouvrez votre Drive pour trouver le fichier</p>
                        <a 
                            href="https://drive.google.com" 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                        >
                            Ouvrir mon Google Drive <ExternalLink size={14} />
                        </a>
                    </div>

                    {/* Step 2: Paste Link */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">2. Collez le lien de partage</label>
                        <div className="relative">
                            <Link2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                value={importLink}
                                onChange={(e) => setImportLink(e.target.value)}
                                placeholder="https://docs.google.com/document/d/..." 
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic flex items-start gap-1">
                            <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
                            Astuce: Clic droit sur le fichier > Partager > Copier le lien. Assurez-vous que l'accès est "Public" ou "Tous les utilisateurs".
                        </p>
                    </div>

                    {/* Supported Types Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center gap-1 p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <FileText size={20} className="text-blue-600" />
                            <span className="text-[9px] font-semibold text-blue-700">Docs/PDF</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                            <File size={20} className="text-yellow-600" />
                            <span className="text-[9px] font-semibold text-yellow-700">Slides</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-2 bg-red-50 rounded-lg border border-red-100">
                            <Video size={20} className="text-red-600" />
                            <span className="text-[9px] font-semibold text-red-700">Vidéo</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-2 bg-purple-50 rounded-lg border border-purple-100">
                            <ImageIcon size={20} className="text-purple-600" />
                            <span className="text-[9px] font-semibold text-purple-700">Image</span>
                        </div>
                    </div>

                    {error && <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">{error}</div>}
                    {successMsg && <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100 flex items-center gap-1"><Check size={12}/> {successMsg}</div>}

                    <button 
                        onClick={handleImport}
                        disabled={!importLink.trim()}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        Importer le fichier
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-6 items-center text-center py-4">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-2 animate-bounce-slow">
                        <FileJson className="text-indigo-600" size={40} />
                    </div>
                    
                    <div>
                        <h3 className="text-slate-800 font-bold text-lg">Sauvegarder le Projet</h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                            Téléchargez le fichier de projet (.json) sur votre ordinateur, puis glissez-le manuellement dans votre dossier Google Drive.
                        </p>
                    </div>

                    <button 
                        onClick={handleExport}
                        className="w-full bg-slate-800 text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Download size={18} /> Télécharger le fichier .json
                    </button>
                    
                    {successMsg && <div className="text-xs text-green-600 flex items-center gap-1"><Check size={12}/> {successMsg}</div>}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
