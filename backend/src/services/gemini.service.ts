import { GoogleGenerativeAI } from '@google/generative-ai';

// Инициализация клиента Google Generative AI
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Маппинг моделей (названия из фронтенда -> реальные модели)
const MODEL_MAPPING: Record<string, string> = {
  'OpenAI GPT-4.1': 'gemini-2.0-flash-exp',
  'OpenAI GPT-5': 'gemini-2.0-flash-exp',
  'Google Gemini 2.5 Flash': 'gemini-2.0-flash-exp',
  'Gemini 1.5 Pro': 'gemini-1.5-pro',
  'Claude Sonnet 4': 'gemini-2.0-flash-exp'
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SendMessageParams {
  message: string;
  history: ChatMessage[];
  agentConfig: {
    model: string;
    systemInstructions: string;
    agentName: string;
  };
}

/**
 * Отправить сообщение в Gemini и получить ответ
 */
export async function sendMessageToGemini(params: SendMessageParams): Promise<string> {
  const { message, history, agentConfig } = params;

  try {
    // Получаем реальное имя модели
    const realModelName = MODEL_MAPPING[agentConfig.model] || 'gemini-2.0-flash-exp';

    // Создаем модель с системными инструкциями
    const model = genAI.getGenerativeModel({
      model: realModelName,
      systemInstruction: agentConfig.systemInstructions || 'Вы - полезный AI-ассистент.',
    });

    // Настройки генерации
    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    };

    // Создаем чат с историей
    const chat = model.startChat({
      generationConfig,
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
    });

    // Отправляем сообщение
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    return text;
  } catch (error: any) {
    console.error('❌ Gemini API Error:', error);

    // Обработка ошибок
    if (error.message?.includes('API key')) {
      throw new Error('Неверный API ключ Gemini. Проверьте настройки.');
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error('Превышен лимит запросов к Gemini API. Попробуйте позже.');
    } else if (error.message?.includes('model')) {
      throw new Error(`Модель ${agentConfig.model} недоступна. Выберите другую модель.`);
    } else {
      throw new Error('Ошибка при обращении к Gemini API: ' + error.message);
    }
  }
}

export default {
  sendMessageToGemini,
};
