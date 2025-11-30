
import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Palette, Type as TypeIcon, Square, Volume2, Heading1, Heading2, Heading3, BoxSelect, Ban, Cloud, LogOut, Check, Loader2, User } from 'lucide-react';
import { AppSettings, PageBackground, ElementType, ElementStyle } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onReset: () => void;
}

const ELEMENT_LABELS: Partial<Record<ElementType, { label: string, icon: React.ReactNode }>> = {
    [ElementType.TEXT]: { label: 'Texte Standard', icon: <TypeIcon size={16} /> },
    [ElementType.SEQUENCE_TITLE]: { label: 'Titre Séquence', icon: <Heading1 size={16} /> },
    [ElementType.PART_TITLE]: { label: 'Titre Partie', icon: <Heading2 size={16} /> },
    [ElementType.H3_TITLE]: { label: 'Sous-titre H3', icon: <Heading3 size={16} /> },
    [ElementType.H4_TITLE]: { label: 'Sous-titre H4', icon: <Heading3 size={16} /> },
    [ElementType.SHAPE]: { label: 'Forme', icon: <Square size={16} /> },
    [ElementType.SECTION]: { label: 'Zone IA', icon: <BoxSelect size={16} /> },
    [ElementType.AUDIO]: { label: 'Lecteur Audio', icon: <Volume2 size={16} /> },
};

type SettingsTab = ElementType | 'drive';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onReset }) => {
  const [tempSettings, setTempSettings] = React.useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>(ElementType.TEXT);
  
  // Google Drive Mock State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
        setTempSettings(settings);
        // Check "persistence"
        const connected = localStorage.getItem('google_drive_connected') === 'true';
        setIsDriveConnected(connected);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handlePageChange = (key: string, value: any) => {
    setTempSettings(prev => ({
        ...prev,
        defaultPage: { ...prev.defaultPage, [key]: value }
    }));
  };

  const handleElementChange = (type: ElementType, key: keyof ElementStyle, value: any) => {
      setTempSettings(prev => ({
          ...prev,
          elementDefaults: {
              ...prev.elementDefaults,
              [type]: {
                  ...(prev.elementDefaults[type] || {}),
                  [key]: value
              }
          }
      }));
  };

  const handleDriveConnect = () => {
      setIsConnecting(true);
      setTimeout(() => {
          setIsConnecting(false);
          setIsDriveConnected(true);
          localStorage.setItem('google_drive_connected', 'true');
      }, 1500);
  };

  const handleDriveDisconnect = () => {
      setIsDriveConnected(false);
      localStorage.removeItem('google_drive_connected');
  };

  const fonts = ['Inter', 'Merriweather'];
  const patterns: {id: PageBackground, label: string}[] = [
      {id: 'none', label: 'Aucun'},
      {id: 'lines', label: 'Ligné'},
      {id: 'grid', label: 'Quadrillé'},
      {id: 'seyes', label: 'Seyès'},
      {id: 'dots', label: 'Points'},
  ];

  const renderColorInput = (label: string, value: string | undefined, onChange: (v: string) => void) => {
      const isTransparent = value === 'transparent';
      return (
          <div>
              <label className="text-xs text-slate-500 mb-1 block">{label}</label>
              <div className="flex gap-2">
                  <div className="relative flex-1 h-8">
                       <input 
                          type="color" 
                          value={isTransparent ? '#ffffff' : (value || '#000000')} 
                          onChange={(e) => onChange(e.target.value)}
                          className="w-full h-full rounded border border-slate-300 cursor-pointer absolute inset-0 opacity-0 z-10"
                       />
                       <div className="w-full h-full rounded border border-slate-300 flex items-center px-2 bg-white">
                           {isTransparent ? <span className="text-xs text-slate-400 italic">Transparent</span> : (
                               <>
                                <div className="w-4 h-4 rounded border border-slate-200 mr-2" style={{backgroundColor: value}}></div>
                                <span className="text-xs text-slate-600">{value}</span>
                               </>
                           )}
                       </div>
                  </div>
                  <button onClick={() => onChange('transparent')} className="p-2 border border-slate-200 rounded hover:bg-slate-50 text-slate-500" title="Transparent">
                      <Ban size={14} />
                  </button>
              </div>
          </div>
      );
  };

  // Render Content based on Active Tab
  const renderContent = () => {
      if (activeTab === 'drive') {
          return (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-100">
                      <div className="p-2 bg-blue-50 rounded text-blue-600">
                          <Cloud size={24} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-800">Google Drive</h3>
                          <p className="text-xs text-slate-500">Gérez la connexion à votre espace de stockage cloud.</p>
                      </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      {isDriveConnected ? (
                          <div className="flex flex-col gap-6">
                              <div className="flex items-center gap-4 bg-green-50 border border-green-200 p-4 rounded-lg">
                                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-green-100 text-green-600 shadow-sm">
                                      <User size={24} />
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <h4 className="font-bold text-slate-800">Compte Connecté</h4>
                                          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                              <Check size={10} /> Actif
                                          </span>
                                      </div>
                                      <p className="text-sm text-slate-600">utilisateur@gmail.com</p>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                                      <span>Espace utilisé (Simulé)</span>
                                      <span>12.5 GB / 15 GB</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500 w-[83%] rounded-full"></div>
                                  </div>
                              </div>

                              <div className="pt-4 border-t border-slate-100">
                                  <button 
                                      onClick={handleDriveDisconnect}
                                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-100"
                                  >
                                      <LogOut size={16} /> Déconnecter le compte
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center text-center py-8">
                              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                  <Cloud size={32} />
                              </div>
                              <h4 className="text-lg font-bold text-slate-800 mb-2">Connectez votre compte</h4>
                              <p className="text-sm text-slate-500 max-w-xs mb-6">
                                  Liez votre Google Drive pour sauvegarder vos projets et importer vos fichiers directement.
                              </p>
                              <button 
                                  onClick={handleDriveConnect}
                                  disabled={isConnecting}
                                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-wait"
                              >
                                  {isConnecting ? (
                                      <>
                                          <Loader2 size={18} className="animate-spin" /> Connexion...
                                      </>
                                  ) : (
                                      <>
                                          <Cloud size={18} /> Se connecter avec Google
                                      </>
                                  )}
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          );
      }

      // Default: Element Editor
      const selectedType = activeTab as ElementType;
      const currentStyle = tempSettings.elementDefaults[selectedType] || {};

      return (
          <div className="flex flex-col gap-0 h-full">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 flex-shrink-0">
                    <div className="p-2 bg-indigo-50 rounded text-indigo-600">
                        {ELEMENT_LABELS[selectedType]?.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{ELEMENT_LABELS[selectedType]?.label}</h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Typography */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Typographie</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {renderColorInput("Couleur Texte", currentStyle.color, (v) => handleElementChange(selectedType, 'color', v))}
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Taille (px)</label>
                                    <input type="number" value={currentStyle.fontSize || 16} onChange={(e) => handleElementChange(selectedType, 'fontSize', parseInt(e.target.value))} className="w-full h-8 border border-slate-300 rounded px-2" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-slate-500 mb-1 block">Police</label>
                                    <select value={currentStyle.fontFamily || 'Inter'} onChange={(e) => handleElementChange(selectedType, 'fontFamily', e.target.value)} className="w-full h-8 border border-slate-300 rounded px-2 text-sm bg-white">
                                        {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Apparence</h4>
                            <div className="space-y-4">
                                {renderColorInput("Couleur de Fond", currentStyle.backgroundColor, (v) => handleElementChange(selectedType, 'backgroundColor', v))}
                                
                                {/* Special case for PART_TITLE: Border Color is prominent */}
                                {selectedType === ElementType.PART_TITLE && renderColorInput("Couleur Bordure (Gauche)", currentStyle.borderColor, (v) => handleElementChange(selectedType, 'borderColor', v))}

                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Arrondi ({currentStyle.borderRadius || 0}px)</label>
                                    <input type="range" min="0" max="50" value={currentStyle.borderRadius || 0} onChange={(e) => handleElementChange(selectedType, 'borderRadius', parseInt(e.target.value))} className="w-full accent-indigo-600" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Épaisseur Bordure</label>
                                        <input type="number" min="0" value={currentStyle.borderWidth || 0} onChange={(e) => handleElementChange(selectedType, 'borderWidth', parseInt(e.target.value))} className="w-full h-8 border border-slate-300 rounded px-2" />
                                    </div>
                                    {selectedType !== ElementType.PART_TITLE && renderColorInput("Couleur Bordure", currentStyle.borderColor, (v) => handleElementChange(selectedType, 'borderColor', v))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Preview Box */}
                        <div className="col-span-1 md:col-span-2 mt-4">
                            <h4 className="text-sm font-bold text-slate-900 border-b pb-2 mb-4">Aperçu</h4>
                            <div className="bg-slate-100 p-8 rounded-xl flex items-center justify-center border border-dashed border-slate-300">
                                <div style={{
                                    backgroundColor: currentStyle.backgroundColor || 'transparent',
                                    color: currentStyle.color || '#000',
                                    fontFamily: currentStyle.fontFamily,
                                    fontSize: `${currentStyle.fontSize}px`,
                                    borderRadius: `${currentStyle.borderRadius}px`,
                                    borderWidth: `${currentStyle.borderWidth}px`,
                                    borderColor: currentStyle.borderColor || 'transparent',
                                    borderStyle: currentStyle.borderWidth ? 'solid' : 'none',
                                    padding: '16px 24px',
                                    boxShadow: currentStyle.boxShadow,
                                    minWidth: '200px',
                                    textAlign: 'center',
                                    // Special styles for specific types simulation
                                    ...(selectedType === ElementType.PART_TITLE ? { borderLeftWidth: '4px', borderLeftColor: currentStyle.borderColor, borderTopWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 } : {})
                                }}>
                                    {selectedType === ElementType.TEXT ? 'Exemple de texte' :
                                    selectedType === ElementType.SEQUENCE_TITLE ? 'TITRE SÉQUENCE' :
                                    selectedType === ElementType.PART_TITLE ? 'TITRE PARTIE' :
                                    selectedType === ElementType.H3_TITLE ? 'Sous-titre H3' :
                                    selectedType === ElementType.H4_TITLE ? 'Sous-titre H4' :
                                    selectedType === ElementType.SECTION ? 'Zone IA' :
                                    'Élément'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] no-print backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[85vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Palette className="text-indigo-600" size={20} />
            Paramètres par défaut
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto">
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pages</h3>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Couleur Fond</label>
                        <input type="color" value={tempSettings.defaultPage.backgroundColor} onChange={(e) => handlePageChange('backgroundColor', e.target.value)} className="w-full h-8 rounded border border-slate-300 cursor-pointer mb-2" />
                        
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Motif</label>
                        <select value={tempSettings.defaultPage.background} onChange={(e) => handlePageChange('background', e.target.value)} className="w-full h-8 border border-slate-300 rounded px-2 text-xs bg-slate-50">
                            {patterns.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Éléments</h3>
                <div className="flex flex-col gap-1">
                    {Object.entries(ELEMENT_LABELS).map(([type, info]) => (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type as ElementType)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === type ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            {info.icon} {info.label}
                        </button>
                    ))}
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6">Intégrations</h3>
                <button 
                    onClick={() => setActiveTab('drive')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${activeTab === 'drive' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Cloud size={16} /> Google Drive
                </button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-white">
                {renderContent()}
            </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
            <button onClick={() => { onReset(); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                <RotateCcw size={16} /> Rétablir défauts
            </button>
            <button onClick={() => { onSave(tempSettings); onClose(); }} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-sm font-medium">
                <Save size={16} /> Enregistrer les changements
            </button>
        </div>
      </div>
    </div>
  );
};
