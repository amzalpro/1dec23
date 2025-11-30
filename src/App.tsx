
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { AIModal } from './components/AIModal';
import { PageNavigator } from './components/PageNavigator';
import { SourceViewModal } from './components/SourceViewModal';
import { PreviewModal } from './components/PreviewModal';
import { SettingsModal } from './components/SettingsModal'; 
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { DataModal } from './components/DataModal';
import { PageElement, ElementType, Page, PageType, AppSettings, ElementStyle, Project, DataSource } from './types';
import { ElementRenderer } from './components/ElementRenderer';
import { v4 as uuidv4 } from 'uuid';
import { generateFlipbookHtml } from './services/exportService';

const A4_WIDTH_PX = 794; 
const A4_HEIGHT_PX = 1123;
const GRID_SIZE = 20;
const MAX_TOC_ITEMS = 22;

const DEFAULT_SETTINGS: AppSettings = {
    defaultPage: {
        backgroundColor: '#ffffff',
        background: 'none'
    },
    elementDefaults: {
        [ElementType.TEXT]: { fontSize: 16, color: '#000000', fontFamily: 'Inter', backgroundColor: 'transparent' },
        [ElementType.SHAPE]: { backgroundColor: '#cbd5e1', borderWidth: 0, borderRadius: 0 },
        [ElementType.SECTION]: { borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: 'transparent' },
        [ElementType.AUDIO]: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' },
        [ElementType.SEQUENCE_TITLE]: { color: '#ffffff', backgroundColor: '#4f46e5', fontFamily: 'Inter' },
        [ElementType.PART_TITLE]: { color: '#1e293b', backgroundColor: '#f8fafc', borderColor: '#4f46e5', fontFamily: 'Inter' },
        [ElementType.H3_TITLE]: { color: '#334155', fontFamily: 'Inter', fontSize: 18, fontWeight: 'bold' },
        [ElementType.H4_TITLE]: { color: '#475569', fontFamily: 'Inter', fontSize: 16, fontWeight: 'bold' },
        [ElementType.TOC]: { backgroundColor: '#ffffff' },
        [ElementType.QCM]: { backgroundColor: 'transparent' },
        [ElementType.TRUE_FALSE]: { backgroundColor: 'transparent' },
        [ElementType.FILL_IN_THE_BLANKS]: { backgroundColor: 'transparent' },
        [ElementType.MATCHING]: { backgroundColor: 'transparent' },
        [ElementType.FLASHCARDS]: { backgroundColor: 'transparent' },
        [ElementType.TIMELINE]: { backgroundColor: 'transparent' },
        [ElementType.MIND_MAP]: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12 },
        [ElementType.THREED_MODEL]: { backgroundColor: 'transparent', borderRadius: 12 },
        [ElementType.CONNECT_DOTS]: { backgroundColor: 'transparent' },
        [ElementType.HTML]: { backgroundColor: 'transparent' },
        [ElementType.SVG]: { backgroundColor: 'transparent' }
    }
};

const Toast: React.FC<{ message: string, type?: 'success' | 'error' | 'info', onClose: () => void }> = ({ message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800';

    return (
        <div className={`fixed bottom-12 right-4 ${bg} text-white px-4 py-2 rounded-lg shadow-lg z-[100] text-sm animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-2`}>
            {message}
        </div>
    );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('appSettings_v3');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
      localStorage.setItem('appSettings_v3', JSON.stringify(settings));
  }, [settings]);

  const [initialPages] = useState(() => {
      const cover: Page = { id: uuidv4(), type: 'cover', elements: [] };
      const white: Page = { id: uuidv4(), type: 'white', elements: [] };
      const summary: Page = { 
          id: uuidv4(), 
          type: 'summary', 
          elements: [{
              id: uuidv4(),
              type: ElementType.TOC,
              x: 40, y: 40,
              width: A4_WIDTH_PX - 80,
              height: 1043,
              content: '',
              style: { zIndex: 1, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', boxShadow: 'none' }
          }] 
      };
      const standard: Page = { 
          id: uuidv4(), 
          type: 'standard', 
          elements: [], 
          backgroundColor: settings.defaultPage.backgroundColor,
          background: settings.defaultPage.background 
      };
      const back: Page = { id: uuidv4(), type: 'back_cover', elements: [] };
      return [cover, white, summary, standard, back];
  });

  const [pages, setPages] = useState<Page[]>(initialPages);
  const [currentPageId, setCurrentPageId] = useState<string>(initialPages[0].id);
  const [showGrid, setShowGrid] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);

  const [history, setHistory] = useState<Page[][]>([initialPages]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<PageElement[] | null>(null);
  const [interactingId, setInteractingId] = useState<string | null>(null);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isPrinting, setIsPrinting] = useState(false); 
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);

  const [resizeState, setResizeState] = useState<{
      isResizing: boolean;
      startX: number;
      startY: number;
      initialWidth: number;
      initialHeight: number;
      elementId: string | null;
  }>({
      isResizing: false,
      startX: 0,
      startY: 0,
      initialWidth: 0,
      initialHeight: 0,
      elementId: null
  });

  const [dragInfo, setDragInfo] = useState<{ startX: number, startY: number, initialPos: {id: string, x: number, y: number}[] } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const pageRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const canvasRef = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ msg, type });
  
  const getCurrentPage = () => (pages || []).find(p => p.id === currentPageId) || (pages || [])[0];
  const currentPage = getCurrentPage();
  const currentElements = currentPage?.elements || [];

  const snapToGrid = (value: number) => showGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;

  const resolveCollisions = (elements: PageElement[]): PageElement[] => {
      const sorted = [...elements].sort((a, b) => a.y - b.y);
      const GAP = 20;
      let changed = false;
      const result = [...sorted];

      for (let i = 0; i < result.length; i++) {
          const current = result[i];
          for (let j = 0; j < i; j++) {
              const prev = result[j];
              const horizontalOverlap = 
                  (current.x < prev.x + prev.width) && 
                  (current.x + current.width > prev.x);

              if (horizontalOverlap) {
                  const requiredTop = prev.y + prev.height + GAP;
                  if (current.y < requiredTop) {
                      current.y = requiredTop;
                      changed = true;
                  }
              }
          }
      }
      return changed ? result : elements;
  };

  const applyGravity = (elements: PageElement[]): PageElement[] => {
      const sorted = [...elements].sort((a, b) => a.y - b.y);
      const GAP = 20;
      const MARGIN_TOP = 40;
      const processed: PageElement[] = [];

      for (const el of sorted) {
          if (el.y <= MARGIN_TOP && el.type === ElementType.SEQUENCE_TITLE) {
              processed.push(el);
              continue;
          }

          let newY = MARGIN_TOP;
          for (const placed of processed) {
              const isHorizontallyOverlapping = 
                  (el.x < placed.x + placed.width) && 
                  (el.x + el.width > placed.x);
              
              if (isHorizontallyOverlapping) {
                  newY = Math.max(newY, placed.y + placed.height + GAP);
              }
          }

          if (newY < el.y) {
              processed.push({ ...el, y: newY });
          } else {
              processed.push(el);
          }
      }
      return processed;
  };

  const findSmartPosition = (elements: PageElement[], width: number, height: number, defaultX: number = 40): { x: number, y: number } | null => {
      const MARGIN_TOP = 40;
      const MARGIN_BOTTOM = 40;
      const GAP = 20;
      const MAX_Y = A4_HEIGHT_PX - MARGIN_BOTTOM;

      const lowestPoint = elements.length > 0 ? Math.max(...elements.map(e => e.y + e.height)) : MARGIN_TOP;
      const targetY = elements.length > 0 ? lowestPoint + GAP : MARGIN_TOP;

      if (targetY + height <= MAX_Y) {
          return { x: defaultX, y: targetY };
      }

      const sorted = [...elements].sort((a, b) => a.y - b.y);
      let currentY = MARGIN_TOP;

      for (const el of sorted) {
          if (el.y - currentY >= height + GAP) {
              return { x: defaultX, y: currentY };
          }
          currentY = Math.max(currentY, el.y + el.height + GAP);
      }

      if (currentY + height <= MAX_Y) {
          return { x: defaultX, y: currentY };
      }
      
      return null;
  };

  const saveToHistory = useCallback((newPages: Page[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPages);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setPages(newPages);
  }, [history, historyIndex]);

  const handleUndo = () => {
      if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setPages(history[historyIndex - 1]);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
          setPages(history[historyIndex + 1]);
      }
  };

  const updatePages = (newPages: Page[]) => {
      saveToHistory(newPages);
  };

  const handleAddPage = () => {
    const newPage: Page = { 
        id: uuidv4(), 
        type: 'standard', 
        elements: [],
        backgroundColor: settings.defaultPage.backgroundColor,
        background: settings.defaultPage.background
    };
    
    const currentIndex = pages.findIndex(p => p.id === currentPageId);
    let insertIndex = currentIndex >= 0 ? currentIndex + 1 : pages.length;

    const backCoverIndex = pages.findIndex(p => p.type === 'back_cover');
    if (backCoverIndex !== -1) {
        if (currentIndex === backCoverIndex) insertIndex = backCoverIndex;
        else if (insertIndex > backCoverIndex) insertIndex = backCoverIndex;
    }

    const newPages = [...pages];
    newPages.splice(insertIndex, 0, newPage);
    updatePages(newPages);
    setCurrentPageId(newPage.id);
  };

  const handleDeletePage = (id: string) => {
    if (pages.length <= 1) {
        showToast("Impossible de supprimer la dernière page", "error");
        return;
    }
    const idx = pages.findIndex(p => p.id === id);
    const newPages = pages.filter(p => p.id !== id);
    updatePages(newPages);
    if (currentPageId === id) {
      const newIdx = Math.max(0, idx - 1);
      setCurrentPageId(newPages[newIdx].id);
    }
  };

  const handleDuplicatePage = (id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page) return;
    const newElements = (page.elements || []).map(el => ({...el, id: uuidv4()}));
    const newPage: Page = {
        id: uuidv4(),
        type: page.type,
        elements: newElements,
        background: page.background,
        backgroundColor: page.backgroundColor,
        backgroundImage: page.backgroundImage
    };
    const idx = pages.findIndex(p => p.id === id);
    const newPages = [...pages];
    newPages.splice(idx + 1, 0, newPage);
    updatePages(newPages);
    setCurrentPageId(newPage.id);
  };

  const handleToggleStructure = (type: PageType) => {
    const exists = pages.some(p => p.type === type);
    let newPages = [...pages];
    if (exists) {
        const deletedPage = pages.find(p => p.type === type);
        newPages = newPages.filter(p => p.type !== type);
        if (deletedPage && currentPageId === deletedPage.id) {
             setCurrentPageId(newPages[0]?.id || '');
        }
    } else {
        let initialElements: PageElement[] = [];
        if (type === 'summary') {
            initialElements.push({
                id: uuidv4(),
                type: ElementType.TOC,
                x: 40, y: 40,
                width: A4_WIDTH_PX - 80,
                height: 1043,
                content: '',
                style: { zIndex: 1, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', boxShadow: 'none' }
            });
        }
        const newPage: Page = { 
            id: uuidv4(), 
            type, 
            elements: initialElements,
        };
        if (type === 'cover') newPages.unshift(newPage);
        else if (type === 'white') {
            const coverIdx = newPages.findIndex(p => p.type === 'cover');
            newPages.splice(coverIdx + 1, 0, newPage);
        }
        else if (type === 'summary') {
             let insertIdx = -1;
             const whiteIdx = newPages.findIndex(p => p.type === 'white');
             const coverIdx = newPages.findIndex(p => p.type === 'cover');
             if (whiteIdx !== -1) insertIdx = whiteIdx;
             else if (coverIdx !== -1) insertIdx = coverIdx;
             newPages.splice(insertIdx + 1, 0, newPage);
        }
        else if (type === 'back_cover') {
            newPages.push(newPage);
        }
        setCurrentPageId(newPage.id);
    }
    updatePages(newPages);
  };

  const handleUpdatePage = (id: string, updates: Partial<Page>) => {
      const newPages = pages.map(p => p.id === id ? { ...p, ...updates } : p);
      updatePages(newPages);
  };

  const structureData = useMemo(() => {
    const numberingMap: Record<string, string> = {};
    const tocList: any[] = [];
    let sequenceCount = 0, partCount = 0, h3Count = 0, h4Count = 0, standardPageCount = 0;

    (pages || []).forEach(page => {
        if (page.type === 'standard') {
            standardPageCount++;
            const sortedElements = [...(page.elements || [])].sort((a, b) => a.y - b.y);
            sortedElements.forEach(el => {
                if (el.type === ElementType.SEQUENCE_TITLE) {
                    sequenceCount++; partCount = 0; h3Count = 0; h4Count = 0;
                    const label = `SÉQUENCE ${sequenceCount}`;
                    numberingMap[el.id] = label;
                    tocList.push({ pageNum: standardPageCount, title: el.content, label, type: ElementType.SEQUENCE_TITLE, id: el.id, targetPageId: page.id });
                } else if (el.type === ElementType.PART_TITLE) {
                    partCount++; h3Count = 0; h4Count = 0;
                    const label = `${partCount} -`;
                    numberingMap[el.id] = label;
                    tocList.push({ pageNum: standardPageCount, title: el.content, label, type: ElementType.PART_TITLE, id: el.id, targetPageId: page.id });
                } else if (el.type === ElementType.H3_TITLE) {
                    h3Count++; h4Count = 0;
                    const label = `${partCount}.${h3Count} -`;
                    numberingMap[el.id] = label;
                } else if (el.type === ElementType.H4_TITLE) {
                    h4Count++;
                    const label = `${partCount}.${h3Count}.${h4Count} -`;
                    numberingMap[el.id] = label;
                }
            });
        }
    });
    return { numberingMap, tocList };
  }, [pages]);

  useEffect(() => {
    const summaryPages = (pages || []).filter(p => p.type === 'summary');
    if (summaryPages.length === 0) return;

    const totalItems = structureData.tocList.length;
    const requiredPages = Math.max(1, Math.ceil(totalItems / MAX_TOC_ITEMS));
    
    if (summaryPages.length !== requiredPages) {
        const newPages = [...pages];
        if (summaryPages.length < requiredPages) {
            let lastSummaryIndex = -1;
            for (let i = newPages.length - 1; i >= 0; i--) {
                if (newPages[i].type === 'summary') { lastSummaryIndex = i; break; }
            }
            const needed = requiredPages - summaryPages.length;
            for(let i=0; i<needed; i++) {
                const newPage: Page = {
                    id: uuidv4(),
                    type: 'summary',
                    elements: [{
                        id: uuidv4(), type: ElementType.TOC, x: 40, y: 40, width: A4_WIDTH_PX - 80, height: 1043, content: '',
                        style: { zIndex: 1, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', boxShadow: 'none' }
                    }]
                };
                newPages.splice(lastSummaryIndex + 1 + i, 0, newPage);
            }
        } else {
            const summaryIds = summaryPages.map(p => p.id);
            const idsToRemove = new Set(summaryIds.slice(requiredPages));
            let i = newPages.length;
            while (i--) { if (idsToRemove.has(newPages[i].id)) newPages.splice(i, 1); }
        }
        updatePages(newPages);
    }
  }, [structureData.tocList.length, (pages || []).filter(p => p.type === 'summary').length]); 

  const addElement = (type: ElementType, content: string = '') => {
    const id = uuidv4();
    let width = 200, height = 200, defaultX = 40;

    if (type === ElementType.TEXT) { width = 300; height = 100; }
    else if (type === ElementType.SECTION) { width = 400; height = 300; }
    else if (type === ElementType.QCM) { width = 400; height = 350; }
    else if (type === ElementType.VIDEO) { width = 400; height = 225; }
    else if (type === ElementType.QR_CODE) { width = 150; height = 150; content = "https://www.google.com"; }
    else if (type === ElementType.CONNECT_DOTS) { width = 400; height = 400; }
    else if (type === ElementType.AUDIO) { width = 300; height = 60; }
    else if (type === ElementType.SEQUENCE_TITLE) { width = A4_WIDTH_PX; height = 150; defaultX = 0; content = "TITRE SÉQUENCE"; }
    else if (type === ElementType.PART_TITLE) { width = 500; height = 60; content = "TITRE PARTIE"; }
    else if (type === ElementType.H3_TITLE) { width = 400; height = 50; content = "Sous-titre H3"; }
    else if (type === ElementType.H4_TITLE) { width = 300; height = 40; content = "Sous-titre H4"; }
    else if (type === ElementType.TOC) { width = A4_WIDTH_PX - 80; height = 1043; }

    let targetPageId = currentPageId;
    let targetPages = [...pages];
    let pos: { x: number, y: number } | null = null;

    if (type === ElementType.SEQUENCE_TITLE) {
        const hasH1 = currentElements.some(el => el.type === ElementType.SEQUENCE_TITLE);
        if (hasH1) {
             if (window.confirm("Cette page contient déjà un Titre Séquence (H1). Voulez-vous créer une nouvelle page pour ce titre ?")) {
                 const newPageId = uuidv4();
                 const newPage: Page = {
                    id: newPageId, type: 'standard', elements: [],
                    backgroundColor: settings.defaultPage.backgroundColor, background: settings.defaultPage.background
                 };
                 const currentIndex = targetPages.findIndex(p => p.id === currentPageId);
                 let insertIndex = currentIndex >= 0 ? currentIndex + 1 : targetPages.length;
                 const backCoverIndex = targetPages.findIndex(p => p.type === 'back_cover');
                 if (backCoverIndex !== -1) {
                     if (currentIndex === backCoverIndex) insertIndex = backCoverIndex;
                     else if (insertIndex > backCoverIndex) insertIndex = backCoverIndex;
                 }
                 targetPages.splice(insertIndex, 0, newPage);
                 targetPageId = newPageId;
                 pos = { x: defaultX, y: 40 }; 
                 showToast("Nouvelle page créée pour le titre", "success");
             } else { return; }
        }
    }

    if (!pos) {
        pos = findSmartPosition(currentElements, width, height, defaultX);
        if (!pos) {
            const newPageId = uuidv4();
            const newPage: Page = {
                id: newPageId, type: 'standard', elements: [],
                backgroundColor: settings.defaultPage.backgroundColor, background: settings.defaultPage.background
            };
            const idx = targetPages.findIndex(p => p.id === currentPageId);
            let insertIdx = idx + 1;
            const backCoverIndex = targetPages.findIndex(p => p.type === 'back_cover');
            if (backCoverIndex !== -1 && insertIdx > backCoverIndex) insertIdx = backCoverIndex;
            targetPages.splice(insertIdx, 0, newPage);
            targetPageId = newPageId;
            pos = { x: defaultX, y: 40 };
            showToast("Nouvelle page ajoutée par manque d'espace", "info");
        }
    }
    
    const defaultStyles = settings.elementDefaults[type] || {};
    const targetPage = targetPages.find(p => p.id === targetPageId);
    const existingElements = targetPage?.elements || [];
    
    let styleConfig: ElementStyle & { zIndex: number } = {
        fontSize: 16, color: '#000000', backgroundColor: 'transparent', textAlign: 'left', fontFamily: 'Inter',
        zIndex: existingElements.length + 1, borderWidth: 0, borderColor: '#cbd5e1', borderRadius: 0, boxShadow: 'none',
        ...defaultStyles
    };

    const newElement: PageElement = {
      id, type, x: pos.x, y: pos.y, width, height,
      content: content || (type === ElementType.TEXT ? 'Texte...' : ''),
      style: styleConfig
    };

    const updatedPages = targetPages.map(p => p.id === targetPageId ? { ...p, elements: [...(p.elements || []), newElement] } : p);
    updatePages(updatedPages);
    setCurrentPageId(targetPageId); 
    setSelectedIds(new Set([id]));
  };

  const updateElement = (id: string, updates: Partial<PageElement>) => {
    const newPages = pages.map(p => p.id === currentPageId ? { ...p, elements: (p.elements || []).map(el => el.id === id ? { ...el, ...updates } : el) } : p);
    updatePages(newPages);
  };

  const deleteElement = (id: string) => {
    const newPages = pages.map(p => {
        if (p.id === currentPageId) {
            const remaining = (p.elements || []).filter(el => el.id !== id);
            const compacted = applyGravity(remaining);
            return { ...p, elements: compacted };
        }
        return p;
    });
    updatePages(newPages);
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleAIGenerated = (content: string, type: 'text' | 'image' | 'html' | 'svg' | 'qcm' | 'cover' | 'fill_in_the_blanks' | 'matching' | 'timeline' | 'flashcards' | 'true_false' | 'mind_map' | 'threed_model' | 'video' | 'connect_dots' | 'texture' | 'audio' | 'app') => {
    if (type === 'texture') {
        if (content) {
            handleUpdatePage(currentPageId, { backgroundImage: content });
            showToast("Texture de fond appliquée", "success");
        }
        return;
    }
    if (type === 'cover') {
        const coverPage = (pages || []).find(p => p.type === 'cover');
        if (coverPage) {
            const coverEl: PageElement = {
                id: uuidv4(), type: ElementType.HTML, x: 0, y: 0, width: A4_WIDTH_PX, height: A4_HEIGHT_PX,
                content, style: { zIndex: 1, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent' }
            };
            const newPages = pages.map(p => p.id === coverPage.id ? { ...p, elements: [coverEl] } : p);
            updatePages(newPages);
            setCurrentPageId(coverPage.id);
            showToast("Couverture générée", "success");
        }
        return;
    }
    
    let elementType = ElementType.TEXT;
    if (type === 'image') elementType = ElementType.IMAGE;
    else if (type === 'html' || type === 'app') elementType = ElementType.HTML;
    else if (type === 'svg') elementType = ElementType.SVG;
    else if (type === 'qcm') elementType = ElementType.QCM;
    else if (type === 'fill_in_the_blanks') elementType = ElementType.FILL_IN_THE_BLANKS;
    else if (type === 'matching') elementType = ElementType.MATCHING;
    else if (type === 'timeline') elementType = ElementType.TIMELINE;
    else if (type === 'flashcards') elementType = ElementType.FLASHCARDS;
    else if (type === 'true_false') elementType = ElementType.TRUE_FALSE;
    else if (type === 'mind_map') elementType = ElementType.MIND_MAP;
    else if (type === 'threed_model') elementType = ElementType.THREED_MODEL;
    else if (type === 'video') elementType = ElementType.VIDEO;
    else if (type === 'connect_dots') elementType = ElementType.CONNECT_DOTS;
    else if (type === 'audio') elementType = ElementType.AUDIO;

    addElement(elementType, content);
    showToast("Contenu généré avec succès", "success");
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) addElement(ElementType.IMAGE, e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProject = () => {
    const project: Project = {
      id: uuidv4(), name: "Mon Manuel Scolaire", version: "1.0.0", pages, updatedAt: Date.now(), dataSources
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projet-manuel-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast("Projet sauvegardé", "success");
  };

  const handleLoadProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string) as Project;
        if (project.pages && Array.isArray(project.pages)) {
            const sanitizedPages = project.pages.map(p => ({
                ...p, elements: (p.elements || []).map(el => ({ ...el, style: { zIndex: 1, ...(el.style || {}) } }))
            }));
            updatePages(sanitizedPages);
            if (project.dataSources) setDataSources(project.dataSources);
            setCurrentPageId(sanitizedPages[0].id);
            showToast("Projet chargé avec succès", "success");
        }
      } catch (err) { console.error(err); showToast("Erreur lors du chargement du fichier", "error"); }
    };
    reader.readAsText(file);
  };

  const handleExportHTML = () => {
      const project: Project = { id: uuidv4(), name: "Manuel Export", version: "1.0", pages, updatedAt: Date.now() };
      const html = generateFlipbookHtml(project);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuel-interactif.html`;
      a.click();
      showToast("Export HTML terminé", "success");
  };

  const handleExportPDF = () => {
      setIsPrinting(true);
      setTimeout(() => {
          const element = printContainerRef.current;
          if (!element) { setIsPrinting(false); return; }
          const opt = { margin: 0, filename: 'mon-manuel-scolaire.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
          // @ts-ignore
          html2pdf().set(opt).from(element).save().then(() => { setIsPrinting(false); showToast("PDF Téléchargé", "success"); });
      }, 500); 
  };

  const handleDataImport = (sources: DataSource[]) => {
      setDataSources(prev => [...prev, ...sources]);
      showToast(`${sources.length} modèles de données importés.`, "success");
  };

  // Comprehensive Demo Loader
  const handleLoadDemo = () => {
      const demoPages: Page[] = [];
      const coverId = uuidv4(), whiteId = uuidv4(), tocId = uuidv4(), p1Id = uuidv4(), p2Id = uuidv4(), p3Id = uuidv4(), p4Id = uuidv4(), p5Id = uuidv4(), p6Id = uuidv4(), p7Id = uuidv4(), backId = uuidv4();

      const coverHtml = `<style>:root{--primary:#6366f1;--secondary:#ec4899;--text:#f8fafc}body{margin:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Inter',sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);color:var(--text)}.glass{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);padding:80px 60px;border-radius:32px;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);width:80%;position:relative;overflow:hidden}.glass::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%);animation:rotate 20s linear infinite}@keyframes rotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}h1{font-size:4rem;font-weight:900;margin:0;background:linear-gradient(to right,#c084fc,#6366f1);-webkit-background-clip:text;color:transparent;line-height:1.1}h2{font-size:1.5rem;font-weight:300;margin:20px 0 40px;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase}.badge{display:inline-block;padding:8px 24px;background:var(--primary);color:white;border-radius:50px;font-weight:bold;font-size:1rem;box-shadow:0 10px 15px -3px rgba(99,102,241,0.4)}.footer{margin-top:60px;display:flex;justify-content:center;gap:20px;font-size:0.9rem;color:#64748b}.icon{width:40px;height:40px;background:rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center}</style><div class="glass"><h2>Manuel Interactif</h2><h1>EXPLORATION<br>SPATIALE</h1><div class="badge">NIVEAU AVANCÉ</div><div class="footer"><div class="icon">⚛</div><div class="icon">★</div><div class="icon">☾</div></div></div>`;
      demoPages.push({ id: coverId, type: 'cover', elements: [{ id: uuidv4(), type: ElementType.HTML, x: 0, y: 0, width: A4_WIDTH_PX, height: A4_HEIGHT_PX, content: coverHtml, style: { zIndex: 1, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent' } }] });
      demoPages.push({ id: whiteId, type: 'white', elements: [] });
      demoPages.push({ id: tocId, type: 'summary', elements: [{ id: uuidv4(), type: ElementType.TOC, x: 40, y: 40, width: A4_WIDTH_PX - 80, height: 1043, content: '', style: { zIndex: 1, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', boxShadow: 'none' } }] });

      demoPages.push({ id: p1Id, type: 'standard', background: 'dots', elements: [
          { id: uuidv4(), type: ElementType.SEQUENCE_TITLE, x: 0, y: 40, width: A4_WIDTH_PX, height: 160, content: "Le Système Solaire", style: { zIndex: 1, backgroundColor: '#0f172a', color: '#fff', borderWidth: 0, borderColor: 'transparent' } },
          { id: uuidv4(), type: ElementType.PART_TITLE, x: 40, y: 240, width: 500, height: 60, content: "Une Odyssée Gravitationnelle", style: { zIndex: 2, borderColor: '#6366f1', borderWidth: 0 } },
          { id: uuidv4(), type: ElementType.TEXT, x: 40, y: 330, width: 700, height: 100, content: "Le Système solaire est notre foyer dans la Voie Lactée. Il est constitué d'une étoile, le Soleil, et des objets célestes gravitant autour d'elle.", style: { zIndex: 3, fontSize: 16, textAlign: 'justify', borderWidth: 0, borderColor: 'transparent' } },
          { id: uuidv4(), type: ElementType.HTML, x: 40, y: 450, width: 700, height: 160, content: `<style>.def-box{background:#f0f9ff;border-left:4px solid #0ea5e9;padding:20px;font-family:'Inter',sans-serif;border-radius:0 8px 8px 0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}.title{font-weight:bold;color:#0369a1;text-transform:uppercase;font-size:12px;margin-bottom:8px;display:flex;align-items:center;gap:6px}strong{color:#0284c7}</style><div class="def-box"><div class="title"><span>💡</span>DÉFINITION CLÉ</div><strong>La Gravité</strong> est la force attractive qui s'exerce entre deux corps massifs.</div>`, style: { zIndex: 4, borderWidth: 0, borderColor: 'transparent' } },
          { id: uuidv4(), type: ElementType.H3_TITLE, x: 40, y: 640, width: 400, height: 40, content: "Écoutez l'introduction", style: { zIndex: 5, color: '#0369a1', borderWidth: 0, borderColor: 'transparent' } },
          { id: uuidv4(), type: ElementType.AUDIO, x: 40, y: 700, width: 350, height: 70, content: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav", style: { zIndex: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' } }
      ] });

      const pyramidStl = `solid pyramid\nfacet normal 0 0 -1\nouter loop\nvertex 0 0 0\nvertex 10 0 0\nvertex 0 10 0\nendloop\nendfacet\nfacet normal 0 0 -1\nouter loop\nvertex 10 10 0\nvertex 0 10 0\nvertex 10 0 0\nendloop\nendfacet\nfacet normal 0.7 0.7 0.7\nouter loop\nvertex 0 0 0\nvertex 0 10 0\nvertex 5 5 10\nendloop\nendfacet\nfacet normal 0.7 0.7 0.7\nouter loop\nvertex 10 0 0\nvertex 0 0 0\nvertex 5 5 10\nendloop\nendfacet\nfacet normal 0.7 0.7 0.7\nouter loop\nvertex 10 10 0\nvertex 10 0 0\nvertex 5 5 10\nendloop\nendfacet\nfacet normal 0.7 0.7 0.7\nouter loop\nvertex 0 10 0\nvertex 10 10 0\nvertex 5 5 10\nendloop\nendfacet\nendsolid pyramid`;
      const orbitSvg = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sunGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#f59e0b"/></radialGradient></defs><rect width="400" height="300" fill="#0f172a"/><circle cx="200" cy="150" r="30" fill="url(#sunGrad)"/><circle cx="200" cy="150" r="60" fill="none" stroke="#334155" stroke-dasharray="4"/><circle cx="200" cy="150" r="100" fill="none" stroke="#334155" stroke-dasharray="4"/><circle cx="200" cy="150" r="140" fill="none" stroke="#334155" stroke-dasharray="4"/><circle cx="260" cy="150" r="8" fill="#94a3b8"/><circle cx="120" cy="100" r="12" fill="#3b82f6"/><circle cx="100" cy="200" r="10" fill="#ef4444"/><text x="200" y="290" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="12">Modèle Simplifié des Orbites</text></svg>`;

      demoPages.push({ id: p2Id, type: 'standard', backgroundColor: '#fff', elements: [
          { id: uuidv4(), type: ElementType.PART_TITLE, x: 40, y: 40, width: 500, height: 60, content: "Exploration Visuelle", style: { zIndex: 1, borderColor: '#ec4899', borderWidth: 0 } },
          { id: uuidv4(), type: ElementType.H4_TITLE, x: 40, y: 120, width: 300, height: 40, content: "Artefact Alien (Modèle 3D STL)", style: { zIndex: 2, borderWidth: 0, borderColor: 'transparent' } },
          { id: uuidv4(), type: ElementType.THREED_MODEL, x: 40, y: 170, width: 340, height: 300, content: pyramidStl, style: { zIndex: 3, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12 } },
          { id: uuidv4(), type: ElementType.H4_TITLE, x: 400, y: 120, width: 300, height: 40, content: "Orbites Planétaires (SVG)", style: { zIndex: 4, borderWidth: 0, borderColor: 'transparent' } },
          { id: uuidv4(), type: ElementType.SVG, x: 400, y: 170, width: 350, height: 260, content: orbitSvg, style: { zIndex: 5, borderRadius: 12, borderWidth: 0, borderColor: 'transparent' } },
      ] });

      const qcmJson = JSON.stringify([{question: "Quelle est la planète la plus proche du Soleil ?", options: ["Vénus", "Mercure", "Terre"], correctIndex: 1}, {question: "Laquelle est une planète gazeuse ?", options: ["Mars", "Jupiter", "Terre"], correctIndex: 1}]);
      demoPages.push({ id: p3Id, type: 'standard', backgroundColor: '#f0fdf4', elements: [
          { id: uuidv4(), type: ElementType.PART_TITLE, x: 40, y: 40, width: 500, height: 60, content: "Testez vos connaissances", style: { zIndex: 1, borderColor: '#16a34a', borderWidth: 0 } },
          { id: uuidv4(), type: ElementType.QCM, x: 40, y: 170, width: 340, height: 350, content: qcmJson, style: { zIndex: 3, borderWidth: 0, borderColor: 'transparent' } },
      ] });

      demoPages.push({ id: backId, type: 'back_cover', elements: [] });
      updatePages(demoPages);
      setCurrentPageId(coverId);
      showToast("Démonstration complète chargée !", "success");
  };

  const getPageBackgroundStyle = (page: Page) => {
      if (!page) return { backgroundColor: '#ffffff' };
      const bgColor = page.backgroundColor || '#ffffff';
      let style: React.CSSProperties = { backgroundColor: bgColor };
      let backgroundImages = [], backgroundSizes = [];
      if (page.background === 'lines') { backgroundImages.push('linear-gradient(#94a3b8 1px, transparent 1px)'); backgroundSizes.push('100% 2rem'); } 
      else if (page.background === 'grid') { backgroundImages.push('linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)'); backgroundSizes.push('20px 20px'); } 
      else if (page.background === 'dots') { backgroundImages.push('radial-gradient(#94a3b8 1px, transparent 1px)'); backgroundSizes.push('20px 20px'); } 
      else if (page.background === 'seyes') { backgroundImages.push('linear-gradient(90deg, #ef4444 0.5px, transparent 0.5px), linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(#e2e8f0 1px, transparent 1px)'); backgroundSizes.push('8rem 100%, 100% 2rem, 100% 0.5rem'); }
      if (page.backgroundImage) { backgroundImages.push(`url(${page.backgroundImage})`); backgroundSizes.push('cover'); }
      if (backgroundImages.length > 0) { style.backgroundImage = backgroundImages.join(', '); style.backgroundSize = backgroundSizes.join(', '); }
      return style;
  };

  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => {
      if (selectedIds.size < 2) return;
      const selectedEls = currentElements.filter(el => selectedIds.has(el.id));
      let newElements = [...currentElements];
      if (type === 'left') { const minX = Math.min(...selectedEls.map(el => el.x)); selectedEls.forEach(el => { const idx = newElements.findIndex(e => e.id === el.id); newElements[idx] = {...el, x: minX}; }); }
      else if (type === 'right') { const maxX = Math.max(...selectedEls.map(el => el.x + el.width)); selectedEls.forEach(el => { const idx = newElements.findIndex(e => e.id === el.id); newElements[idx] = {...el, x: maxX - el.width}; }); }
      else if (type === 'center') { const minX = Math.min(...selectedEls.map(el => el.x)); const maxX = Math.max(...selectedEls.map(el => el.x + el.width)); const center = (minX + maxX) / 2; selectedEls.forEach(el => { const idx = newElements.findIndex(e => e.id === el.id); newElements[idx] = {...el, x: center - el.width / 2}; }); }
      else if (type === 'top') { const minY = Math.min(...selectedEls.map(el => el.y)); selectedEls.forEach(el => { const idx = newElements.findIndex(e => e.id === el.id); newElements[idx] = {...el, y: minY}; }); }
      else if (type === 'bottom') { const maxY = Math.max(...selectedEls.map(el => el.y + el.height)); selectedEls.forEach(el => { const idx = newElements.findIndex(e => e.id === el.id); newElements[idx] = {...el, y: maxY - el.height}; }); }
      else if (type === 'middle') { const minY = Math.min(...selectedEls.map(el => el.y)); const maxY = Math.max(...selectedEls.map(el => el.y + el.height)); const middle = (minY + maxY) / 2; selectedEls.forEach(el => { const idx = newElements.findIndex(e => e.id === el.id); newElements[idx] = {...el, y: middle - el.height / 2}; }); }
      else if (type === 'distribute-v') { selectedEls.sort((a, b) => a.y - b.y); const start = selectedEls[0].y; const end = selectedEls[selectedEls.length - 1].y; const totalH = end - start; const gap = totalH / (selectedEls.length - 1); selectedEls.forEach((el, i) => { const idx = newElements.findIndex(e => e.id === el.id); newElements[idx] = {...el, y: start + (gap * i)}; }); }
      const newPages = pages.map(p => p.id === currentPageId ? { ...p, elements: newElements } : p);
      updatePages(newPages);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const clickedPage = pages.find(p => p.elements?.some(el => el.id === id));
    if (clickedPage && clickedPage.id !== currentPageId) setCurrentPageId(clickedPage.id);
    let newSelection = new Set(selectedIds);
    if (e.shiftKey) { if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id); } else { if (!newSelection.has(id)) { newSelection.clear(); newSelection.add(id); } }
    setSelectedIds(newSelection); setInteractingId(null);
    const selectedEls = currentElements.filter(el => newSelection.has(el.id));
    setDragInfo({ startX: e.clientX, startY: e.clientY, initialPos: selectedEls.map(el => ({ id: el.id, x: el.x, y: el.y })) });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, pageId: string) => {
      if (pageId !== currentPageId) setCurrentPageId(pageId);
      setSelectedIds(new Set()); setInteractingId(null);
  };

  useEffect(() => { const el = pageRefs.current[currentPageId]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [currentPageId]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (dragInfo) {
              const dx = (e.clientX - dragInfo.startX) / zoomLevel;
              const dy = (e.clientY - dragInfo.startY) / zoomLevel;
              const newElements = [...currentElements];
              dragInfo.initialPos.forEach(item => {
                  const elIdx = newElements.findIndex(el => el.id === item.id);
                  if (elIdx !== -1) {
                      const el = newElements[elIdx];
                      let nx = snapToGrid(item.x + dx);
                      let ny = snapToGrid(item.y + dy);
                      if (nx < 0) nx = 0; if (nx + el.width > A4_WIDTH_PX) nx = A4_WIDTH_PX - el.width;
                      if (ny < 0) ny = 0; if (ny + el.height > A4_HEIGHT_PX) ny = A4_HEIGHT_PX - el.height;
                      if (el.type === ElementType.SEQUENCE_TITLE) { nx = 0; ny = 0; }
                      newElements[elIdx] = { ...el, x: nx, y: ny };
                  }
              });
              setPages(prev => prev.map(p => p.id === currentPageId ? { ...p, elements: newElements } : p));
          } else if (resizeState.isResizing && resizeState.elementId) {
              const dx = (e.clientX - resizeState.startX) / zoomLevel;
              const dy = (e.clientY - resizeState.startY) / zoomLevel;
              const currentEl = currentElements.find(el => el.id === resizeState.elementId);
              if (currentEl) {
                  let nw = snapToGrid(Math.max(50, resizeState.initialWidth + dx));
                  let nh = snapToGrid(Math.max(50, resizeState.initialHeight + dy));
                  if (currentEl.x + nw > A4_WIDTH_PX) nw = A4_WIDTH_PX - currentEl.x;
                  if (currentEl.y + nh > A4_HEIGHT_PX) nh = A4_HEIGHT_PX - currentEl.y;
                  if (nw > 0 && nh > 0) {
                      const updated = { ...currentEl, width: nw, height: nh };
                      const newElements = currentElements.map(el => el.id === resizeState.elementId ? updated : el);
                      setPages(prev => prev.map(p => p.id === currentPageId ? { ...p, elements: newElements } : p));
                  }
              }
          }
      };
      const handleMouseUp = () => {
          if (dragInfo) {
              const updatedElements = resolveCollisions(applyGravity(currentElements));
              setPages(prev => prev.map(p => p.id === currentPageId ? { ...p, elements: updatedElements } : p));
              updatePages(pages.map(p => p.id === currentPageId ? { ...p, elements: updatedElements } : p));
              setDragInfo(null);
          }
          if (resizeState.isResizing) {
              setResizeState({ isResizing: false, startX: 0, startY: 0, initialWidth: 0, initialHeight: 0, elementId: null });
              updatePages(pages);
          }
      };
      window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [dragInfo, resizeState, currentElements, currentPageId, pages, showGrid, zoomLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
            const newPages = pages.map(p => {
                if (p.id === currentPageId) {
                    const remaining = (p.elements || []).filter(el => !selectedIds.has(el.id));
                    const compacted = applyGravity(remaining);
                    return { ...p, elements: compacted };
                }
                return p;
            });
            updatePages(newPages);
            setSelectedIds(new Set());
        }
      } else if (e.metaKey || e.ctrlKey) {
          if (e.key === 'z') { e.preventDefault(); handleUndo(); }
          if (e.key === 'y') { e.preventDefault(); handleRedo(); }
          if (e.key === 'c') { e.preventDefault(); if(selectedIds.size > 0) { setClipboard(currentElements.filter(el => selectedIds.has(el.id))); showToast("Copié !", "success"); } }
          if (e.key === 'v') { e.preventDefault(); if(clipboard) {
                  const newElements = clipboard.map(el => ({ ...el, id: uuidv4(), x: el.x + 20, y: el.y + 20 }));
                  newElements.forEach(el => { if(el.x+el.width>A4_WIDTH_PX) el.x=A4_WIDTH_PX-el.width; if(el.y+el.height>A4_HEIGHT_PX) el.y=A4_HEIGHT_PX-el.height; });
                  const updatedPageElements = [...currentElements, ...newElements];
                  const newPages = pages.map(p => p.id === currentPageId ? { ...p, elements: updatedPageElements } : p);
                  updatePages(newPages);
                  setSelectedIds(new Set(newElements.map(el => el.id)));
                  showToast("Collé !", "success");
              }
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, pages, currentPageId, clipboard, history, historyIndex]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      
      <Toolbar 
        onAddElement={addElement} 
        onOpenAI={() => setIsAIModalOpen(true)}
        onPrint={() => window.print()}
        onImageUpload={handleImageUpload}
        onImportDrive={() => setIsDriveModalOpen(true)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onExportHTML={handleExportHTML}
        onPreview={() => setIsPreviewModalOpen(true)}
        onViewSource={() => setIsSourceModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        onExportPDF={handleExportPDF}
        onOpenData={() => setIsDataModalOpen(true)} 
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDelete={() => selectedIds.forEach(id => deleteElement(id))}
        onCopy={() => {}}
        selectionCount={selectedIds.size}
        onAlign={handleAlign}
      />

      <div className="flex-1 flex overflow-hidden relative">
          <div className="w-48 bg-white border-r border-slate-200 h-full z-20 flex-shrink-0">
             <PageNavigator 
                pages={pages || []}
                currentPageId={currentPageId} 
                onSelectPage={(id) => {
                    setCurrentPageId(id);
                    const el = pageRefs.current[id];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }} 
                onAddPage={handleAddPage} 
                onDeletePage={handleDeletePage}
                onDuplicatePage={handleDuplicatePage}
                onToggleStructure={handleToggleStructure}
            />
          </div>

          <div className="flex-1 bg-slate-100 overflow-auto flex flex-col items-center p-8 relative z-0 gap-8" onMouseDown={(e) => handleCanvasMouseDown(e, '')}>
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                  {(pages || []).map((page, index) => (
                      <div 
                        key={page.id}
                        ref={(el) => { pageRefs.current[page.id] = el; }}
                        className={`relative bg-white shadow-lg transition-all duration-200 ${page.id === currentPageId ? 'ring-4 ring-indigo-500/20' : ''}`} 
                        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, ...getPageBackgroundStyle(page) }}
                        onMouseDown={(e) => { e.stopPropagation(); handleCanvasMouseDown(e, page.id); }}
                      >
                          <div className="absolute -left-12 top-0 text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">{index + 1}</div>
                          {showGrid && <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>}
                          {(page.elements || []).map(el => (
                              <div
                                  key={el.id}
                                  style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.style?.zIndex ?? 1, cursor: interactingId === el.id ? 'default' : (selectedIds.has(el.id) ? 'move' : 'pointer') }}
                                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                                  className={`group ${selectedIds.has(el.id) ? 'ring-2 ring-indigo-500 z-50' : 'hover:ring-1 hover:ring-indigo-300'}`}
                              >
                                  <ElementRenderer 
                                     element={el} 
                                     isSelected={selectedIds.has(el.id)} 
                                     isDragging={!!dragInfo && selectedIds.has(el.id)}
                                     isResizing={resizeState.isResizing && resizeState.elementId === el.id}
                                     isInteracting={interactingId === el.id}
                                     onInteract={() => setInteractingId(el.id)}
                                     onOpenAI={(id) => { setTargetSectionId(id); setIsAIModalOpen(true); }}
                                     onNavigate={(targetId) => {
                                         setCurrentPageId(targetId);
                                         const el = pageRefs.current[targetId];
                                         if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                     }}
                                     labelPrefix={structureData.numberingMap[el.id]}
                                     extraData={el.type === ElementType.TOC ? (() => {
                                         const summaryPages = (pages || []).filter(p => p.type === 'summary');
                                         const tocPageIndex = summaryPages.findIndex(p => p.id === page.id);
                                         const tocTotalPages = summaryPages.length;
                                         const start = tocPageIndex * MAX_TOC_ITEMS;
                                         const slice = structureData.tocList.slice(start, start + MAX_TOC_ITEMS);
                                         return { items: slice, pageIndex: tocPageIndex + 1, totalPages: tocTotalPages, isContinuation: tocPageIndex > 0 };
                                     })() : undefined}
                                  />
                                  {selectedIds.has(el.id) && !interactingId && (
                                      <div 
                                          className="absolute bottom-0 right-0 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full cursor-se-resize z-50 hover:scale-125 transition-transform shadow-sm"
                                          onMouseDown={(e) => {
                                              e.stopPropagation();
                                              setResizeState({ isResizing: true, startX: e.clientX, startY: e.clientY, initialWidth: el.width, initialHeight: el.height, elementId: el.id });
                                          }}
                                      />
                                  )}
                              </div>
                          ))}
                      </div>
                  ))}
              </div>
          </div>

          <div className="w-80 bg-white border-l border-slate-200 h-full z-20 flex-shrink-0">
             <PropertiesPanel 
                elements={currentElements.filter(el => selectedIds.has(el.id))} 
                currentPage={currentPage}
                onUpdate={updateElement} 
                onDelete={deleteElement} 
                onUpdatePage={handleUpdatePage}
             />
          </div>
      </div>

      <footer className="h-10 bg-slate-900 text-slate-400 text-xs flex items-center justify-between px-4 z-50 flex-shrink-0 border-t border-slate-800">
          <div className="flex items-center gap-3">
              <span className="text-white font-bold tracking-tight">Editeur Manuel Scolaire Pro</span>
              <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">v2.1</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
              <button onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.1))} className="text-white hover:text-indigo-400 font-bold px-2">-</button>
              <span className="min-w-[40px] text-center font-mono text-white">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))} className="text-white hover:text-indigo-400 font-bold px-2">+</button>
              <button onClick={() => setZoomLevel(1)} className="text-[10px] text-slate-500 hover:text-white ml-2 border-l border-slate-700 pl-2">Reset</button>
          </div>
          <div className="flex items-center gap-4">
               <span>{(pages || []).length} page(s)</span>
               <span className="opacity-50">|</span>
               <span>A4 Portrait (794 x 1123 px)</span>
          </div>
      </footer>

      {isPrinting && (
          <div className="print-only" ref={printContainerRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0, zIndex: -50, width: '210mm' }}>
             {(pages || []).map((page, idx) => (
                 <div key={page.id} className="page-a4-print" style={{ position: 'relative', width: '210mm', height: '297mm', pageBreakAfter: 'always', ...getPageBackgroundStyle(page) }}>
                     {(page.elements || []).map(el => (
                         <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.style?.zIndex ?? 1 }}>
                             <ElementRenderer element={el} isPrint={true} labelPrefix={structureData.numberingMap[el.id]} />
                         </div>
                     ))}
                     {page.type === 'standard' && <div className="print-page-number">{idx + 1}</div>}
                 </div>
             ))}
          </div>
      )}

      <AIModal 
        isOpen={isAIModalOpen} 
        onClose={() => { setIsAIModalOpen(false); setTargetSectionId(null); }} 
        onGenerated={(content, type) => {
             if (targetSectionId) {
                 updateElement(targetSectionId, { type: ElementType.HTML, content, style: { ...currentElements.find(e => e.id === targetSectionId)?.style, backgroundColor: 'transparent', borderWidth: 0 } });
             } else {
                 handleAIGenerated(content, type); 
             }
        }} 
        currentPageType={currentPage?.type || 'standard'}
      />
      
      <SettingsModal 
         isOpen={isSettingsModalOpen}
         onClose={() => setIsSettingsModalOpen(false)}
         settings={settings}
         onSave={setSettings}
         onReset={() => setSettings(DEFAULT_SETTINGS)}
      />

      <GoogleDriveModal 
         isOpen={isDriveModalOpen}
         onClose={() => setIsDriveModalOpen(false)}
         onImport={addElement}
         projectData={{ id: uuidv4(), name: "Mon Manuel Scolaire", version: "1.0", pages: pages || [], updatedAt: Date.now() }}
      />

      <DataModal 
          isOpen={isDataModalOpen}
          onClose={() => setIsDataModalOpen(false)}
          onImportData={handleDataImport}
          existingSources={dataSources}
      />

      <PreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} projectData={{ id: uuidv4(), name: "Aperçu", version: "1.0", pages: pages || [], updatedAt: Date.now(), dataSources }} />
      <SourceViewModal isOpen={isSourceModalOpen} onClose={() => setIsSourceModalOpen(false)} projectData={{ id: uuidv4(), name: "Projet", version: "1.0", pages: pages || [], updatedAt: Date.now(), dataSources }} />
      
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
