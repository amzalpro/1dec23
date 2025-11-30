
import React, { useRef } from 'react';
import { 
  Type, Image as ImageIcon, Square, Sparkles, Printer, BoxSelect, Save, FolderOpen, Grid, 
  Heading1, Heading2, Heading3, Heading4, BookTemplate, FileJson, Undo2, Redo2, Trash2, Copy, AlignLeft, 
  AlignCenter, AlignRight, AlignVerticalJustifyCenter, ArrowUp, ArrowDown, QrCode, Volume2, Eye, Settings,
  Zap, FileDown, MoreVertical, MousePointer2, Columns, Video, Cloud, Database
} from 'lucide-react';
import { ElementType } from '../types';

interface ToolbarProps {
  onAddElement: (type: ElementType) => void;
  onOpenAI: () => void;
  onPrint: () => void;
  onImageUpload: (file: File) => void;
  onImportDrive: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onExportHTML: () => void;
  onPreview: () => void;
  onViewSource: () => void;
  onOpenSettings: () => void;
  onLoadDemo: () => void; 
  onExportPDF: () => void;
  onOpenData: () => void; // New prop
  showGrid: boolean;
  onToggleGrid: () => void;
  
  // Edit Actions
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onCopy: () => void;
  
  // Selection Info
  selectionCount: number;
  onAlign: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
}

const Divider = () => <div className="w-px h-6 bg-slate-200 mx-2" />;

const ToolButton: React.FC<{ 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  compact?: boolean;
}> = ({ onClick, icon, label, active, disabled, variant = 'default', compact }) => {
  let colorClass = "text-slate-600 hover:bg-slate-100";
  if (active) colorClass = "bg-indigo-50 text-indigo-600 border border-indigo-200";
  if (variant === 'primary') colorClass = "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200";
  if (variant === 'success') colorClass = "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm";
  if (variant === 'danger') colorClass = "text-red-500 hover:bg-red-50";
  
  if (disabled) colorClass = "text-slate-300 cursor-not-allowed";

  return (
    <button 
      onClick={disabled ? undefined : onClick}
      className={`relative group flex items-center justify-center rounded-lg transition-all ${compact ? 'p-1.5' : 'p-2'} ${colorClass}`}
      disabled={disabled}
      title={label}
    >
      {icon}
      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[60] whitespace-nowrap shadow-lg">
        {label}
      </div>
    </button>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddElement, onOpenAI, onPrint, onImageUpload, onImportDrive, onSaveProject, onLoadProject, 
  onExportHTML, onPreview, onViewSource, onOpenSettings, onLoadDemo, onExportPDF, onOpenData, showGrid, onToggleGrid,
  canUndo, canRedo, onUndo, onRedo, onDelete, onCopy,
  selectionCount, onAlign
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onImageUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onLoadProject(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto no-print scrollbar-hide flex-shrink-0 z-30 h-14">
      
      {/* 1. History */}
      <div className="flex items-center gap-0.5">
        <ToolButton onClick={onUndo} icon={<Undo2 size={18} />} label="Annuler" disabled={!canUndo} />
        <ToolButton onClick={onRedo} icon={<Redo2 size={18} />} label="Rétablir" disabled={!canRedo} />
      </div>

      <Divider />

      {/* 2. Selection Actions */}
      <div className="flex items-center gap-0.5">
        <ToolButton onClick={onCopy} icon={<Copy size={18} />} label="Copier" disabled={selectionCount === 0} />
        <ToolButton onClick={onDelete} icon={<Trash2 size={18} />} label="Supprimer" disabled={selectionCount === 0} variant="danger" />
      </div>

      <Divider />

      {/* 3. Insert Basics */}
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden xl:block">Insertion</span>
        <ToolButton onClick={() => onAddElement(ElementType.TEXT)} icon={<Type size={18} />} label="Texte" />
        <ToolButton onClick={() => fileInputRef.current?.click()} icon={<ImageIcon size={18} />} label="Image" />
        <ToolButton onClick={() => onAddElement(ElementType.SHAPE)} icon={<Square size={18} />} label="Forme" />
        <ToolButton onClick={() => onAddElement(ElementType.VIDEO)} icon={<Video size={18} />} label="Vidéo" />
        <ToolButton onClick={() => onAddElement(ElementType.QR_CODE)} icon={<QrCode size={18} />} label="QR Code" />
        <ToolButton onClick={onImportDrive} icon={<Cloud size={18} />} label="Google Drive" />
        <ToolButton onClick={() => onOpenAI()} icon={<Volume2 size={18} />} label="Audio / Voix" />
        <ToolButton onClick={() => onAddElement(ElementType.SECTION)} icon={<BoxSelect size={18} />} label="Zone IA" />
      </div>

      <Divider />

      {/* 4. Structure */}
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden xl:block">Structure</span>
        <ToolButton onClick={() => onAddElement(ElementType.SEQUENCE_TITLE)} icon={<Heading1 size={18} />} label="Titre Séquence (H1)" />
        <ToolButton onClick={() => onAddElement(ElementType.PART_TITLE)} icon={<Heading2 size={18} />} label="Titre Partie (H2)" />
        <ToolButton onClick={() => onAddElement(ElementType.H3_TITLE)} icon={<Heading3 size={18} />} label="Sous-titre (H3)" />
        <ToolButton onClick={() => onAddElement(ElementType.H4_TITLE)} icon={<Heading4 size={18} />} label="Sous-titre (H4)" />
        <ToolButton onClick={() => onAddElement(ElementType.COLUMNS)} icon={<Columns size={18} />} label="Colonnes" />
        <ToolButton onClick={() => onAddElement(ElementType.TOC)} icon={<AlignLeft size={18} />} label="Sommaire" />
      </div>

      <Divider />

      {/* 5. AI */}
      <div className="flex items-center gap-0.5">
        <ToolButton 
          onClick={onOpenAI} 
          icon={<Sparkles size={18} />} 
          label="Assistant IA" 
          variant="primary" 
        />
      </div>

      <Divider />

      {/* 6. Alignment (Conditional) */}
      {selectionCount > 1 && (
        <>
          <div className="flex items-center gap-0.5">
            <ToolButton onClick={() => onAlign('left')} icon={<AlignLeft size={18} />} label="Aligner Gauche" />
            <ToolButton onClick={() => onAlign('center')} icon={<AlignCenter size={18} />} label="Aligner Centre H" />
            <ToolButton onClick={() => onAlign('right')} icon={<AlignRight size={18} />} label="Aligner Droite" />
            <ToolButton onClick={() => onAlign('top')} icon={<ArrowUp size={18} />} label="Aligner Haut" />
            <ToolButton onClick={() => onAlign('middle')} icon={<AlignVerticalJustifyCenter size={18} />} label="Aligner Milieu V" />
            <ToolButton onClick={() => onAlign('bottom')} icon={<ArrowDown size={18} />} label="Aligner Bas" />
          </div>
          <Divider />
        </>
      )}

      {/* 7. Settings & View */}
      <div className="flex items-center gap-0.5 ml-auto">
        <ToolButton onClick={onOpenData} icon={<Database size={18} />} label="Données / Modèles" />
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolButton onClick={onToggleGrid} icon={<Grid size={18} />} label="Grille" active={showGrid} />
        <ToolButton onClick={onOpenSettings} icon={<Settings size={18} />} label="Paramètres" />
        <ToolButton onClick={onLoadDemo} icon={<Zap size={18} />} label="Démo" variant="success" />
      </div>

      <div className="bg-slate-100 rounded-lg flex p-0.5 ml-2">
         <ToolButton onClick={onPreview} icon={<Eye size={18} />} label="Aperçu" compact />
         <div className="w-px bg-slate-300 my-1 mx-0.5"></div>
         <ToolButton onClick={onSaveProject} icon={<Save size={18} />} label="Sauvegarder" compact />
         <ToolButton onClick={() => projectInputRef.current?.click()} icon={<FolderOpen size={18} />} label="Ouvrir" compact />
         <div className="w-px bg-slate-300 my-1 mx-0.5"></div>
         <ToolButton onClick={onExportPDF} icon={<FileDown size={18} />} label="PDF" compact />
         <ToolButton onClick={onExportHTML} icon={<BookTemplate size={18} />} label="Web" compact />
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <input type="file" ref={projectInputRef} onChange={handleProjectLoad} accept=".json" className="hidden" />
    </div>
  );
};
