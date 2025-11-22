import { GoogleGenAI } from "@google/genai";

interface SendMessageParams {
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
  agentConfig: {
    model: string;              // 'OpenAI GPT-4.1', 'Google Gemini 2.5 Flash', etc
    systemInstructions: string;
    agentName: string;
  };
}

const getClient = () => {
  // Используем Vite env переменные (VITE_ prefix обязателен!)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables. Please add VITE_GEMINI_API_KEY to .env.local");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Маппинг названий моделей из UI на технические ID Gemini
const MODEL_MAPPING: Record<string, string> = {
  'OpenAI GPT-4.1': 'gemini-2.0-flash-exp',        // Пока используем Gemini (в будущем - OpenAI API)
  'OpenAI GPT-5': 'gemini-2.0-flash-exp',          // Пока используем Gemini
  'Google Gemini 2.5 Flash': 'gemini-2.0-flash-exp',
  'Claude Sonnet 4': 'gemini-2.0-flash-exp',       // Пока используем Gemini (в будущем - Anthropic API)
};

export const sendMessageToGemini = async (params: SendMessageParams): Promise<string> => {
  const { message, history, agentConfig } = params;

  const ai = getClient();
  if (!ai) {
    return "❌ Ошибка: API Key отсутствует.\n\nДобавьте VITE_GEMINI_API_KEY в файл .env.local\n\nПример:\nVITE_GEMINI_API_KEY=your_api_key_here";
  }

  try {
    // Используем модель из настроек агента
    const modelId = MODEL_MAPPING[agentConfig.model] || 'gemini-2.0-flash-exp';

    console.log(`🤖 Используется агент: ${agentConfig.agentName}`);
    console.log(`🧠 Модель: ${agentConfig.model} → ${modelId}`);
    console.log(`📝 Инструкции: ${agentConfig.systemInstructions.substring(0, 50)}...`);

    const chat = ai.chats.create({
      model: modelId,
      config: {
        // Используем системные инструкции из агента
        systemInstruction: agentConfig.systemInstructions,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    // В будущем: воспроизводим историю для контекста
    // Сейчас Gemini SDK управляет историей автоматически
    // for (const msg of history) {
    //   if (msg.role === 'user') {
    //     // Replay messages
    //   }
    // }

    const result = await chat.sendMessage({ message });
    return result.text;

  } catch (error: any) {
    console.error("Gemini API Error:", error);

    // Более детальные ошибки для пользователя
    if (error.message?.includes('API key')) {
      return "❌ Ошибка: Неверный API ключ.\n\nПроверьте VITE_GEMINI_API_KEY в .env.local";
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return "⏱️ Ошибка: Превышен лимит запросов к Gemini API.\n\nПопробуйте через несколько минут или проверьте квоту вашего API ключа.";
    }

    if (error.message?.includes('invalid model')) {
      return `❌ Ошибка: Модель ${agentConfig.model} недоступна.\n\nПопробуйте выбрать другую модель в настройках агента.`;
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return "🌐 Ошибка сети: Не удалось подключиться к Gemini API.\n\nПроверьте интернет-соединение.";
    }

    // Общая ошибка
    return `❌ Ошибка AI: ${error.message || 'Неизвестная ошибка'}\n\nПопробуйте еще раз или обратитесь в поддержку.`;
  }
};
