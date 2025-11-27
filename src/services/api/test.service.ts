import { apiClient } from './apiClient';

export interface AgentPauseStatus {
  agentId: string;
  leadId: number;
  integrationId?: string;
  paused: boolean;
  pausedAt: string | null;
  pausedByUserId: number | null;
  settings?: {
    stopOnReply: boolean;
    resumeTime: number;
    resumeUnit: string;
  };
}

export interface SimulateResponse {
  success: boolean;
  message: string;
  data?: any;
  canRespond?: boolean;
  pauseStatus?: {
    paused: boolean;
    pausedAt: string | null;
    pausedByUserId: number | null;
  };
}

export const testService = {
  /**
   * Симулировать ответ сотрудника (поставить агента на паузу)
   */
  async simulateEmployeeReply(agentId: string, leadId: number = 12345): Promise<SimulateResponse> {
    const response = await apiClient.post<SimulateResponse>('/test/simulate-employee-reply', {
      agentId,
      leadId,
    });
    return response.data;
  },

  /**
   * Симулировать сообщение клиента (проверить может ли агент ответить)
   */
  async simulateClientMessage(agentId: string, leadId: number = 12345): Promise<SimulateResponse> {
    const response = await apiClient.post<SimulateResponse>('/test/simulate-client-message', {
      agentId,
      leadId,
    });
    return response.data;
  },

  /**
   * Получить статус паузы агента
   */
  async getAgentStatus(agentId: string, leadId: number = 12345): Promise<AgentPauseStatus> {
    const response = await apiClient.get<AgentPauseStatus>(`/test/agent-status/${agentId}`, {
      params: { leadId },
    });
    return response.data;
  },

  /**
   * Принудительно снять паузу с агента
   */
  async forceResumeAgent(agentId: string, leadId: number = 12345): Promise<SimulateResponse> {
    const response = await apiClient.post<SimulateResponse>('/test/resume-agent', {
      agentId,
      leadId,
    });
    return response.data;
  },
};
