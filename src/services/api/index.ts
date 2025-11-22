// Экспорт всех API сервисов
export { default as apiClient } from './apiClient';
export { default as authService } from './auth.service';
export { default as agentService } from './agent.service';
export { default as kbService } from './kb.service';
export { crmService } from './crm.service';

// Re-export для удобства
export * from './apiClient';
export * from './auth.service';
export * from './agent.service';
export * from './kb.service';
export * from './crm.service';
