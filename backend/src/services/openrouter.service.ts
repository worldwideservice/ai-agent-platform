import fetch from 'node-fetch';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  description?: string;
  context_length: number;
  max_completion_tokens?: number;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length: number;
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error' | null;
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
  };
}

/**
 * Fetch all available models from OpenRouter
 */
export async function fetchModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching OpenRouter models:', error);
    throw new Error(`Failed to fetch models: ${error.message}`);
  }
}

/**
 * Send chat completion request to OpenRouter
 */
export async function chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
        'X-Title': 'AI Agent Platform',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `OpenRouter API error: ${response.status}`
      );
    }

    return await response.json() as ChatCompletionResponse;
  } catch (error: any) {
    console.error('❌ Error in OpenRouter chat completion:', error);

    // Handle specific errors
    if (error.message?.includes('API key')) {
      throw new Error('Invalid OpenRouter API key');
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error('OpenRouter rate limit exceeded. Try again later.');
    } else if (error.message?.includes('model')) {
      throw new Error(`Model not available: ${request.model}`);
    }

    throw new Error(`OpenRouter error: ${error.message}`);
  }
}

/**
 * Stream chat completion from OpenRouter
 * Returns async generator for streaming responses
 */
export async function* streamChatCompletion(
  request: ChatCompletionRequest
): AsyncGenerator<string> {
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
        'X-Title': 'AI Agent Platform',
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter streaming error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Error in OpenRouter streaming:', error);
    throw new Error(`Streaming error: ${error.message}`);
  }
}

/**
 * Estimate cost for a chat completion
 */
export function estimateCost(
  model: OpenRouterModel,
  promptTokens: number,
  completionTokens: number
): number {
  const promptCost = promptTokens * parseFloat(model.pricing.prompt);
  const completionCost = completionTokens * parseFloat(model.pricing.completion);
  return promptCost + completionCost;
}

export default {
  fetchModels,
  chatCompletion,
  streamChatCompletion,
  estimateCost,
};
