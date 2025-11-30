
export enum ElementType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SHAPE = 'SHAPE',
  SECTION = 'SECTION',
  HTML = 'HTML',
  SVG = 'SVG',
  QCM = 'QCM',
  SEQUENCE_TITLE = 'SEQUENCE_TITLE',
  PART_TITLE = 'PART_TITLE',
  H3_TITLE = 'H3_TITLE',
  H4_TITLE = 'H4_TITLE',
  TOC = 'TOC',
  FILL_IN_THE_BLANKS = 'FILL_IN_THE_BLANKS',
  MATCHING = 'MATCHING',
  TIMELINE = 'TIMELINE',
  FLASHCARDS = 'FLASHCARDS',
  TRUE_FALSE = 'TRUE_FALSE',
  MIND_MAP = 'MIND_MAP',
  THREED_MODEL = 'THREED_MODEL',
  VIDEO = 'VIDEO',
  QR_CODE = 'QR_CODE',
  CONNECT_DOTS = 'CONNECT_DOTS',
  AUDIO = 'AUDIO',
  COLUMNS = 'COLUMNS'
}

export interface ElementStyle {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    zIndex?: number;
    boxShadow?: string;
    gap?: number; // Added for Columns
}

export interface PageElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; 
  style: ElementStyle & { zIndex: number }; // zIndex is mandatory for instances
  
  // Container Logic
  containerId?: string;       // ID of the parent COLUMNS element
  containerColIndex?: number; // Index of the column (0, 1, 2, 3)
}

export type PageType = 'standard' | 'cover' | 'white' | 'summary' | 'back_cover';

export type PageBackground = 'none' | 'lines' | 'grid' | 'seyes' | 'dots';

export interface Page {
  id: string;
  type: PageType;
  elements: PageElement[];
  background?: PageBackground; 
  backgroundColor?: string;    
  backgroundImage?: string;    
}

export interface DataSource {
    id: string;
    name: string;
    sourceUrl: string;
    data: any;
    timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  version: string;
  pages: Page[];
  updatedAt: number;
  dataSources?: DataSource[];
}

// Global App Settings
export interface AppSettings {
    defaultPage: {
        backgroundColor: string;
        background: PageBackground;
    };
    // Generic defaults for any element type
    elementDefaults: Partial<Record<ElementType, ElementStyle>>;
}
