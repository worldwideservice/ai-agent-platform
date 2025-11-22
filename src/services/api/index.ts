// Экспорт всех API сервисов
export { default as apiClient } from './apiClient';
export { default as authService } from './auth.service';
export { default as agentService } from './agent.service';
export { default as kbService } from './kb.service';
export { crmService } from './crm.service';
export { default as settingsService } from './settings.service';
export { default as analyticsService } from './analytics.service';

// Re-export для удобства
export * from './apiClient';
export * from './auth.service';
export * from './agent.service';
export * from './kb.service';
export * from './crm.service';
export * from './settings.service';
export * from './analytics.service';
