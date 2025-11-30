
import React, { useState, useEffect } from 'react';
import { PageElement, ElementType, Page, PageBackground } from '../types';
import { Trash2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Type as TypeIcon, Wand2, Code, Layers, ArrowUp, ArrowDown, Eraser, Square, Grid, FileText, MoreHorizontal, Link2, Palette, Sparkles, Loader2, ImagePlus, X, Ban, Columns, Unlink, Video, Search, PlayCircle, Volume2, QrCode, Heading1, Heading2, Heading3, Heading4, BoxSelect, PenTool, CheckSquare, Binary, Box, LayoutTemplate, Puzzle, ListChecks, Clock, Network, MonitorPlay, RotateCcw, Edit3 } from 'lucide-react';
import { analyzeAndImproveText, generatePageTexture, searchYoutubeVideos, modifyCodeWithAI, editImageWithGemini } from '../services/geminiService';

interface PropertiesPanelProps {
  elements: PageElement[]; // Changed from single element to array
  currentPage?: Page;
  onUpdate: (id: string, updates: Partial<PageElement>) => void;
  onDelete: (id: string) => void;
  onUpdatePage?: (id: string, updates: Partial<Page>) => void;
}

const TYPE_LABELS: Partial<Record<ElementType, { label: string, icon: any }>> = {
    [ElementType.TEXT]: { label: 'Texte', icon: TypeIcon },
    [ElementType.IMAGE]: { label: 'Image', icon: ImagePlus },
    [ElementType.VIDEO]: { label: 'Vidéo', icon: Video },
    [ElementType.AUDIO]: { label: 'Audio', icon: Volume2 },
    [ElementType.QR_CODE]: { label: 'QR Code', icon: QrCode },
    [ElementType.SHAPE]: { label: 'Forme', icon: Square },
    [ElementType.SECTION]: { label: 'Zone IA', icon: BoxSelect },
    [ElementType.HTML]: { label: 'Code / Mini-App', icon: Code },
    [ElementType.SVG]: { label: 'SVG', icon: PenTool },
    [ElementType.QCM]: { label: 'QCM', icon: CheckSquare },
    [ElementType.CONNECT_DOTS]: { label: 'Points à Relier', icon: Binary },
    [ElementType.THREED_MODEL]: { label: 'Modèle 3D', icon: Box },
    [ElementType.SEQUENCE_TITLE]: { label: 'Titre Séquence', icon: Heading1 },
    [ElementType.PART_TITLE]: { label: 'Titre Partie', icon: Heading2 },
    [ElementType.H3_TITLE]: { label: 'Sous-titre H3', icon: Heading3 },
    [ElementType.H4_TITLE]: { label: 'Sous-titre H4', icon: Heading4 },
    [ElementType.TOC]: { label: 'Sommaire', icon: FileText },
    [ElementType.COLUMNS]: { label: 'Colonnes', icon: Columns },
    [ElementType.FLASHCARDS]: { label: 'Flashcards', icon: LayoutTemplate },
    [ElementType.MATCHING]: { label: 'Appariement', icon: Puzzle },
    [ElementType.TRUE_FALSE]: { label: 'Vrai / Faux', icon: ListChecks },
    [ElementType.TIMELINE]: { label: 'Frise Chrono', icon: Clock },
    [ElementType.MIND_MAP]: { label: 'Carte Mentale', icon: Network },
    [ElementType.FILL_IN_THE_BLANKS]: { label: 'Texte à Trous', icon: MonitorPlay },
};

// Sub-component for Code Editing
const CodeEditor: React.FC<{ content: string; onChange: (val: string) => void }> = ({ content, onChange }) => {
    const [value, setValue] = useState(content);
    useEffect(() => { if (content !== value) setValue(content); }, [content]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onChange(newValue);
    };
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-end gap-2">
                 <button onClick={() => { setValue(''); onChange(''); }} className="text-xs flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors"><Eraser size={12} /> Effacer</button>
            </div>
            <textarea value={value} onChange={handleChange} className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono bg-slate-50 min-h-[200px] focus:ring-2 focus:ring-indigo-500 outline-none" spellCheck={false} placeholder="Code..." />
        </div>
    );
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ elements, currentPage, onUpdate, onDelete, onUpdatePage }) => {
  const [isImproving, setIsImproving] = React.useState(false);
  
  // AI Texture State
  const [texturePrompt, setTexturePrompt] = useState('');
  const [lastTexturePrompt, setLastTexturePrompt] = useState('');
  const [isGeneratingTexture, setIsGeneratingTexture] = useState(false);

  // Video Search State
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [isVideoSearching, setIsVideoSearching] = useState(false);
  const [videoSearchResults, setVideoSearchResults] = useState<{title: string, url: string, description: string}[]>([]);

  // AI Code Modification State
  const [aiModificationPrompt, setAiModificationPrompt] = useState('');
  const [isModifyingCode, setIsModifyingCode] = useState(false);

  // AI Image Edit State
  const [imageEditPrompt, setImageEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);

  const handleGenerateTexture = async (specificPrompt?: string) => {
      const promptToUse = specificPrompt || texturePrompt;
      if (!currentPage || !onUpdatePage || !promptToUse.trim()) return;
      
      if (!specificPrompt) setLastTexturePrompt(promptToUse);
      
      setIsGeneratingTexture(true);
      const textureUrl = await generatePageTexture(promptToUse);
      if (textureUrl) {
          onUpdatePage(currentPage.id, { backgroundImage: textureUrl });
      } else {
          alert("Erreur de génération de texture.");
      }
      setIsGeneratingTexture(false);
      if (!specificPrompt) setTexturePrompt('');
  };

  const handleVideoSearch = async () => {
      if (!videoSearchQuery.trim()) return;
      setIsVideoSearching(true);
      const results = await searchYoutubeVideos(videoSearchQuery);
      setVideoSearchResults(results);
      setIsVideoSearching(false);
  };

  const handleImageEdit = async () => {
      if (!imageEditPrompt.trim() || elements[0].type !== ElementType.IMAGE) return;
      
      setIsEditingImage(true);
      const newImage = await editImageWithGemini(elements[0].content, imageEditPrompt);
      if (newImage) {
          onUpdate(elements[0].id, { content: newImage });
          setImageEditPrompt('');
      } else {
          alert("Impossible de modifier l'image. Vérifiez la connexion ou le prompt.");
      }
      setIsEditingImage(false);
  };

  // Helper for Color Picker with Transparent option
  const renderColorControl = (label: string, value: string | undefined, onChange: (val: string) => void) => {
      const isTransparent = value === 'transparent' || value === 'rgba(0,0,0,0)';
      return (
          <div>
              <label className="text-xs text-slate-500 mb-1 block">{label}</label>
              <div className="flex gap-2">
                   <div className="relative flex-1">
                       {isTransparent && (
                           <div className="absolute inset-0 flex items-center justify-center bg-white border border-slate-200 rounded pointer-events-none z-10">
                               <span className="text-[10px] text-slate-400 italic">Transparent</span>
                           </div>
                       )}
                       <input 
                          type="color" 
                          value={isTransparent ? '#ffffff' : (value || '#000000')} 
                          onChange={(e) => onChange(e.target.value)} 
                          className="h-8 w-full rounded cursor-pointer border border-slate-200" 
                       />
                   </div>
                   <button 
                      onClick={() => onChange('transparent')}
                      className={`px-2 rounded border text-xs flex items-center justify-center ${isTransparent ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      title="Rendre transparent"
                   >
                      <Ban size={14} />
                   </button>
              </div>
          </div>
      );
  };

  // --- PAGE PROPERTIES (No Element Selected) ---
  if (elements.length === 0) {
    return (
      <div className="w-full h-full bg-white p-5 border-l border-slate-200 no-print flex flex-col gap-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-700">Page</h3>
        </div>
        
        {currentPage && onUpdatePage && (
            <div className="flex flex-col gap-5">
                {/* 1. Background Color */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Palette size={12} /> Couleur de fond</label>
                    {renderColorControl(
                        "Couleur unie", 
                        currentPage.backgroundColor || '#ffffff', 
                        (val) => onUpdatePage(currentPage.id, { backgroundColor: val })
                    )}
                </div>

                {/* 2. Patterns */}
                <div>
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2"><Grid size={12} /> Motif Papier</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => onUpdatePage(currentPage.id, { background: 'none' })} 
                            className={`h-16 rounded border flex flex-col items-center justify-center gap-1 text-[10px] ${!currentPage.background || currentPage.background === 'none' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                        >
                            <div className="w-6 h-6 bg-white border border-slate-200 rounded-sm"></div>
                            Aucun
                        </button>
                        <button 
                            onClick={() => onUpdatePage(currentPage.id, { background: 'lines' })} 
                            className={`h-16 rounded border flex flex-col items-center justify-center gap-1 text-[10px] ${currentPage.background === 'lines' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                        >
                            <div className="w-6 h-6 bg-white border border-slate-200 rounded-sm flex flex-col justify-evenly px-0.5">
                                <div className="h-px bg-slate-300 w-full"></div>
                                <div className="h-px bg-slate-300 w-full"></div>
                                <div className="h-px bg-slate-300 w-full"></div>
                            </div>
                            Ligné
                        </button>
                        <button 
                            onClick={() => onUpdatePage(currentPage.id, { background: 'grid' })} 
                            className={`h-16 rounded border flex flex-col items-center justify-center gap-1 text-[10px] ${currentPage.background === 'grid' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                        >
                            <div className="w-6 h-6 bg-white border border-slate-200 rounded-sm" style={{backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '4px 4px'}}></div>
                            Quadrillé
                        </button>
                        <button 
                            onClick={() => onUpdatePage(currentPage.id, { background: 'seyes' })} 
                            className={`h-16 rounded border flex flex-col items-center justify-center gap-1 text-[10px] ${currentPage.background === 'seyes' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                        >
                            <div className="w-6 h-6 bg-white border border-slate-200 rounded-sm flex flex-col justify-evenly relative overflow-hidden">
                                <div className="absolute inset-0 opacity-50" style={{backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '100% 3px'}}></div>
                                <div className="h-px bg-blue-400 w-full relative z-10"></div>
                                <div className="h-px bg-blue-400 w-full relative z-10"></div>
                            </div>
                            Seyès
                        </button>
                        <button 
                            onClick={() => onUpdatePage(currentPage.id, { background: 'dots' })} 
                            className={`h-16 rounded border flex flex-col items-center justify-center gap-1 text-[10px] ${currentPage.background === 'dots' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                        >
                            <div className="w-6 h-6 bg-white border border-slate-200 rounded-sm" style={{backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '4px 4px'}}></div>
                            Points
                        </button>
                    </div>
                </div>

                {/* 3. AI Texture / Image */}
                <div className="border-t border-slate-100 pt-3">
                     <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2"><ImagePlus size={12} /> Texture / Image de fond</label>
                     
                     {currentPage.backgroundImage ? (
                         <div className="relative w-full h-32 rounded-lg border border-slate-200 overflow-hidden group">
                             <img src={currentPage.backgroundImage} className="w-full h-full object-cover opacity-80" alt="Background" />
                             
                             {/* Remove Button */}
                             <button 
                                onClick={() => onUpdatePage(currentPage.id, { backgroundImage: undefined })}
                                className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Supprimer l'image"
                             >
                                 <X size={14} />
                             </button>

                             {/* Regenerate Button - Only if we have a prompt */}
                             {lastTexturePrompt && (
                                 <button 
                                    onClick={() => handleGenerateTexture(lastTexturePrompt)}
                                    disabled={isGeneratingTexture}
                                    className="absolute top-2 right-10 bg-white/90 p-1.5 rounded-full text-indigo-600 hover:bg-indigo-50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title={`Régénérer : "${lastTexturePrompt}"`}
                                 >
                                     {isGeneratingTexture ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                 </button>
                             )}
                         </div>
                     ) : (
                         <div className="flex flex-col gap-2">
                             <div className="flex gap-1">
                                <input 
                                    type="text" 
                                    value={texturePrompt} 
                                    onChange={(e) => setTexturePrompt(e.target.value)} 
                                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs" 
                                    placeholder="Ex: texture papier ancien, aquarelle..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateTexture()}
                                />
                                <button 
                                    onClick={() => handleGenerateTexture()} 
                                    disabled={isGeneratingTexture || !texturePrompt.trim()}
                                    className="bg-indigo-600 text-white p-1.5 rounded disabled:opacity-50"
                                >
                                    {isGeneratingTexture ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                </button>
                             </div>
                             <p className="text-[10px] text-slate-400">Générez une texture unique avec l'IA.</p>
                         </div>
                     )}
                </div>
            </div>
        )}
        
        <div className="border-t border-slate-100 pt-4 text-xs text-slate-400 text-center italic mt-auto">
            Sélectionnez un élément pour modifier ses propriétés spécifiques.
        </div>
      </div>
    );
  }

  // --- ELEMENT PROPERTIES ---
  const isMulti = elements.length > 1;
  const firstEl = elements[0];
  
  // Helper to apply to all selected
  const handleStyleChange = (key: string, value: any) => {
    elements.forEach(el => {
        onUpdate(el.id, { style: { ...el.style, [key]: value } });
    });
  };

  const handleContentChange = (val: string) => {
      // Content change only allowed if single selection
      if (!isMulti) onUpdate(firstEl.id, { content: val });
  };

  const handleAIImprove = async () => {
    if (isMulti || firstEl.type !== ElementType.TEXT) return;
    setIsImproving(true);
    const improved = await analyzeAndImproveText(firstEl.content);
    onUpdate(firstEl.id, { content: improved });
    setIsImproving(false);
  };

  // AI Code Modification Handler
  const handleModifyCode = async () => {
      if (!aiModificationPrompt.trim()) return;
      setIsModifyingCode(true);
      const newCode = await modifyCodeWithAI(firstEl.content, aiModificationPrompt);
      if (newCode) {
          onUpdate(firstEl.id, { content: newCode });
          setAiModificationPrompt('');
      } else {
          alert("Impossible de modifier le code avec l'IA.");
      }
      setIsModifyingCode(false);
  };

  // Helper to extract/update .card background in HTML content
  const getCardColor = (content: string) => {
      if (!content) return '#ffffff';
      const match = content.match(/\.card\s*\{[^}]*background:\s*([^;!}]+)/);
      if (match) {
          const c = match[1].trim();
          if (c === 'white') return '#ffffff';
          if (c.startsWith('#')) return c;
      }
      return '#ffffff';
  };

  // Handle Layers
  const handleLayer = (action: 'front' | 'back' | 'up' | 'down') => {
      elements.forEach(el => {
          let newZ = el.style.zIndex;
          if (action === 'front') newZ = 100;
          if (action === 'back') newZ = 1;
          if (action === 'up') newZ += 1;
          if (action === 'down') newZ = Math.max(0, newZ - 1);
          onUpdate(el.id, { style: { ...el.style, zIndex: newZ } });
      });
  };

  const isHtmlType = [
      ElementType.HTML, ElementType.QCM, ElementType.FILL_IN_THE_BLANKS, 
      ElementType.MATCHING, ElementType.TIMELINE, ElementType.FLASHCARDS, 
      ElementType.TRUE_FALSE, ElementType.MIND_MAP, ElementType.SVG, ElementType.CONNECT_DOTS
  ].includes(firstEl.type);

  // --- COLUMNS EDITOR LOGIC ---
  const renderColumnsEditor = () => {
      if (firstEl.type !== ElementType.COLUMNS) return null;
      
      let columns: string[] = [];
      try { columns = JSON.parse(firstEl.content || '[]'); } catch(e) { columns = []; }
      
      const updateColumnCount = (count: number) => {
          let newCols = [...columns];
          if (count > newCols.length) {
              // Add empty columns
              while(newCols.length < count) newCols.push("Nouvelle colonne");
          } else if (count < newCols.length) {
              // Trim columns
              newCols = newCols.slice(0, count);
          }
          handleContentChange(JSON.stringify(newCols));
      };

      return (
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-3">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Columns size={12} /> Configuration Colonnes</label>
              
              <div className="flex gap-4">
                  <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Nombre ({columns.length})</label>
                      <input 
                        type="range" min="2" max="4" step="1" 
                        value={columns.length} 
                        onChange={(e) => updateColumnCount(parseInt(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                  </div>
                  <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Espace (Gap)</label>
                      <input 
                        type="number" min="0" max="100" 
                        value={firstEl.style.gap || 20} 
                        onChange={(e) => handleStyleChange('gap', parseInt(e.target.value))}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                      />
                  </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Glissez des objets directement sur la zone pour les ajouter dans une colonne.</p>
          </div>
      );
  };

  return (
    <div className="w-full h-full bg-white p-5 border-l border-slate-200 no-print flex flex-col gap-5 overflow-y-auto z-50 scrollbar-thin" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2 text-slate-700">
            {isMulti ? (
                <span className="font-semibold">{elements.length} éléments</span>
            ) : (
                <>
                    {TYPE_LABELS[firstEl.type]?.icon && React.createElement(TYPE_LABELS[firstEl.type]!.icon, { size: 18, className: "text-indigo-600" })}
                    <h3 className="font-semibold text-sm">{TYPE_LABELS[firstEl.type]?.label || 'Propriétés'}</h3>
                </>
            )}
        </div>
        <button onClick={() => elements.forEach(el => onDelete(el.id))} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Supprimer">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Dimensions - Show/Edit only if single */}
      {!isMulti && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
                <label className="text-xs text-slate-500">Largeur</label>
                <input type="number" value={firstEl.width} onChange={(e) => onUpdate(firstEl.id, { width: parseInt(e.target.value) })} disabled={firstEl.type === ElementType.SEQUENCE_TITLE || !!firstEl.containerId} className="w-full border border-slate-200 rounded px-2 py-1 disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
            <div>
                <label className="text-xs text-slate-500">Hauteur</label>
                <input type="number" value={firstEl.height} onChange={(e) => onUpdate(firstEl.id, { height: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded px-2 py-1" />
            </div>
          </div>
      )}

      {/* Container Logic: Detach Button */}
      {firstEl.containerId && (
          <div className="bg-indigo-50 border border-indigo-200 rounded p-3 flex flex-col gap-2">
              <span className="text-xs font-bold text-indigo-700 flex items-center gap-1"><Columns size={12}/> Dans une Colonne</span>
              <button 
                onClick={() => onUpdate(firstEl.id, { containerId: undefined, containerColIndex: undefined })}
                className="w-full flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 py-1.5 rounded text-xs font-medium transition-colors"
              >
                  <Unlink size={14} /> Détacher
              </button>
          </div>
      )}

      {/* Z-Index */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
        <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Layers size={12} /> Calques</label>
        <div className="flex gap-1">
            <button onClick={() => handleLayer('back')} className="flex-1 bg-slate-50 hover:bg-slate-100 p-1.5 rounded text-xs text-slate-600" title="Arrière plan">Arr.</button>
            <button onClick={() => handleLayer('down')} className="flex-1 bg-slate-50 hover:bg-slate-100 p-1.5 rounded text-xs text-slate-600"><ArrowDown size={14}/></button>
            <button onClick={() => handleLayer('up')} className="flex-1 bg-slate-50 hover:bg-slate-100 p-1.5 rounded text-xs text-slate-600"><ArrowUp size={14}/></button>
            <button onClick={() => handleLayer('front')} className="flex-1 bg-slate-50 hover:bg-slate-100 p-1.5 rounded text-xs text-slate-600" title="Premier plan">Av.</button>
        </div>
      </div>

      {/* Content Editors (Single Selection Only) */}
      {!isMulti && (
          <>
            {(firstEl.type === ElementType.TEXT || firstEl.type === ElementType.SEQUENCE_TITLE || firstEl.type === ElementType.PART_TITLE || firstEl.type === ElementType.H3_TITLE || firstEl.type === ElementType.H4_TITLE) && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500">Texte</label>
                        {firstEl.type === ElementType.TEXT && <button onClick={handleAIImprove} disabled={isImproving} className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"><Wand2 size={12} /> {isImproving ? '...' : 'Améliorer'}</button>}
                    </div>
                    <textarea value={firstEl.content} onChange={(e) => handleContentChange(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm min-h-[80px]" />
                </div>
            )}
            
            {/* Columns Editor */}
            {renderColumnsEditor()}

            {/* AI Image Editing */}
            {firstEl.type === ElementType.IMAGE && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-indigo-700 flex items-center gap-1 mb-2">
                        <Edit3 size={12} /> Édition IA (Gemini 2.5 Flash Image)
                    </label>
                    <div className="flex flex-col gap-2">
                        <textarea 
                            value={imageEditPrompt}
                            onChange={(e) => setImageEditPrompt(e.target.value)}
                            placeholder="Ex: Ajouter un filtre retro, supprimer le fond, ajouter un chat..."
                            className="w-full border border-indigo-200 rounded px-2 py-1 text-xs min-h-[60px] focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                            onClick={handleImageEdit}
                            disabled={isEditingImage || !imageEditPrompt.trim()}
                            className="w-full bg-indigo-600 text-white text-xs py-1.5 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                            {isEditingImage ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            Modifier l'image
                        </button>
                    </div>
                </div>
            )}

            {firstEl.type === ElementType.AUDIO && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Link2 size={12} /> Source Audio (URL)</label>
                    <input type="text" value={firstEl.content} onChange={(e) => handleContentChange(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" placeholder="https://..." />
                    <p className="text-[10px] text-slate-400">URL valide ou Data URI (généré par IA).</p>
                </div>
            )}

            {firstEl.type === ElementType.QR_CODE && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Link2 size={12} /> Lien URL</label>
                    <input type="text" value={firstEl.content} onChange={(e) => handleContentChange(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" placeholder="https://..." />
                    <p className="text-[10px] text-slate-400">Entrez l'URL vers laquelle le QR Code doit pointer.</p>
                </div>
            )}

            {firstEl.type === ElementType.VIDEO && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Video size={12} /> URL Vidéo</label>
                    <input 
                        type="text" 
                        value={firstEl.content.startsWith('<iframe') ? 'Code Iframe (voir ci-dessous)' : firstEl.content} 
                        onChange={(e) => !firstEl.content.startsWith('<iframe') && handleContentChange(e.target.value)} 
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm" 
                        placeholder="https://youtube.com/..." 
                        disabled={firstEl.content.startsWith('<iframe')}
                    />
                    
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-2"><Code size={12} /> Code d'intégration (Embed)</label>
                    <textarea 
                        value={firstEl.content} 
                        onChange={(e) => handleContentChange(e.target.value)} 
                        className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono h-24 bg-slate-50" 
                        placeholder="<iframe src='...' ...></iframe>" 
                    />
                    
                    {/* Video Search Integration */}
                    <div className="border-t border-slate-200 mt-4 pt-3">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2"><Search size={12} /> Recherche Web Vidéo</label>
                        <div className="flex gap-2 mb-2">
                            <input 
                                type="text" 
                                value={videoSearchQuery}
                                onChange={(e) => setVideoSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleVideoSearch()}
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs" 
                                placeholder="Sujet (ex: Volcans)"
                            />
                            <button 
                                onClick={handleVideoSearch}
                                disabled={isVideoSearching || !videoSearchQuery.trim()}
                                className="bg-indigo-600 text-white p-1.5 rounded disabled:opacity-50"
                            >
                                {isVideoSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                        </div>
                        
                        {videoSearchResults.length > 0 && (
                            <div className="flex flex-col gap-2 mt-2 h-[200px] overflow-y-auto border border-slate-100 rounded p-1">
                                {videoSearchResults.map((res, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleContentChange(res.url)}
                                        className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <PlayCircle size={14} className="text-indigo-600 flex-shrink-0" />
                                            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 line-clamp-1">{res.title}</span>
                                        </div>
                                        <div className="text-[9px] text-slate-500 line-clamp-1 pl-5">{res.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isHtmlType && (
                 <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Code size={12} /> {firstEl.type === ElementType.QCM ? 'Données JSON' : 'Code HTML/SVG'}</label>
                    <CodeEditor content={firstEl.content} onChange={handleContentChange} />
                    
                    {/* AI Code Modifier */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-2">
                        <label className="text-xs font-bold text-indigo-700 flex items-center gap-1 mb-2">
                            <Sparkles size={12} /> Modifier avec l'IA
                        </label>
                        <div className="flex flex-col gap-2">
                            <textarea 
                                value={aiModificationPrompt}
                                onChange={(e) => setAiModificationPrompt(e.target.value)}
                                placeholder="Ex: Change la couleur du bouton en rouge, ajoute un titre..."
                                className="w-full border border-indigo-200 rounded px-2 py-1 text-xs min-h-[60px] focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <button 
                                onClick={handleModifyCode}
                                disabled={isModifyingCode || !aiModificationPrompt.trim()}
                                className="w-full bg-indigo-600 text-white text-xs py-1.5 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                {isModifyingCode ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                Appliquer les changements
                            </button>
                        </div>
                    </div>
                 </div>
            )}
            
            {/* .card CSS Color Picker */}
            {isHtmlType && firstEl.content.includes('.card') && (
                 <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 bg-indigo-50/50 p-2 rounded">
                    <label className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Palette size={12} /> Style Carte (Interne)</label>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Couleur de fond (.card)</label>
                        <div className="flex gap-2">
                             <input 
                                type="color" 
                                value={getCardColor(firstEl.content)} 
                                onChange={(e) => {
                                    const newColor = e.target.value;
                                    const regex = /(\.card\s*\{[^}]*background:\s*)([^;!}]+)/;
                                    if (regex.test(firstEl.content)) {
                                        const newContent = firstEl.content.replace(regex, `$1${newColor}`);
                                        onUpdate(firstEl.id, { content: newContent });
                                    }
                                }}
                                className="h-8 w-full rounded cursor-pointer border border-slate-200" 
                             />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Modifie directement le CSS "background" de la classe .card dans le code HTML.</p>
                    </div>
                 </div>
            )}
          </>
      )}

      {/* Styles Common to Multi-Select */}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
         <label className="text-xs font-bold text-slate-500">Apparence</label>
         
         {/* Background Color */}
         {renderColorControl(
             "Couleur de fond",
             firstEl.style.backgroundColor || '#ffffff',
             (val) => handleStyleChange('backgroundColor', val)
         )}

         {/* Text Color & Font */}
         <div className="flex gap-2 items-end">
            <div className="flex-1">
                {renderColorControl(
                    "Couleur Texte",
                    firstEl.style.color || '#000000',
                    (val) => handleStyleChange('color', val)
                )}
            </div>
            <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Taille Police</label>
                <select value={firstEl.style.fontSize || 16} onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))} className="h-8 w-full border border-slate-200 rounded text-sm">
                    {[10, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72].map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
            </div>
         </div>

         <div className="flex gap-2">
             <button onClick={() => handleStyleChange('fontWeight', firstEl.style.fontWeight === 'bold' ? 'normal' : 'bold')} className={`p-2 rounded flex-1 flex justify-center items-center gap-1 text-sm ${firstEl.style.fontWeight === 'bold' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-200 text-slate-600'}`}><Bold size={16} /> Gras</button>
             <button onClick={() => handleStyleChange('fontFamily', firstEl.style.fontFamily === 'Merriweather' ? 'Inter' : 'Merriweather')} className={`p-2 rounded flex-1 flex justify-center items-center gap-1 text-sm ${firstEl.style.fontFamily === 'Merriweather' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-200 text-slate-600'}`}><TypeIcon size={16} /> Serif</button>
         </div>

         {/* Alignment Buttons */}
         <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
              {['left', 'center', 'right', 'justify'].map((align) => (
                  <button key={align} onClick={() => handleStyleChange('textAlign', align)} className={`p-1 rounded flex-1 flex justify-center ${firstEl.style.textAlign === align ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                      {align === 'left' && <AlignLeft size={16} />}
                      {align === 'center' && <AlignCenter size={16} />}
                      {align === 'right' && <AlignRight size={16} />}
                      {align === 'justify' && <AlignJustify size={16} />}
                  </button>
              ))}
         </div>

         {/* Borders & Radius */}
         <div>
            <label className="text-xs text-slate-500 mb-1 block">Arrondi ({firstEl.style.borderRadius || 0}px)</label>
            <input type="range" min="0" max="100" value={firstEl.style.borderRadius || 0} onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value))} className="w-full accent-indigo-600" />
         </div>
         
         <div className="flex gap-2 items-center">
             <div className="flex-1">
                 <label className="text-xs text-slate-500 mb-1 block">Bordure</label>
                 <input type="number" min="0" max="20" value={firstEl.style.borderWidth || 0} onChange={(e) => handleStyleChange('borderWidth', parseInt(e.target.value))} className="w-full border border-slate-200 rounded px-2 py-1" />
             </div>
             
             <div className="mt-4">
                 {renderColorControl(
                     "", 
                     firstEl.style.borderColor || '#000000',
                     (val) => handleStyleChange('borderColor', val)
                 )}
             </div>
         </div>

         {/* Shadows */}
         <div className="border-t border-slate-100 pt-2 mt-2">
             <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2"><Square size={12} /> Ombre portée</label>
             <div className="grid grid-cols-3 gap-1">
                 <button onClick={() => handleStyleChange('boxShadow', 'none')} className="text-xs border p-1 rounded hover:bg-slate-50">Aucune</button>
                 <button onClick={() => handleStyleChange('boxShadow', '0 1px 2px 0 rgb(0 0 0 / 0.05)')} className="text-xs border p-1 rounded shadow-sm hover:bg-slate-50">Léger</button>
                 <button onClick={() => handleStyleChange('boxShadow', '0 4px 6px -1px rgb(0 0 0 / 0.1)')} className="text-xs border p-1 rounded shadow-md hover:bg-slate-50">Moyen</button>
                 <button onClick={() => handleStyleChange('boxShadow', '0 10px 15px -3px rgb(0 0 0 / 0.1)')} className="text-xs border p-1 rounded shadow-lg hover:bg-slate-50">Fort</button>
                 <button onClick={() => handleStyleChange('boxShadow', '0 20px 25px -5px rgb(0 0 0 / 0.1)')} className="text-xs border p-1 rounded shadow-xl hover:bg-slate-50">XL</button>
                 <button onClick={() => handleStyleChange('boxShadow', '0 25px 50px -12px rgb(0 0 0 / 0.25)')} className="text-xs border p-1 rounded shadow-2xl hover:bg-slate-50">2XL</button>
             </div>
         </div>
      </div>
    </div>
  );
};
