
import React, { useRef, useState, useEffect } from 'react';
import { PageElement, ElementType, ElementStyle } from '../types';
import { QCMRenderer } from './QCMRenderer';
import { Sparkles, MousePointer2, Play, Pause, RotateCcw, Volume2, AlertCircle, Video } from 'lucide-react';
import { STLViewer } from './STLViewer';
import { ConnectDotsRenderer } from './ConnectDotsRenderer';

interface ElementRendererProps {
  element: PageElement;
  isPrint?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  isInteracting?: boolean;
  isSelected?: boolean;
  onInteract?: () => void;
  onOpenAI?: (id: string) => void;
  labelPrefix?: string;
  extraData?: any;
  onNavigate?: (pageId: string) => void;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({ 
  element, 
  isPrint = false, 
  isDragging = false, 
  isResizing = false,
  isInteracting = false,
  isSelected = false,
  onInteract,
  onOpenAI,
  labelPrefix,
  extraData,
  onNavigate
}) => {
  const commonStyle = {
    borderRadius: `${element.style?.borderRadius || 0}px`,
    border: element.style?.borderWidth ? `${element.style.borderWidth}px solid ${element.style.borderColor}` : 'none',
    boxShadow: element.style?.boxShadow || 'none'
  };

  const renderInteractiveOverlay = () => {
      if (isInteracting || isPrint) return null;
      
      return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-transparent hover:bg-slate-900/5 transition-colors group">
            {isSelected && onInteract && (
                <button 
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    onClick={(e) => { e.stopPropagation(); onInteract(); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-xs font-medium transform scale-90 hover:scale-100 hover:bg-indigo-700 transition-all animate-in fade-in zoom-in duration-200"
                >
                   <MousePointer2 size={14} />
                   Activer
                </button>
            )}
        </div>
      );
  };

  // Content Rendering
  const renderContent = () => {
      // Safe style access
      const style = element.style || {} as ElementStyle;

      switch (element.type) {
        case ElementType.SEQUENCE_TITLE:
            return (
                <div className="w-full h-full relative overflow-hidden flex flex-col justify-start pt-4">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                        <path d="M0 0 L100 0 L100 85 Q50 100 0 85 Z" fill={style.backgroundColor || '#4f46e5'} />
                    </svg>
                    <div className="relative z-10 px-10 flex flex-col items-center text-center w-full">
                        <span className="text-[10px] opacity-80 font-mono uppercase tracking-[0.2em] mb-1" style={{ color: style.color || '#ffffff' }}>Module Éducatif</span>
                        {labelPrefix && <span className="text-sm font-bold uppercase tracking-widest mb-1 opacity-90" style={{ color: style.color || '#ffffff' }}>{labelPrefix}</span>}
                        <h1 className="text-3xl font-bold uppercase tracking-wider" style={{ color: style.color || '#ffffff', fontFamily: style.fontFamily === 'Merriweather' ? 'Merriweather, serif' : 'Inter, sans-serif' }}>{element.content}</h1>
                    </div>
                </div>
            );
        case ElementType.PART_TITLE:
            return (
                <div className="w-full h-full flex items-center px-6 relative overflow-hidden" style={{ backgroundColor: style.backgroundColor || '#f8fafc', borderLeft: `4px solid ${style.borderColor || '#4f46e5'}` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent opacity-50"></div>
                    <h2 className="text-xl font-bold uppercase font-sans tracking-tight relative z-10 flex items-center gap-3" style={{ color: style.color || '#1e293b' }}>
                        {labelPrefix && <span style={{ color: style.borderColor || '#4f46e5' }}>{labelPrefix}</span>}
                        <span>{element.content}</span>
                    </h2>
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-slate-200"></div>
                </div>
            );
        case ElementType.H3_TITLE:
            return (
                <div className="w-full h-full flex items-end pb-2 border-b-2 border-slate-200" style={commonStyle}>
                    <h3 className="text-lg font-bold flex gap-2 items-center" style={{ color: style.color || '#334155', fontFamily: style.fontFamily }}>
                        {labelPrefix && <span className="text-slate-500 opacity-80">{labelPrefix}</span>}
                        {element.content}
                    </h3>
                </div>
            );
        case ElementType.H4_TITLE:
            return (
                <div className="w-full h-full flex items-center" style={commonStyle}>
                    <h4 className="text-base font-bold uppercase tracking-wide flex gap-2 items-center" style={{ color: style.color || '#475569', fontFamily: style.fontFamily }}>
                        {labelPrefix && <span className="text-slate-400 font-normal">{labelPrefix}</span>}
                        {element.content}
                    </h4>
                </div>
            );
        case ElementType.TOC:
            // Normalize extraData structure
            let tocItems: any[] = [];
            let pageIndex = 1;
            let totalPages = 1;
            
            if (Array.isArray(extraData)) {
                tocItems = extraData;
            } else if (extraData && typeof extraData === 'object') {
                tocItems = extraData.items || [];
                pageIndex = extraData.pageIndex || 1;
                totalPages = extraData.totalPages || 1;
            }

            return (
                <div className="w-full h-full p-12 font-sans flex flex-col bg-white" style={commonStyle}>
                    <div className="mb-8 text-center">
                        {totalPages > 1 ? (
                             <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-widest mb-2 border-b pb-2 inline-block font-serif">
                                Sommaire ({pageIndex}/{totalPages})
                             </h1>
                        ) : (
                            <>
                                <h1 className="text-4xl font-bold text-slate-900 uppercase tracking-widest mb-2" style={{ fontFamily: 'Merriweather, serif' }}>Sommaire</h1>
                                <div className="w-24 h-1 bg-indigo-600 mx-auto"></div>
                            </>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-1 flex-1">
                        {tocItems.length === 0 && totalPages === 1 && (
                            <div className="text-slate-400 italic text-sm bg-slate-50 p-6 rounded-lg border border-dashed text-center">
                                Le sommaire se met à jour automatiquement.<br/>Ajoutez des éléments "Titre Séquence" ou "Titre Partie" dans vos pages pour les voir apparaître ici.
                            </div>
                        )}
                        {tocItems.map((item, idx) => (
                            <div 
                                key={idx} 
                                className={`flex items-end cursor-pointer group ${item.type === ElementType.SEQUENCE_TITLE ? 'mt-6 mb-2' : 'pl-8 mb-1'}`}
                                onClick={() => onNavigate && item.targetPageId && onNavigate(item.targetPageId)}
                            >
                                <div className={`flex-1 relative ${item.type === ElementType.SEQUENCE_TITLE ? 'font-bold text-slate-800 text-lg' : 'text-slate-600 text-sm'}`}>
                                    <div className="relative z-10 bg-white pr-2 inline-block group-hover:text-indigo-600 transition-colors">
                                        {item.label && <span className={`mr-3 ${item.type === ElementType.SEQUENCE_TITLE ? 'text-indigo-600' : 'text-slate-400'}`}>{item.label}</span>}
                                        {item.title}
                                    </div>
                                    {/* Dotted Leader */}
                                    <div className="absolute bottom-1 w-full border-b-2 border-dotted border-slate-200 z-0"></div>
                                </div>
                                <div className={`relative z-10 bg-white pl-2 font-bold ${item.type === ElementType.SEQUENCE_TITLE ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {item.pageNum}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case ElementType.COLUMNS:
            let columns: string[] = [];
            try {
                columns = JSON.parse(element.content || '[]');
            } catch (e) {
                columns = ["Erreur format", ""];
            }
            // Ensure minimum columns if empty
            if (columns.length === 0) columns = ["Colonne 1", "Colonne 2"];

            return (
                <div 
                    className="w-full h-full p-4 overflow-hidden" 
                    style={{ 
                        ...commonStyle, 
                        display: 'grid', 
                        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                        gap: `${style.gap || 20}px`,
                        backgroundColor: style.backgroundColor,
                        textAlign: style.textAlign || 'left',
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        color: style.color
                    }}
                >
                    {columns.map((colText, idx) => (
                        <div key={idx} className="h-full w-full whitespace-pre-wrap break-words" style={{overflowY: 'auto'}}>
                            {colText}
                        </div>
                    ))}
                </div>
            );
        case ElementType.TEXT:
            return (
                <div className="w-full h-full overflow-hidden whitespace-pre-wrap p-2" style={{ ...commonStyle, fontSize: `${style.fontSize}px`, fontWeight: style.fontWeight, color: style.color, fontFamily: style.fontFamily === 'Merriweather' ? 'Merriweather, serif' : 'Inter, sans-serif', textAlign: style.textAlign, backgroundColor: style.backgroundColor }}>
                    {element.content}
                </div>
            );
        case ElementType.IMAGE:
            return <img src={element.content} alt="Element" className="w-full h-full object-cover pointer-events-none" style={commonStyle} />;
        case ElementType.QR_CODE:
            return (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-white border p-2" style={commonStyle}>
                     <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(element.content)}`} 
                        alt="QR Code" 
                        className="w-full h-full object-contain pointer-events-none" 
                     />
                     {isSelected && <div className="absolute -bottom-6 left-0 w-full text-center text-[10px] bg-slate-800 text-white rounded px-1 truncate">{element.content}</div>}
                 </div>
            );
        case ElementType.VIDEO:
            let videoSrc = element.content;
            let isIframe = false;

            if (!videoSrc) {
                 return (
                    <>
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400 group-hover:border-indigo-300 group-hover:text-indigo-400 transition-colors" style={commonStyle}>
                            <Video size={32} strokeWidth={1.5} />
                            <span className="text-xs mt-2 font-medium">Ajouter une vidéo</span>
                        </div>
                        {renderInteractiveOverlay()}
                    </>
                 );
            }

            // Handle Iframe code paste
            if (videoSrc.trim().startsWith('<iframe')) {
                // Return iframe directly
                return (
                    <>
                        <div className="w-full h-full overflow-hidden" style={commonStyle} dangerouslySetInnerHTML={{__html: videoSrc}} />
                        {renderInteractiveOverlay()}
                    </>
                );
            }

            // Detect YouTube URL (including Shorts)
            // Updated regex to support /shorts/
            const ytMatch = videoSrc.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            if (ytMatch && ytMatch[1]) {
                // Add origin and other params to prevent error 153 and enhance privacy
                videoSrc = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&origin=${window.location.origin}`;
                isIframe = true;
            }

            // Detect Vimeo URL
            const vimeoMatch = videoSrc.match(/(?:vimeo\.com\/)(\d+)/i);
            if (vimeoMatch && vimeoMatch[1]) {
                videoSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
                isIframe = true;
            }

            // Detect Dailymotion URL
            const dmMatch = videoSrc.match(/(?:dailymotion\.com\/video\/)([^"&?\/\s]+)/i);
            if (dmMatch && dmMatch[1]) {
                videoSrc = `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
                isIframe = true;
            }

            if (isIframe) {
                return (
                    <>
                        <iframe 
                            src={videoSrc} 
                            className="w-full h-full border-none bg-black" 
                            allowFullScreen 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            style={{...commonStyle, pointerEvents: (isDragging || isResizing) ? 'none' : 'auto'}}
                        />
                        {renderInteractiveOverlay()}
                    </>
                );
            }

            // Native Video or Blob (Veo)
            return (
                <video 
                    src={element.content} 
                    controls 
                    className="w-full h-full object-cover bg-black" 
                    style={{...commonStyle, pointerEvents: (isDragging || isResizing) ? 'none' : 'auto'}}
                />
            );
        case ElementType.AUDIO:
            const [isPlaying, setIsPlaying] = useState(false);
            const [hasError, setHasError] = useState(false);
            const audioRef = useRef<HTMLAudioElement | null>(null);

            useEffect(() => {
                setHasError(false);
                if (audioRef.current && element.content) {
                    audioRef.current.load();
                }
            }, [element.content]);

            const togglePlay = (e: React.MouseEvent) => {
                e.stopPropagation();
                
                if (audioRef.current) {
                    if (isPlaying) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                    } else {
                        if (!element.content || hasError) {
                            return;
                        }

                        if (audioRef.current.networkState === 3 || audioRef.current.networkState === 0) {
                            audioRef.current.load();
                        }

                        const playPromise = audioRef.current.play();
                        
                        if (playPromise !== undefined) {
                            playPromise
                                .then(() => {
                                    setIsPlaying(true);
                                    setHasError(false);
                                })
                                .catch((error) => {
                                    console.error("Audio playback error:", error.message);
                                    setIsPlaying(false);
                                });
                        }
                    }
                }
            };

            return (
                <div 
                    className={`w-full h-full flex items-center gap-3 px-4 bg-white border shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing ${hasError ? 'border-red-300 bg-red-50' : ''}`} 
                    style={commonStyle}
                    onMouseDown={(e) => { /* dragging handled by parent if needed, but here allow click through */ }}
                >
                    <button 
                        onClick={togglePlay}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={!element.content || hasError}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isPlaying ? 'bg-indigo-100 text-indigo-600' : (hasError || !element.content ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700')}`}
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center pointer-events-none">
                         <span className={`text-sm font-bold truncate ${hasError ? 'text-red-500' : 'text-slate-700'}`}>
                             {hasError ? 'Erreur lecture' : 'Audio / Voix IA'}
                         </span>
                         <span className="text-[10px] text-slate-400">
                             {hasError ? 'Source introuvable' : (element.content ? 'Cliquez pour écouter' : 'Aucune source')}
                         </span>
                    </div>

                    {hasError ? <AlertCircle size={20} className="text-red-400" /> : <Volume2 size={20} className="text-slate-300 group-hover:text-slate-400" />}
                    
                    <audio 
                        ref={audioRef} 
                        src={element.content} 
                        onEnded={() => setIsPlaying(false)} 
                        onError={(e) => {
                            if (element.content) {
                                console.warn("Audio load error:", element.content);
                                setHasError(true);
                            }
                            setIsPlaying(false);
                        }}
                        className="hidden"
                    />
                </div>
            );
        case ElementType.SVG:
            const svgSrc = `
                <style>body,html{margin:0;padding:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;overflow:hidden;}</style>
                ${element.content}
            `;
            // SVG can be printed inside iframe usually, but safe fallback to direct svg if needed
            if (isPrint) {
                return <div className="w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{__html: element.content}} />;
            }
            return (
                <>
                    <iframe 
                        srcDoc={svgSrc} 
                        className="w-full h-full border-none bg-transparent" 
                        sandbox="allow-scripts" 
                        title="SVG Content" 
                        style={{...commonStyle, pointerEvents: (isDragging || isResizing) ? 'none' : 'auto'}} 
                    />
                    {renderInteractiveOverlay()}
                </>
            );
        case ElementType.HTML:
        case ElementType.FILL_IN_THE_BLANKS:
        case ElementType.MATCHING:
        case ElementType.TIMELINE:
        case ElementType.FLASHCARDS:
        case ElementType.TRUE_FALSE:
        case ElementType.MIND_MAP:
            if (isPrint) {
                // Direct injection for printing compatibility
                return (
                    <div 
                        style={{ ...commonStyle, overflow: 'hidden' }}
                        className="w-full h-full print-content-wrapper"
                    >
                        <div dangerouslySetInnerHTML={{__html: element.content}} />
                    </div>
                );
            }
            return (
                <>
                    <iframe srcDoc={element.content} className="w-full h-full border-none overflow-hidden" sandbox="allow-scripts" title="Interactive" style={{ ...commonStyle, pointerEvents: (isDragging || isResizing) ? 'none' : 'auto' }} />
                    {renderInteractiveOverlay()}
                </>
            );
        case ElementType.THREED_MODEL:
            return (
                <>
                    <div className="w-full h-full overflow-hidden" style={commonStyle} onMouseDown={(e) => { if (isInteracting) e.stopPropagation(); }}>
                        <STLViewer stlContent={element.content} backgroundColor={style.backgroundColor || '#f8fafc'} />
                    </div>
                    {renderInteractiveOverlay()}
                </>
            );
        case ElementType.CONNECT_DOTS:
             return (
                <>
                    <div className="w-full h-full overflow-hidden" style={{...commonStyle, backgroundColor: style.backgroundColor || '#fff'}} onMouseDown={(e) => { if (isInteracting) e.stopPropagation(); }}>
                        <ConnectDotsRenderer jsonContent={element.content} isPrint={isPrint} />
                    </div>
                    {renderInteractiveOverlay()}
                </>
             );
        case ElementType.QCM:
            return (
                <>
                    <div className="w-full h-full overflow-hidden flex flex-col" style={{ ...commonStyle, backgroundColor: style.backgroundColor || '#fff' }} onMouseDown={(e) => { if (isInteracting) e.stopPropagation(); }}>
                        <QCMRenderer jsonContent={element.content} isPrint={isPrint} />
                    </div>
                    {renderInteractiveOverlay()}
                </>
            );
        case ElementType.SHAPE:
            return <div className="w-full h-full" style={{ ...commonStyle, backgroundColor: style.backgroundColor }} />;
        case ElementType.SECTION:
            if (isPrint) return <div className="w-full h-full" style={{ ...commonStyle, borderStyle: 'dashed', backgroundColor: 'transparent' }} />;
            return (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed bg-slate-50/50 transition-colors hover:bg-slate-100/80" style={{ borderColor: '#cbd5e1', borderRadius: `${style.borderRadius || 8}px` }}>
                    <button onMouseDown={(e) => e.stopPropagation()} onClick={() => onOpenAI && onOpenAI(element.id)} className="flex items-center gap-2 px-4 py-2 bg-white shadow-sm border border-slate-200 rounded-full text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all scale-90 hover:scale-100">
                        <Sparkles size={16} /> Générer Contenu
                    </button>
                    <span className="mt-2 text-xs text-slate-400 font-medium">Section (Vide)</span>
                </div>
            );
        default:
            return null;
      }
  };

  return renderContent();
};
