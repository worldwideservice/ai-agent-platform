import { Request } from 'express';

// Расширяем Express Request для добавления userId
export interface AuthRequest extends Request {
  userId?: string;
}

// DTOs для создания/обновления

export interface CreateAgentDto {
  name: string;
  model?: string;
  systemInstructions?: string;
  isActive?: boolean;
}

export interface UpdateAgentDto {
  name?: string;
  model?: string;
  systemInstructions?: string;
  isActive?: boolean;
  pipelineSettings?: any;
  channelSettings?: any;
  kbSettings?: any;
}

export interface CreateKbCategoryDto {
  name: string;
  parentId?: string | null;
}

export interface UpdateKbCategoryDto {
  name?: string;
  parentId?: string | null;
}

export interface CreateKbArticleDto {
  title: string;
  content: string;
  isActive?: boolean;
  categories: string[]; // Array of category IDs
  relatedArticles?: string[]; // Array of article IDs
}

export interface UpdateKbArticleDto {
  title?: string;
  content?: string;
  isActive?: boolean;
  categories?: string[];
  relatedArticles?: string[];
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}
