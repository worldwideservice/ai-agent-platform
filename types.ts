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
  pipelineId?: string;
  stageId?: string;
  createdAt: string;
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