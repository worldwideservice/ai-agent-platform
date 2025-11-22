import apiClient from './apiClient';
import {
  KbCategoryResponse,
  KbCategoryCreateRequest,
  KbCategoryUpdateRequest,
  KbArticleResponse,
  KbArticleCreateRequest,
  KbArticleUpdateRequest,
} from '../../types/api';

class KbService {
  // ==================== Categories ====================

  /**
   * Получить все категории
   */
  async getAllCategories(): Promise<KbCategoryResponse[]> {
    const response = await apiClient.get<KbCategoryResponse[]>(
      '/kb/categories'
    );
    return response.data;
  }

  /**
   * Получить категорию по ID
   */
  async getCategoryById(id: string): Promise<KbCategoryResponse> {
    const response = await apiClient.get<KbCategoryResponse>(
      `/kb/categories/${id}`
    );
    return response.data;
  }

  /**
   * Создать новую категорию
   */
  async createCategory(
    data: KbCategoryCreateRequest
  ): Promise<KbCategoryResponse> {
    const response = await apiClient.post<KbCategoryResponse>(
      '/kb/categories',
      data
    );
    return response.data;
  }

  /**
   * Обновить категорию
   */
  async updateCategory(
    id: string,
    data: KbCategoryUpdateRequest
  ): Promise<KbCategoryResponse> {
    const response = await apiClient.put<KbCategoryResponse>(
      `/kb/categories/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Удалить категорию
   */
  async deleteCategory(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(
      `/kb/categories/${id}`
    );
    return response.data;
  }

  // ==================== Articles ====================

  /**
   * Получить все статьи (с опциональными фильтрами)
   */
  async getAllArticles(params?: {
    categoryId?: string;
    isActive?: boolean;
  }): Promise<KbArticleResponse[]> {
    const response = await apiClient.get<KbArticleResponse[]>('/kb/articles', {
      params,
    });
    return response.data;
  }

  /**
   * Получить статью по ID
   */
  async getArticleById(id: number): Promise<KbArticleResponse> {
    const response = await apiClient.get<KbArticleResponse>(
      `/kb/articles/${id}`
    );
    return response.data;
  }

  /**
   * Создать новую статью
   */
  async createArticle(
    data: KbArticleCreateRequest
  ): Promise<KbArticleResponse> {
    const response = await apiClient.post<KbArticleResponse>(
      '/kb/articles',
      data
    );
    return response.data;
  }

  /**
   * Обновить статью
   */
  async updateArticle(
    id: number,
    data: KbArticleUpdateRequest
  ): Promise<KbArticleResponse> {
    const response = await apiClient.put<KbArticleResponse>(
      `/kb/articles/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Удалить статью
   */
  async deleteArticle(id: number): Promise<{ message: string; id: number }> {
    const response = await apiClient.delete<{ message: string; id: number }>(
      `/kb/articles/${id}`
    );
    return response.data;
  }

  /**
   * Переключить активность статьи
   */
  async toggleArticleStatus(id: number): Promise<KbArticleResponse> {
    const response = await apiClient.patch<KbArticleResponse>(
      `/kb/articles/${id}/toggle`
    );
    return response.data;
  }
}

export const kbService = new KbService();
export default kbService;
