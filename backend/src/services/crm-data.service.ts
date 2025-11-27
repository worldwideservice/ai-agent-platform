/**
 * CRM Data Service
 * Сервис для работы с данными сделок и контактов из Kommo CRM
 * Используется агентом для получения контекста о клиенте
 */

import {
  fetchLeadById,
  fetchContactById,
  updateLead,
  updateContact,
  KommoLead,
  KommoContact,
} from './kommo.service';

// ============================================================================
// Types
// ============================================================================

interface CrmFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: string;
}

interface UpdateRule {
  id: string;
  fieldId: string;
  condition: string;
  overwrite: boolean;
}

interface CrmDataSettings {
  dealFields?: CrmFieldDefinition[];
  contactFields?: CrmFieldDefinition[];
  dealReadFields?: string[];
  contactReadFields?: string[];
  dealUpdateRules?: UpdateRule[];
  contactUpdateRules?: UpdateRule[];
}

interface DealContext {
  [key: string]: any;
}

interface ContactContext {
  [key: string]: any;
}

export interface CrmContext {
  deal?: DealContext;
  contact?: ContactContext;
  raw?: {
    lead?: KommoLead;
    contact?: KommoContact;
  };
}

// ============================================================================
// Default Field Definitions (same as frontend)
// ============================================================================

const DEFAULT_DEAL_FIELDS: CrmFieldDefinition[] = [
  { id: 'deal_stage', key: 'stage_id', label: 'Этап сделки', type: 'select' },
  { id: 'deal_name', key: 'name', label: 'Название сделки', type: 'text' },
  { id: 'deal_budget', key: 'price', label: 'Бюджет', type: 'number' },
  { id: 'deal_responsible', key: 'responsible_user_id', label: 'Ответственный пользователь', type: 'select' },
  { id: 'deal_created', key: 'created_at', label: 'Дата создания', type: 'date' },
  { id: 'deal_tags', key: 'tags', label: 'Теги', type: 'tags' },
];

const DEFAULT_CONTACT_FIELDS: CrmFieldDefinition[] = [
  { id: 'contact_name', key: 'name', label: 'Имя Контакта', type: 'text' },
  { id: 'contact_phone', key: 'phone', label: 'Телефон', type: 'phone' },
  { id: 'contact_email', key: 'email', label: 'Email', type: 'email' },
  { id: 'contact_company', key: 'company', label: 'Компания', type: 'text' },
  { id: 'contact_position', key: 'position', label: 'Должность', type: 'text' },
  { id: 'contact_tags', key: 'tags', label: 'Теги', type: 'tags' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse crmData from agent (handles double-encoded JSON)
 */
export function parseCrmDataSettings(crmData: any): CrmDataSettings | null {
  if (!crmData) return null;

  try {
    if (typeof crmData === 'string') {
      let parsed = JSON.parse(crmData);
      // Handle double-encoded JSON
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    } else if (typeof crmData === 'object') {
      return crmData;
    }
    return null;
  } catch (error) {
    console.error('Error parsing crmData:', error);
    return null;
  }
}

/**
 * Get field definition by ID
 */
function getFieldDefinition(
  fieldId: string,
  dealFields: CrmFieldDefinition[],
  contactFields: CrmFieldDefinition[]
): CrmFieldDefinition | null {
  return dealFields.find(f => f.id === fieldId) ||
         contactFields.find(f => f.id === fieldId) ||
         null;
}

/**
 * Extract value from Kommo lead/contact by field key
 */
function extractFieldValue(
  entity: any,
  fieldDef: CrmFieldDefinition
): any {
  const { key, type } = fieldDef;

  // Standard fields
  if (key in entity) {
    const value = entity[key];

    // Format based on type
    if (type === 'date' && typeof value === 'number') {
      return new Date(value * 1000).toISOString().split('T')[0];
    }
    if (type === 'tags' && entity._embedded?.tags) {
      return entity._embedded.tags.map((t: any) => t.name).join(', ');
    }
    return value;
  }

  // Check custom fields
  if (entity.custom_fields_values) {
    for (const cf of entity.custom_fields_values) {
      // Match by field code or name
      if (cf.field_code?.toLowerCase() === key.toLowerCase() ||
          cf.field_name?.toLowerCase().includes(key.toLowerCase())) {
        // Return first value
        if (cf.values && cf.values.length > 0) {
          return cf.values[0].value;
        }
      }
      // Also check by field_id if key looks like a number
      if (!isNaN(Number(key)) && cf.field_id === Number(key)) {
        if (cf.values && cf.values.length > 0) {
          return cf.values[0].value;
        }
      }
    }
  }

  return null;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch and format CRM context for AI agent
 * Returns deal and contact data filtered by agent's crmData settings
 */
export async function getCrmContext(
  integrationId: string,
  leadId: number,
  crmData: any
): Promise<CrmContext> {
  const settings = parseCrmDataSettings(crmData);

  if (!settings) {
    console.log('📊 No CRM data settings configured');
    return {};
  }

  const dealReadFields = settings.dealReadFields || [];
  const contactReadFields = settings.contactReadFields || [];

  // If no fields selected, return empty context
  if (dealReadFields.length === 0 && contactReadFields.length === 0) {
    console.log('📊 No CRM fields selected for reading');
    return {};
  }

  console.log(`📊 Fetching CRM context: ${dealReadFields.length} deal fields, ${contactReadFields.length} contact fields`);

  // Get field definitions (from settings or defaults)
  const dealFields = settings.dealFields || DEFAULT_DEAL_FIELDS;
  const contactFields = settings.contactFields || DEFAULT_CONTACT_FIELDS;

  const result: CrmContext = {};

  try {
    // 1. Fetch lead data
    const lead = await fetchLeadById(integrationId, leadId);

    if (!lead) {
      console.error(`❌ Lead ${leadId} not found`);
      return {};
    }

    result.raw = { lead };

    // 2. Extract deal fields
    if (dealReadFields.length > 0) {
      result.deal = {};

      for (const fieldId of dealReadFields) {
        const fieldDef = getFieldDefinition(fieldId, dealFields, contactFields);
        if (fieldDef) {
          const value = extractFieldValue(lead, fieldDef);
          if (value !== null && value !== undefined) {
            result.deal[fieldDef.label] = value;
          }
        }
      }

      console.log(`📊 Extracted deal data:`, Object.keys(result.deal));
    }

    // 3. Fetch contact data if contact fields are selected
    if (contactReadFields.length > 0) {
      const contacts = lead._embedded?.contacts || [];

      if (contacts.length > 0) {
        const contactId = contacts[0].id;
        try {
          const contact = await fetchContactById(integrationId, contactId);

          if (contact) {
            result.raw!.contact = contact;
            result.contact = {};

            for (const fieldId of contactReadFields) {
              const fieldDef = getFieldDefinition(fieldId, dealFields, contactFields);
              if (fieldDef) {
                const value = extractFieldValue(contact, fieldDef);
                if (value !== null && value !== undefined) {
                  result.contact[fieldDef.label] = value;
                }
              }
            }

            console.log(`📊 Extracted contact data:`, Object.keys(result.contact));
          }
        } catch (contactError: any) {
          console.error(`⚠️ Failed to fetch contact ${contactId}:`, contactError.message);
        }
      } else {
        console.log('⚠️ No contacts linked to this lead');
      }
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error fetching CRM context:', error.message);
    return {};
  }
}

/**
 * Build context string for AI prompt
 */
export function buildCrmContextPrompt(context: CrmContext): string {
  if (!context.deal && !context.contact) {
    return '';
  }

  let prompt = '\n\n## Данные из CRM:';

  if (context.deal && Object.keys(context.deal).length > 0) {
    prompt += '\n\n### Данные сделки:';
    for (const [label, value] of Object.entries(context.deal)) {
      prompt += `\n- ${label}: ${value}`;
    }
  }

  if (context.contact && Object.keys(context.contact).length > 0) {
    prompt += '\n\n### Данные контакта:';
    for (const [label, value] of Object.entries(context.contact)) {
      prompt += `\n- ${label}: ${value}`;
    }
  }

  return prompt;
}

/**
 * Get update rules from crmData settings
 */
export function getUpdateRules(crmData: any): {
  dealRules: UpdateRule[];
  contactRules: UpdateRule[];
} {
  const settings = parseCrmDataSettings(crmData);

  if (!settings) {
    return { dealRules: [], contactRules: [] };
  }

  // Filter out empty rules
  const dealRules = (settings.dealUpdateRules || []).filter(
    r => r.fieldId && r.condition
  );
  const contactRules = (settings.contactUpdateRules || []).filter(
    r => r.fieldId && r.condition
  );

  return { dealRules, contactRules };
}

/**
 * Extract value from text based on field type and patterns
 */
function extractValueFromText(
  text: string,
  fieldType: string,
  condition: string
): string | number | null {
  const lowerCondition = condition.toLowerCase();

  // Find the sentence or phrase containing the condition
  const sentences = text.split(/[.!?\n]/);
  const relevantSentence = sentences.find(s => s.toLowerCase().includes(lowerCondition)) || text;

  switch (fieldType) {
    case 'number':
      // Extract numbers (price, budget, etc.)
      const numbers = relevantSentence.match(/[\d\s]+[\d]/g);
      if (numbers && numbers.length > 0) {
        // Take the largest number found (likely to be the price/budget)
        const parsedNumbers = numbers.map(n => parseInt(n.replace(/\s/g, ''), 10));
        return Math.max(...parsedNumbers);
      }
      break;

    case 'phone':
      // Extract phone numbers
      const phoneMatch = relevantSentence.match(/\+?[\d\s\-()]{10,}/);
      if (phoneMatch) {
        return phoneMatch[0].trim();
      }
      break;

    case 'email':
      // Extract email addresses
      const emailMatch = relevantSentence.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        return emailMatch[0];
      }
      break;

    case 'text':
      // For text fields, try to extract quoted text or text after ":"
      const quotedMatch = relevantSentence.match(/["«]([^"»]+)["»]/);
      if (quotedMatch) {
        return quotedMatch[1].trim();
      }
      // Try to find text after common patterns
      const afterColon = relevantSentence.match(/:\s*(.+?)(?:[,.]|$)/);
      if (afterColon) {
        return afterColon[1].trim();
      }
      break;
  }

  return null;
}

/**
 * Get current field value from entity
 */
function getCurrentFieldValue(
  entity: any,
  fieldDef: CrmFieldDefinition
): any {
  const { key } = fieldDef;

  // Standard fields
  if (key in entity) {
    return entity[key];
  }

  // Custom fields
  if (entity.custom_fields_values) {
    for (const cf of entity.custom_fields_values) {
      if (cf.field_code?.toLowerCase() === key.toLowerCase() ||
          cf.field_name?.toLowerCase().includes(key.toLowerCase())) {
        if (cf.values && cf.values.length > 0) {
          return cf.values[0].value;
        }
      }
    }
  }

  return null;
}

/**
 * Build update payload for Kommo API
 */
function buildUpdatePayload(
  fieldDef: CrmFieldDefinition,
  value: any
): any {
  const { key, type } = fieldDef;

  // Standard fields
  if (['name', 'price', 'status_id', 'pipeline_id', 'responsible_user_id'].includes(key)) {
    return { [key]: value };
  }

  // Tags field requires special format
  if (type === 'tags') {
    const tagNames = typeof value === 'string' ? value.split(',').map(t => t.trim()) : [value];
    return {
      _embedded: {
        tags: tagNames.map(name => ({ name }))
      }
    };
  }

  // Custom fields require special format
  // For now, we need the field_id which should be in the key for custom fields
  if (!isNaN(Number(key))) {
    return {
      custom_fields_values: [{
        field_id: Number(key),
        values: [{ value }]
      }]
    };
  }

  // For contact fields like phone, email - these are custom fields in Kommo
  if (type === 'phone' || type === 'email') {
    // These need custom_fields_values with specific enum
    return {
      custom_fields_values: [{
        field_code: type.toUpperCase(),
        values: [{
          value,
          enum_code: type === 'phone' ? 'WORK' : 'WORK'
        }]
      }]
    };
  }

  return { [key]: value };
}

/**
 * Execute update rules based on AI response
 * This function analyzes the AI response and updates CRM fields if conditions are met
 */
export async function executeUpdateRules(
  integrationId: string,
  leadId: number,
  aiResponse: string,
  crmData: any,
  context: CrmContext
): Promise<{ updated: boolean; changes: string[] }> {
  const { dealRules, contactRules } = getUpdateRules(crmData);
  const changes: string[] = [];
  const dealUpdates: any = {};
  const contactUpdates: any = {};

  if (dealRules.length === 0 && contactRules.length === 0) {
    return { updated: false, changes: [] };
  }

  console.log(`🔄 Checking ${dealRules.length} deal rules and ${contactRules.length} contact rules`);

  const settings = parseCrmDataSettings(crmData);
  const dealFields = settings?.dealFields || DEFAULT_DEAL_FIELDS;
  const contactFields = settings?.contactFields || DEFAULT_CONTACT_FIELDS;

  // Process deal update rules
  for (const rule of dealRules) {
    const fieldDef = dealFields.find(f => f.id === rule.fieldId);
    if (!fieldDef) continue;

    // Check if condition is mentioned in AI response
    const conditionMet = aiResponse.toLowerCase().includes(rule.condition.toLowerCase());

    if (conditionMet) {
      console.log(`✅ Deal rule condition met: "${rule.condition}" for field ${fieldDef.label}`);

      // Check overwrite flag
      if (!rule.overwrite && context.raw?.lead) {
        const currentValue = getCurrentFieldValue(context.raw.lead, fieldDef);
        if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
          console.log(`⏭️ Skipping update: field "${fieldDef.label}" already has value and overwrite=false`);
          changes.push(`Skipped "${fieldDef.label}" (has value, overwrite disabled)`);
          continue;
        }
      }

      // Extract value from AI response
      const extractedValue = extractValueFromText(aiResponse, fieldDef.type, rule.condition);

      if (extractedValue !== null) {
        const updatePayload = buildUpdatePayload(fieldDef, extractedValue);
        Object.assign(dealUpdates, updatePayload);
        changes.push(`Updated deal "${fieldDef.label}" = ${extractedValue}`);
        console.log(`📝 Will update deal field "${fieldDef.label}" to:`, extractedValue);
      } else {
        console.log(`⚠️ Could not extract value for field "${fieldDef.label}" from AI response`);
        changes.push(`Condition met for "${fieldDef.label}" but no value extracted`);
      }
    }
  }

  // Process contact update rules
  const contactId = context.raw?.contact?.id || context.raw?.lead?._embedded?.contacts?.[0]?.id;

  if (contactRules.length > 0 && contactId) {
    for (const rule of contactRules) {
      const fieldDef = contactFields.find(f => f.id === rule.fieldId);
      if (!fieldDef) continue;

      const conditionMet = aiResponse.toLowerCase().includes(rule.condition.toLowerCase());

      if (conditionMet) {
        console.log(`✅ Contact rule condition met: "${rule.condition}" for field ${fieldDef.label}`);

        // Check overwrite flag
        if (!rule.overwrite && context.raw?.contact) {
          const currentValue = getCurrentFieldValue(context.raw.contact, fieldDef);
          if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
            console.log(`⏭️ Skipping update: field "${fieldDef.label}" already has value and overwrite=false`);
            changes.push(`Skipped contact "${fieldDef.label}" (has value, overwrite disabled)`);
            continue;
          }
        }

        // Extract value from AI response
        const extractedValue = extractValueFromText(aiResponse, fieldDef.type, rule.condition);

        if (extractedValue !== null) {
          const updatePayload = buildUpdatePayload(fieldDef, extractedValue);
          // Merge custom_fields_values arrays if both exist
          if (updatePayload.custom_fields_values && contactUpdates.custom_fields_values) {
            contactUpdates.custom_fields_values.push(...updatePayload.custom_fields_values);
          } else {
            Object.assign(contactUpdates, updatePayload);
          }
          changes.push(`Updated contact "${fieldDef.label}" = ${extractedValue}`);
          console.log(`📝 Will update contact field "${fieldDef.label}" to:`, extractedValue);
        } else {
          console.log(`⚠️ Could not extract value for contact field "${fieldDef.label}" from AI response`);
          changes.push(`Condition met for contact "${fieldDef.label}" but no value extracted`);
        }
      }
    }
  }

  // Execute actual CRM updates
  let updated = false;

  // Update deal if we have changes
  if (Object.keys(dealUpdates).length > 0) {
    try {
      console.log(`📤 Sending deal update to Kommo:`, dealUpdates);
      await updateLead(integrationId, leadId, dealUpdates);
      updated = true;
      console.log(`✅ Deal ${leadId} updated successfully`);
    } catch (error: any) {
      console.error(`❌ Failed to update deal ${leadId}:`, error.message);
      changes.push(`Error updating deal: ${error.message}`);
    }
  }

  // Update contact if we have changes
  if (Object.keys(contactUpdates).length > 0 && contactId) {
    try {
      console.log(`📤 Sending contact update to Kommo:`, contactUpdates);
      await updateContact(integrationId, contactId, contactUpdates);
      updated = true;
      console.log(`✅ Contact ${contactId} updated successfully`);
    } catch (error: any) {
      console.error(`❌ Failed to update contact ${contactId}:`, error.message);
      changes.push(`Error updating contact: ${error.message}`);
    }
  }

  return {
    updated,
    changes,
  };
}

export default {
  parseCrmDataSettings,
  getCrmContext,
  buildCrmContextPrompt,
  getUpdateRules,
  executeUpdateRules,
};
