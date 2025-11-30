
import React, { useState } from 'react';
import { X, Database, Plus, Trash2, Link2, Download, Check, AlertCircle, FileJson, Loader2 } from 'lucide-react';
import { DataSource } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportData: (sources: DataSource[]) => void;
  existingSources: DataSource[];
}

interface InputField {
    id: string;
    name: string;
    url: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorMsg?: string;
}

export const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose, onImportData, existingSources = [] }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'view'>('models');
  
  // Dynamic Inputs State
  const [inputs, setInputs] = useState<InputField[]>([
      { id: uuidv4(), name: 'Modèle 1', url: '', status: 'idle' }
  ]);

  if (!isOpen) return null;

  const handleAddField = () => {
      setInputs([...inputs, { id: uuidv4(), name: `Modèle ${inputs.length + 1}`, url: '', status: 'idle' }]);
  };

  const handleRemoveField = (id: string) => {
      if (inputs.length > 1) {
          setInputs(inputs.filter(i => i.id !== id));
      }
  };

  const updateInput = (id: string, field: keyof InputField, value: string) => {
      setInputs(inputs.map(i => i.id === id ? { ...i, [field]: value, status: 'idle' } : i));
  };

  const processGoogleDriveLink = (url: string): string => {
      // Convert Viewer link to Download link for JSON fetching
      // Viewer: https://drive.google.com/file/d/FILE_ID/view...
      // Download: https://drive.google.com/uc?export=download&id=FILE_ID
      const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
          return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
      }
      return url;
  };

  const handleImport = async () => {
      const newSources: DataSource[] = [];
      const updatedInputs = [...inputs];
      let hasErrors = false;

      for (let i = 0; i < updatedInputs.length; i++) {
          const input = updatedInputs[i];
          if (!input.url.trim()) continue;

          updatedInputs[i].status = 'loading';
          setInputs([...updatedInputs]); // Force update UI

          try {
              const fetchUrl = processGoogleDriveLink(input.url);
              const response = await fetch(fetchUrl);
              
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              
              const jsonData = await response.json();
              
              updatedInputs[i].status = 'success';
              newSources.push({
                  id: uuidv4(),
                  name: input.name,
                  sourceUrl: input.url,
                  data: jsonData,
                  timestamp: Date.now()
              });

          } catch (err: any) {
              console.error(err);
              updatedInputs[i].status = 'error';
              updatedInputs[i].errorMsg = "Impossible de charger le JSON (CORS ou Format invalide)";
              hasErrors = true;
          }
      }

      setInputs(updatedInputs);

      if (newSources.length > 0) {
          onImportData(newSources);
          if (!hasErrors) {
              setTimeout(() => {
                  onClose();
                  // Reset for next time
                  setInputs([{ id: uuidv4(), name: 'Modèle 1', url: '', status: 'idle' }]);
              }, 1500);
          }
      }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] no-print backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-indigo-600" size={20} />
            Gestion des Données (Data)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4">
            <button 
                onClick={() => setActiveTab('models')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'models' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Importer Modèles JSON
            </button>
            <button 
                onClick={() => setActiveTab('view')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'view' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Données Chargées ({existingSources.length})
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === 'models' ? (
                <div className="flex flex-col gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2 mb-2">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            Collez les liens de partage <strong>Google Drive</strong> de vos fichiers JSON.<br/>
                            Assurez-vous que les fichiers sont partagés en <strong>"Tous les utilisateurs disposant du lien"</strong>.
                        </div>
                    </div>

                    {inputs.map((input, idx) => (
                        <div key={input.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2">
                            <div className="flex gap-3 mb-2">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nom du Modèle</label>
                                    <input 
                                        type="text" 
                                        value={input.name} 
                                        onChange={(e) => updateInput(input.id, 'name', e.target.value)}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Ex: Données Géographie"
                                    />
                                </div>
                                <div className="w-[60%]">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">URL JSON (Google Drive)</label>
                                    <div className="relative">
                                        <Link2 className="absolute left-2.5 top-2 text-slate-400" size={14} />
                                        <input 
                                            type="text" 
                                            value={input.url} 
                                            onChange={(e) => updateInput(input.id, 'url', e.target.value)}
                                            className="w-full border border-slate-200 rounded pl-8 pr-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button 
                                        onClick={() => handleRemoveField(input.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Supprimer ce champ"
                                        disabled={inputs.length === 1}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Status Indicator */}
                            {input.status !== 'idle' && (
                                <div className="flex items-center gap-2 text-xs mt-2 border-t border-slate-100 pt-2">
                                    {input.status === 'loading' && <span className="text-indigo-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Chargement...</span>}
                                    {input.status === 'success' && <span className="text-green-600 flex items-center gap-1"><Check size={12}/> Données chargées avec succès !</span>}
                                    {input.status === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {input.errorMsg}</span>}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-center mt-2">
                        <button 
                            onClick={handleAddField}
                            className="flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-indigo-200"
                        >
                            <Plus size={16} /> Ajouter un autre fichier
                        </button>
                    </div>
                </div>
            ) : (
                // VIEW TAB
                <div className="flex flex-col gap-4">
                    {existingSources.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic">Aucune donnée importée.</div>
                    ) : (
                        existingSources.map(source => (
                            <div key={source.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <FileJson size={16} className="text-indigo-500" /> 
                                        {source.name}
                                    </h4>
                                    <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1 truncate max-w-[300px]">
                                        {source.sourceUrl} <Link2 size={10} />
                                    </a>
                                    <div className="text-xs text-slate-500 mt-2">
                                        Données JSON valides ({JSON.stringify(source.data).length} octets)
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                    Importé le {new Date(source.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>

        {/* Footer */}
        {activeTab === 'models' && (
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                <button 
                    onClick={handleImport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all font-medium"
                >
                    <Download size={18} /> Importer et Utiliser
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
