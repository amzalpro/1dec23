
import React from 'react';
import { Page, PageType, ElementType, PageElement, ElementStyle } from '../types';
import { Plus, Trash2, Copy, FileText, LayoutTemplate, File, Book, ToggleLeft, ToggleRight, ListOrdered, Image as ImageIcon, Box, Type as TypeIcon, Video, Music, MonitorPlay, Grid, AlignLeft, CheckSquare, Activity } from 'lucide-react';

interface PageNavigatorProps {
  pages: Page[];
  currentPageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onToggleStructure: (type: PageType) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onToggleStructure
}) => {
  // Helper to check if types exist
  const hasCover = pages.some(p => p.type === 'cover');
  const hasWhitePage = pages.some(p => p.type === 'white');
  const hasSummary = pages.some(p => p.type === 'summary');
  const hasBackCover = pages.some(p => p.type === 'back_cover');

  // Helper for numbering
  let standardPageCounter = 0;

  // Background Style Helper (Duplicated logic for independence)
  const getPageThumbnailStyle = (page: Page) => {
      const bgColor = page.backgroundColor || '#ffffff';
      let style: React.CSSProperties = { backgroundColor: bgColor };
      
      let backgroundImages = [];
      let backgroundSizes = [];

      // Pattern Layer
      if (page.background === 'lines') {
          backgroundImages.push('linear-gradient(#94a3b8 1px, transparent 1px)');
          backgroundSizes.push('100% 2rem');
      } else if (page.background === 'grid') {
          backgroundImages.push('linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)');
          backgroundSizes.push('20px 20px');
      } else if (page.background === 'dots') {
          backgroundImages.push('radial-gradient(#94a3b8 1px, transparent 1px)');
          backgroundSizes.push('20px 20px');
      } else if (page.background === 'seyes') {
          backgroundImages.push('linear-gradient(90deg, #ef4444 0.5px, transparent 0.5px), linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(#e2e8f0 1px, transparent 1px)');
          backgroundSizes.push('8rem 100%, 100% 2rem, 100% 0.5rem');
      }

      // AI/Image Texture Layer
      if (page.backgroundImage) {
          backgroundImages.push(`url(${page.backgroundImage})`);
          backgroundSizes.push('cover');
      }

      if (backgroundImages.length > 0) {
          style.backgroundImage = backgroundImages.join(', ');
          style.backgroundSize = backgroundSizes.join(', ');
      }
      
      return style;
  };

  const renderThumbnailElement = (el: PageElement) => {
      const style = (el.style || {}) as ElementStyle;
      const commonStyle: React.CSSProperties = {
          position: 'absolute',
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          backgroundColor: style.backgroundColor || 'transparent',
          borderWidth: style.borderWidth ? `${style.borderWidth}px` : 0,
          borderColor: style.borderColor || 'transparent',
          borderRadius: style.borderRadius ? `${style.borderRadius}px` : 0,
          boxShadow: style.boxShadow,
          zIndex: style.zIndex || 1,
          overflow: 'hidden',
          display: 'flex',
          color: style.color || '#000',
          fontFamily: style.fontFamily,
          fontSize: style.fontSize ? `${style.fontSize}px` : '12px',
          textAlign: style.textAlign || 'left',
          fontWeight: style.fontWeight
      };

      // Type-specific content rendering for Thumbnail
      switch (el.type) {
          case ElementType.TEXT:
          case ElementType.H3_TITLE:
          case ElementType.H4_TITLE:
              return (
                  <div style={{
                      ...commonStyle, 
                      padding: '4px',
                      alignItems: el.type === ElementType.H3_TITLE ? 'flex-end' : 'center',
                      borderBottom: el.type === ElementType.H3_TITLE ? '2px solid #e2e8f0' : 'none',
                      whiteSpace: 'pre-wrap',
                      justifyContent: style.textAlign === 'center' ? 'center' : (style.textAlign === 'right' ? 'flex-end' : 'flex-start')
                  }}>
                      {el.content}
                  </div>
              );
          case ElementType.SEQUENCE_TITLE:
              return (
                  <div style={{...commonStyle, alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1}}>
                            <path d="M0 0 L100 0 L100 85 Q50 100 0 85 Z" fill={style.backgroundColor || '#4f46e5'} />
                        </svg>
                        <span style={{fontSize: '30px', fontWeight: 'bold', color: style.color || 'white', textTransform: 'uppercase', textAlign: 'center', zIndex: 1}}>
                            {el.content}
                        </span>
                  </div>
              );
          case ElementType.PART_TITLE:
              return (
                  <div style={{
                      ...commonStyle, 
                      borderLeft: `4px solid ${style.borderColor || '#4f46e5'}`, 
                      paddingLeft: '10px', 
                      alignItems: 'center', 
                      justifyContent: 'flex-start', 
                      backgroundColor: style.backgroundColor || '#f8fafc'
                  }}>
                      <span style={{fontSize: '20px', fontWeight: 'bold'}}>{el.content}</span>
                  </div>
              );
          case ElementType.COLUMNS:
              let columns: string[] = [];
              try { columns = JSON.parse(el.content || '[]'); } catch(e) { columns = []; }
              return (
                  <div style={{
                      ...commonStyle,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                      gap: `${style.gap || 20}px`,
                      padding: '4px',
                      alignItems: 'start'
                  }}>
                      {columns.map((col, i) => (
                          <div key={i} style={{fontSize: style.fontSize, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                              {col}
                          </div>
                      ))}
                  </div>
              );
          case ElementType.IMAGE:
              return <img src={el.content} style={{...commonStyle, objectFit: 'cover'}} alt="" />;
          case ElementType.SHAPE:
              return <div style={commonStyle} />;
          case ElementType.QR_CODE:
              return (
                  <div style={{...commonStyle, backgroundColor: 'white', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <div className="w-[80%] h-[80%] border-4 border-slate-800 flex items-center justify-center">
                          <div className="w-1/2 h-1/2 bg-slate-800" />
                      </div>
                  </div>
              );
          case ElementType.TOC:
              return (
                  <div style={{...commonStyle, backgroundColor: 'white', flexDirection: 'column', padding: '20px', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
                      <div className="w-full text-center border-b border-slate-200 pb-2 mb-2">
                          <span style={{fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase'}}>SOMMAIRE</span>
                      </div>
                      <div className="w-full flex flex-col gap-2">
                          {[1,2,3,4,5].map(i => (
                              <div key={i} className="flex gap-2 items-end w-full opacity-60">
                                  <div className="h-2 flex-1 bg-slate-200 rounded"></div>
                                  <div className="h-2 w-4 bg-slate-200 rounded"></div>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          case ElementType.QCM:
              let qcmData: any[] = [];
              try { qcmData = JSON.parse(el.content); } catch(e) {}
              const firstQ = qcmData[0]?.question || "QCM";
              return (
                  <div style={{...commonStyle, backgroundColor: 'white', border: '1px solid #e2e8f0', flexDirection: 'column', padding: '10px', gap: '5px'}}>
                      <div style={{fontWeight: 'bold', fontSize: '14px', color: '#1e293b'}}>{firstQ}</div>
                      <div className="flex flex-col gap-1">
                          <div className="h-3 w-full bg-slate-100 rounded border border-slate-200"></div>
                          <div className="h-3 w-full bg-slate-100 rounded border border-slate-200"></div>
                      </div>
                  </div>
              );
          case ElementType.CONNECT_DOTS:
              let dots: any[] = [];
              try { dots = JSON.parse(el.content); } catch(e) {}
              return (
                  <div style={{...commonStyle, backgroundColor: 'white', border: '1px solid #e2e8f0'}}>
                      <svg viewBox="0 0 100 100" style={{width: '100%', height: '100%'}}>
                          {dots.map((d, i) => (
                              <circle key={i} cx={d.x} cy={d.y} r="2" fill="#cbd5e1" />
                          ))}
                      </svg>
                  </div>
              );
          case ElementType.THREED_MODEL:
              return (
                  <div style={{...commonStyle, backgroundColor: style.backgroundColor !== 'transparent' ? style.backgroundColor : '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <Box size={40} className="text-indigo-300" strokeWidth={1} />
                  </div>
              );
          default:
              // For other interactive elements, a styled placeholder
              let Icon = Box;
              if (el.type === ElementType.VIDEO) Icon = Video;
              if (el.type === ElementType.AUDIO) Icon = Music;
              if (el.type === ElementType.HTML) Icon = MonitorPlay;
              if (el.type === ElementType.FILL_IN_THE_BLANKS || el.type === ElementType.MATCHING) Icon = FileText;
              
              return (
                  <div style={{
                      ...commonStyle, 
                      backgroundColor: style.backgroundColor !== 'transparent' ? style.backgroundColor : 'white', 
                      border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor}` : '1px solid #e2e8f0',
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center'
                  }}>
                      <div className="opacity-20 text-slate-900"><Icon size={32} /></div>
                      {el.type === ElementType.HTML && <div className="text-[10px] text-slate-400 mt-1 px-2 text-center overflow-hidden h-4 w-full">HTML Code</div>}
                  </div>
              );
      }
  };

  return (
    <div className="w-full h-full bg-white border-r border-slate-200 flex flex-col z-40 shadow-sm no-print">
      {/* Structure Toggles */}
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 flex-shrink-0">
         <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Book size={12} /> Structure
         </h3>
         
         <div className="flex flex-col gap-2">
             <button 
                onClick={() => onToggleStructure('cover')}
                className="flex items-center justify-between text-xs text-slate-700 hover:text-indigo-600 transition-colors"
             >
                <span className="flex items-center gap-2"><LayoutTemplate size={12} /> Couverture</span>
                {hasCover ? <ToggleRight size={18} className="text-indigo-600" /> : <ToggleLeft size={18} className="text-slate-300" />}
             </button>

             <button 
                onClick={() => onToggleStructure('white')}
                className="flex items-center justify-between text-xs text-slate-700 hover:text-indigo-600 transition-colors"
             >
                <span className="flex items-center gap-2"><File size={12} /> Page Garde</span>
                {hasWhitePage ? <ToggleRight size={18} className="text-indigo-600" /> : <ToggleLeft size={18} className="text-slate-300" />}
             </button>

             <button 
                onClick={() => onToggleStructure('summary')}
                className="flex items-center justify-between text-xs text-slate-700 hover:text-indigo-600 transition-colors"
             >
                <span className="flex items-center gap-2"><ListOrdered size={12} /> Sommaire</span>
                {hasSummary ? <ToggleRight size={18} className="text-indigo-600" /> : <ToggleLeft size={18} className="text-slate-300" />}
             </button>

             <button 
                onClick={() => onToggleStructure('back_cover')}
                className="flex items-center justify-between text-xs text-slate-700 hover:text-indigo-600 transition-colors"
             >
                <span className="flex items-center gap-2"><LayoutTemplate size={12} /> 4ème Couv.</span>
                {hasBackCover ? <ToggleRight size={18} className="text-indigo-600" /> : <ToggleLeft size={18} className="text-slate-300" />}
             </button>
         </div>
      </div>

      <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText size={12} /> Contenu
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 scrollbar-thin">
        {pages.map((page, index) => {
          let label = "";
          if (page.type === 'cover') label = "Couverture";
          else if (page.type === 'white') label = "Page de Garde";
          else if (page.type === 'summary') label = "Sommaire";
          else if (page.type === 'back_cover') label = "4ème de Couv.";
          else {
              standardPageCounter++;
              label = `Page ${standardPageCounter}`;
          }

          return (
            <div 
                key={page.id} 
                onClick={() => onSelectPage(page.id)}
                className={`relative group cursor-pointer transition-all duration-200 ${page.id === currentPageId ? 'scale-105' : 'hover:scale-102'}`}
            >
                <div className="flex justify-between items-center mb-1 px-1">
                    <span className={`text-xs font-medium ${page.id === currentPageId ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {label}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {page.type === 'standard' && (
                            <>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDuplicatePage(page.id); }}
                                    className="text-slate-400 hover:text-indigo-500 p-0.5 rounded"
                                    title="Dupliquer"
                                >
                                    <Copy size={12} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }}
                                    className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                                    title="Supprimer"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Real Thumbnail Representation */}
                <div className={`aspect-[210/297] w-full bg-white shadow-sm border rounded-md overflow-hidden relative ${page.id === currentPageId ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                    {/* Scaled Container: 794x1123 scaled down to fit */}
                    {/* Width of thumb is roughly 160px. 160 / 794 approx 0.20 */}
                    <div 
                        className="absolute top-0 left-0 origin-top-left pointer-events-none select-none"
                        style={{
                            width: '794px',
                            height: '1123px',
                            transform: 'scale(0.20)', // Fixed scale for uniform look
                            ...getPageThumbnailStyle(page)
                        }}
                    >
                        {/* Render Mini Elements */}
                        {(page.elements || []).map(el => (
                            <React.Fragment key={el.id}>
                                {renderThumbnailElement(el)}
                            </React.Fragment>
                        ))}
                    </div>
                    
                    {/* Overlay for interactivity (click to select page) */}
                    <div className="absolute inset-0 bg-transparent z-10" />
                </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
        <button 
          onClick={onAddPage}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <Plus size={14} /> Nouvelle Page
        </button>
      </div>
    </div>
  );
};
