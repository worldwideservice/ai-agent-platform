/**
 * Встроенные роли для обучения агентов
 * Каждая роль — это комбинация источников знаний
 */

export interface BuiltInTrainingRole {
  id: string;
  name: string;
  description: string;
  icon: string;
  sourceIds: string[];  // IDs встроенных источников
}

export const BUILT_IN_TRAINING_ROLES: BuiltInTrainingRole[] = [
  {
    id: 'builtin-role-sales-manager',
    name: 'Менеджер по продажам',
    description: 'Полный набор техник продаж в переписке: SPIN, BANT, воронка, outreach, возражения, закрытие, реактивация, допродажи',
    icon: 'briefcase',
    sourceIds: [
      'builtin-messaging-sales',
      'builtin-spin',
      'builtin-bant',
      'builtin-objections',
      'builtin-closing',
      'builtin-fab',
      'builtin-sales-consciousness',
      'builtin-cold-outreach',
      'builtin-sales-funnel-stages',
      'builtin-lead-reactivation',
      'builtin-upsell-crosssell'
    ]
  },
  {
    id: 'builtin-role-support-agent',
    name: 'Агент поддержки',
    description: 'Решает проблемы клиентов с эмпатией и профессионализмом',
    icon: 'headphones',
    sourceIds: [
      'builtin-active-listening'
    ]
  },
  {
    id: 'builtin-role-consultant',
    name: 'Консультант',
    description: 'Отвечает на вопросы и помогает клиентам разобраться в продукте',
    icon: 'message-circle',
    sourceIds: [
      'builtin-active-listening',
      'builtin-fab'
    ]
  }
];

export function getBuiltInRoleById(id: string): BuiltInTrainingRole | undefined {
  return BUILT_IN_TRAINING_ROLES.find(role => role.id === id);
}

export function getAllBuiltInRoles(): BuiltInTrainingRole[] {
  return BUILT_IN_TRAINING_ROLES;
}
