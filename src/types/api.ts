// API Response Types

export interface ApiError {
  error: string;
  message: string;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
  language?: 'ru' | 'en' | 'ua';
  role: 'USER' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

// Profile Types
export interface ProfileUpdateRequest {
  name?: string;
  company?: string;
  timezone?: string;
  language?: 'ru' | 'en' | 'ua';
}

export interface ProfileResponse {
  user: User;
}

export interface EmailUpdateRequest {
  newEmail: string;
  password: string;
}

export interface AvatarUploadResponse {
  success: boolean;
  message: string;
  avatarUrl: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
}

export interface DeleteAccountRequest {
  password: string;
  confirmation: string;
}

// Agent Types (расширяем существующий тип Agent)
export interface AgentCreateRequest {
  name: string;
  model?: string;
  systemInstructions?: string;
  isActive?: boolean;
  pipelineSettings?: any;
  channelSettings?: any;
  kbSettings?: any;
  crmData?: any;
}

export interface AgentUpdateRequest extends Partial<AgentCreateRequest> {}

export interface AgentResponse {
  id: string;
  name: string;
  isActive: boolean;
  model: string;
  systemInstructions: string | null;
  pipelineSettings: any;
  channelSettings: any;
  kbSettings: any;
  crmType: string | null;
  crmConnected: boolean;
  crmData: any;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// KB Category Types
export interface KbCategoryCreateRequest {
  name: string;
  parentId?: string | null;
}

export interface KbCategoryUpdateRequest {
  name?: string;
  parentId?: string | null;
}

export interface KbCategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: {
    id: string;
    name: string;
  }[];
  _count?: {
    articleCategories: number;
  };
}

// KB Article Types
export interface KbArticleCreateRequest {
  title: string;
  content: string;
  isActive?: boolean;
  categoryIds?: string[];
  relatedArticles?: string[];
}

export interface KbArticleUpdateRequest extends Partial<KbArticleCreateRequest> {}

export interface KbArticleResponse {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  relatedArticles: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  articleCategories?: {
    article: {
      id: number;
      title: string;
      isActive: boolean;
    };
    category: {
      id: string;
      name: string;
    };
  }[];
}
