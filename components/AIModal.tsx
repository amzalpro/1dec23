
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image as ImageIcon, BookOpen, Loader2, Code, PenTool, CheckSquare, ALargeSmall, LayoutTemplate, Puzzle, PencilRuler, Clock, ListChecks, Network, Box, Video, Binary, Wallpaper, Volume2, Globe, Brain } from 'lucide-react';
import { 
  generateEducationalText, 
  generateEducationalImage, 
  generateEducationalSvg, 
  generateMiniApp, 
  generateQCM,
  generateCoverPage,
  generateFillInTheBlanks,
  generateMatchingExercise,
  generateTimeline,
  generateFlashcards,
  generateTrueFalse,
  generateMindMap,
  generate3DModel,
  generateEducationalVideo,
  generateConnectDots,
  generatePageTexture,
  generateSpeech
} from '../services/geminiService';
import { PageType } from '../types';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (content: string, type: 'text' | 'image' | 'html' | 'svg' | 'qcm' | 'cover' | 'fill_in_the_blanks' | 'matching' | 'timeline' | 'flashcards' | 'true_false' | 'mind_map' | 'threed_model' | 'video' | 'connect_dots' | 'texture' | 'audio') => void;
  currentPageType: PageType;
}

type GenerationType = 'text' | 'definition' | 'image' | 'svg' | 'app' | 'qcm' | 'cover' | 'fill_in_the_blanks' | 'matching' | 'timeline' | 'flashcards' | 'true_false' | 'mind_map' | 'threed_model' | 'video' | 'connect_dots' | 'texture' | 'audio';

export const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onGenerated, currentPageType }) => {
  const [activeType, setActiveType] = useState<GenerationType>('text');
  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState('Collège (6ème-3ème)');
  const [qcmCount, setQcmCount] = useState(3);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  // Advanced Toggles
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);

  // Audio fields
  const [audioMode, setAudioMode] = useState<'direct' | 'ai'>('direct');

  // Cover Page Fields
  const [coverMode, setCoverMode] = useState<'ai' | 'manual'>('ai');
  const [coverTitle, setCoverTitle] = useState('');
  const [coverSubtitle, setCoverSubtitle] = useState('');
  const [coverAuthor, setCoverAuthor] = useState('');
  const [coverDescription, setCoverDescription] = useState('');
  const [manualHtml, setManualHtml] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentPageType === 'cover') setActiveType('cover');
      else setActiveType('text');
    }
  }, [isOpen, currentPageType]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (activeType === 'cover' && coverMode === 'manual') {
        if (!manualHtml.trim()) return;
        onGenerated(manualHtml, 'cover');
        onClose();
        return;
    }

    if (activeType !== 'cover' && !prompt.trim()) return;
    if (activeType === 'cover' && !coverTitle.trim()) return;

    setIsLoading(true);
    
    try {
        switch (activeType) {
            case 'text': onGenerated(await generateEducationalText(prompt, level, 'standard', { useSearch, useThinking }), 'text'); break;
            case 'definition': onGenerated(await generateEducationalText(prompt, level, 'definition', { useSearch, useThinking }), 'text'); break;
            case 'image': 
                const img = await generateEducationalImage(prompt);
                if (img) onGenerated(img, 'image');
                break;
            case 'texture':
                const texture = await generatePageTexture(prompt);
                if (texture) onGenerated(texture, 'texture');
                else alert("Erreur génération texture");
                break;
            case 'video':
                const video = await generateEducationalVideo(prompt, videoAspectRatio);
                if (video) onGenerated(video, 'video');
                else alert("Erreur génération vidéo (Veo)");
                break;
            case 'audio':
                let textToSay = prompt;
                if (audioMode === 'ai') {
                    // Generate text first if mode is AI
                    textToSay = await generateEducationalText(prompt, level, 'standard');
                    // Strip some markdown if present to help TTS
                    textToSay = textToSay.replace(/[#*`]/g, '');
                }
                const audioData = await generateSpeech(textToSay);
                if (audioData) onGenerated(audioData, 'audio');
                else alert("Erreur génération audio");
                break;
            case 'svg': onGenerated(await generateEducationalSvg(prompt), 'svg'); break;
            case 'app': onGenerated(await generateMiniApp(prompt), 'html'); break;
            case 'qcm': onGenerated(await generateQCM(prompt, level, qcmCount), 'qcm'); break;
            case 'fill_in_the_blanks': onGenerated(await generateFillInTheBlanks(prompt), 'fill_in_the_blanks'); break;
            case 'matching': onGenerated(await generateMatchingExercise(prompt), 'matching'); break;
            case 'timeline': onGenerated(await generateTimeline(prompt), 'timeline'); break;
            case 'flashcards': onGenerated(await generateFlashcards(prompt), 'flashcards'); break;
            case 'true_false': onGenerated(await generateTrueFalse(prompt), 'true_false'); break;
            case 'mind_map': onGenerated(await generateMindMap(prompt), 'mind_map'); break;
            case 'threed_model': onGenerated(await generate3DModel(prompt), 'threed_model'); break;
            case 'connect_dots': onGenerated(await generateConnectDots(prompt), 'connect_dots'); break;
            case 'cover': onGenerated(await generateCoverPage(coverTitle, coverSubtitle, coverAuthor, coverDescription), 'cover'); break;
        }
    } catch (e) {
        console.error(e);
        alert("Une erreur est survenue");
    }
    
    setIsLoading(false);
    onClose();
    setPrompt('');
  };

  const options = [
    { id: 'text', label: 'Texte', icon: BookOpen },
    { id: 'definition', label: 'Définition', icon: ALargeSmall },
    { id: 'audio', label: 'Audio / Voix', icon: Volume2 },
    { id: 'qcm', label: 'QCM', icon: CheckSquare },
    { id: 'true_false', label: 'Vrai/Faux', icon: ListChecks },
    { id: 'fill_in_the_blanks', label: 'Texte à Trous', icon: PencilRuler },
    { id: 'matching', label: 'Appariement', icon: Puzzle },
    { id: 'connect_dots', label: 'Points à Relier', icon: Binary },
    { id: 'flashcards', label: 'Flashcards', icon: LayoutTemplate }, 
    { id: 'timeline', label: 'Frise Chrono', icon: Clock },
    { id: 'image', label: 'Illustration', icon: ImageIcon },
    { id: 'texture', label: 'Texture de Fond', icon: Wallpaper },
    { id: 'video', label: 'Vidéo (Veo)', icon: Video },
    { id: 'svg', label: 'Schéma SVG', icon: PenTool },
    { id: 'mind_map', label: 'Carte Mentale', icon: Network },
    { id: 'threed_model', label: 'Modèle 3D', icon: Box },
    { id: 'app', label: 'Mini App', icon: Code },
    { id: 'cover', label: 'Couverture A4', icon: LayoutTemplate },
  ];

  const visibleOptions = options.filter(opt => currentPageType === 'cover' ? opt.id === 'cover' : opt.id !== 'cover');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] no-print backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={20} />
            Assistant IA
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4 flex gap-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
          {visibleOptions.map((opt) => (
             <button 
                key={opt.id} onClick={() => { setActiveType(opt.id as GenerationType); }}
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-all min-w-[80px] ${activeType === opt.id ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'bg-transparent border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}
             >
                <opt.icon size={20} />
                <span className="text-xs font-medium whitespace-nowrap">{opt.label}</span>
             </button>
          ))}
        </div>

        <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
          {['text', 'definition', 'qcm', 'audio'].includes(activeType) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Niveau Scolaire</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option>Primaire (CP-CM2)</option>
                <option>Collège (6ème-3ème)</option>
                <option>Lycée (2nde-Terminale)</option>
                <option>Enseignement Supérieur</option>
              </select>
            </div>
          )}

          {/* New Toggles for Text/Definition */}
          {['text', 'definition'].includes(activeType) && (
              <div className="flex gap-4">
                  <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg border flex-1 transition-all ${useSearch ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      <input type="checkbox" checked={useSearch} onChange={() => { setUseSearch(!useSearch); setUseThinking(false); }} className="hidden" />
                      <Globe size={16} /> Recherche Google
                  </label>
                  <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg border flex-1 transition-all ${useThinking ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      <input type="checkbox" checked={useThinking} onChange={() => { setUseThinking(!useThinking); setUseSearch(false); }} className="hidden" />
                      <Brain size={16} /> Mode Réflexion (Pro)
                  </label>
              </div>
          )}

          {activeType === 'audio' && (
             <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setAudioMode('direct')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${audioMode === 'direct' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Texte à Lire</button>
                <button onClick={() => setAudioMode('ai')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${audioMode === 'ai' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Générer Texte par IA</button>
             </div>
          )}

          {activeType === 'qcm' && (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de questions : {qcmCount}</label>
                <input type="range" min="1" max="10" value={qcmCount} onChange={(e) => setQcmCount(parseInt(e.target.value))} className="w-full accent-indigo-600" />
            </div>
          )}

          {activeType === 'video' && (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Format Vidéo</label>
                <div className="flex gap-2">
                    <button onClick={() => setVideoAspectRatio('16:9')} className={`flex-1 py-2 border rounded-lg text-sm ${videoAspectRatio === '16:9' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'hover:bg-slate-50'}`}>Paysage (16:9)</button>
                    <button onClick={() => setVideoAspectRatio('9:16')} className={`flex-1 py-2 border rounded-lg text-sm ${videoAspectRatio === '9:16' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'hover:bg-slate-50'}`}>Portrait (9:16)</button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">Génère une vidéo courte avec Google Veo.</p>
            </div>
          )}

          {activeType === 'cover' ? (
            <div className="flex flex-col gap-4">
               <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                   <button onClick={() => setCoverMode('ai')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${coverMode === 'ai' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Génération IA</button>
                   <button onClick={() => setCoverMode('manual')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${coverMode === 'manual' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Code HTML Manuel</button>
               </div>

               {coverMode === 'ai' ? (
                 <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Titre du Manuel *</label><input type="text" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Physique-Chimie 3ème" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Sous-titre / Module</label><input type="text" value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: La matière" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Auteur</label><input type="text" value={coverAuthor} onChange={(e) => setCoverAuthor(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Jean Dupont" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Description (Optionnel)</label><textarea value={coverDescription} onChange={(e) => setCoverDescription(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={3} placeholder="Style, couleurs..." /></div>
                 </div>
               ) : (
                 <div className="animate-in fade-in duration-300">
                     <label className="block text-sm font-medium text-slate-700 mb-1">Code HTML/CSS</label>
                     <textarea value={manualHtml} onChange={(e) => setManualHtml(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono h-[250px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50" spellCheck={false} />
                 </div>
               )}
            </div>
          ) : (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {activeType === 'texture' ? 'Description de la texture' : 
                     activeType === 'audio' && audioMode === 'direct' ? 'Texte à lire' :
                     activeType === 'audio' && audioMode === 'ai' ? 'Sujet du podcast / texte' :
                     'Description du contenu'}
                </label>
                <div className="flex gap-2">
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder={
                            activeType === 'video' ? 'Ex: Un système solaire en mouvement, style cinématique...' : 
                            activeType === 'texture' ? 'Ex: Papier ancien, motif géométrique subtil...' :
                            activeType === 'audio' ? 'Ex: Bonjour les élèves, aujourd\'hui nous allons étudier...' :
                            "Décrivez ce que vous souhaitez générer..."
                        } 
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[100px]"
                    />
                </div>
            </div>
          )}

          <button 
              onClick={handleGenerate}
              disabled={isLoading || (activeType === 'cover' && coverMode === 'ai' && !coverTitle.trim()) || (activeType === 'cover' && coverMode === 'manual' && !manualHtml.trim()) || (activeType !== 'cover' && !prompt.trim())}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
          >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {isLoading ? (activeType === 'video' ? 'Génération Vidéo...' : activeType === 'audio' ? 'Synthèse Vocale...' : 'Générer...') : 'Générer avec Gemini'}
          </button>
        </div>
      </div>
    </div>
  );
};
