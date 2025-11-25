import apiClient from './apiClient';

export interface ChainAction {
  id: string;
  type: string;
  instruction: string;
}

export interface ChainStep {
  id: string;
  delayValue: number;
  delayUnit: string;
  actions: ChainAction[];
}

export interface WorkingDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export interface Chain {
  id: string;
  agentId: string;
  name: string;
  isActive: boolean;
  conditionType: 'all' | 'specific';
  conditionStages: string[];
  conditionExclude?: string;
  steps: ChainStep[];
  schedule: WorkingDay[];
  runLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChainRequest {
  name: string;
  isActive: boolean;
  conditionType: 'all' | 'specific';
  conditionStages: string[];
  conditionExclude?: string;
  steps: Omit<ChainStep, 'id'>[];
  schedule: WorkingDay[];
  runLimit?: number;
}

export interface UpdateChainRequest extends Partial<CreateChainRequest> {}

class ChainsService {
  /**
   * Получить все цепочки агента
   */
  async getChains(agentId: string): Promise<Chain[]> {
    const response = await apiClient.get<{ chains: Chain[] }>(`/agents/${agentId}/chains`);
    return response.data.chains;
  }

  /**
   * Получить цепочку по ID
   */
  async getChainById(agentId: string, chainId: string): Promise<Chain> {
    const response = await apiClient.get<Chain>(`/agents/${agentId}/chains/${chainId}`);
    return response.data;
  }

  /**
   * Создать цепочку
   */
  async createChain(agentId: string, data: CreateChainRequest): Promise<Chain> {
    const response = await apiClient.post<Chain>(`/agents/${agentId}/chains`, data);
    return response.data;
  }

  /**
   * Обновить цепочку
   */
  async updateChain(
    agentId: string,
    chainId: string,
    data: UpdateChainRequest
  ): Promise<Chain> {
    const response = await apiClient.put<Chain>(
      `/agents/${agentId}/chains/${chainId}`,
      data
    );
    return response.data;
  }

  /**
   * Удалить цепочку
   */
  async deleteChain(agentId: string, chainId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/agents/${agentId}/chains/${chainId}`
    );
    return response.data;
  }

  /**
   * Переключить статус цепочки
   */
  async toggleChain(agentId: string, chainId: string): Promise<Chain> {
    const chain = await this.getChainById(agentId, chainId);
    return this.updateChain(agentId, chainId, {
      isActive: !chain.isActive,
    });
  }
}

export const chainsService = new ChainsService();
export default chainsService;
