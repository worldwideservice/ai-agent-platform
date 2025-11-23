export interface CrmPipeline {
  id: string;
  name: string;
  stages: CrmStage[];
}

export interface CrmStage {
  id: string;
  name: string;
}

export interface CrmField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export interface Agent {
  id: string;
  name: string;
  isActive: boolean;
  model: string;
  systemInstructions?: string;
  checkBeforeSend?: boolean;
  pipelineId?: string;
  stageId?: string;
  pipelineSettings?: any;  // Может быть object или string (из БД)
  channelSettings?: any;   // Может быть object или string (из БД)
  kbSettings?: any;        // Может быть object или string (из БД)
  crmType?: string;
  crmConnected?: boolean;
  crmData?: any;           // Может быть object или string (из БД)
  createdAt: string;
  updatedAt?: string;
  userId?: string;
}

export interface KnowledgeCategory {
  id: string;
  title: string;
  subcategoriesCount: number;
  articlesCount: number;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  views: number;
}

// Navigation State
export type Page = 
  | 'dashboard' 
  | 'agents' 
  | 'agent-create'
  | 'agent-editor' 
  | 'chat' 
  | 'kb-categories' 
  | 'kb-category-create'
  | 'kb-articles' 
  | 'kb-article-create'
  | 'settings' 
  | 'billing';