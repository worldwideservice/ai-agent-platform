import OpenAI from 'openai';

export interface ContentAnalysis {
  suggestedCategories: Array<{
    name: string;
    description: string;
    parentCategory?: string;
  }>;

  articles: Array<{
    title: string;
    content: string;
    categoryNames: string[];
    priority: 'high' | 'medium' | 'low';
    type: 'faq' | 'policy' | 'product' | 'service' | 'general';
  }>;

  summary: string;
  totalTokens: number;
}

/**
 * Analyze content with AI and create structured Knowledge Base
 */
export async function analyzeContentWithAI(
  extractedTexts: string[],
  language: 'ru' | 'en' = 'ru',
  model: string = 'anthropic/claude-3.5-sonnet'
): Promise<ContentAnalysis> {
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  // Combine all texts
  const combinedText = extractedTexts.join('\n\n---\n\n');

  // Limit length to avoid token limits (approximately 12k tokens)
  const maxLength = 50000;
  const textToAnalyze = combinedText.slice(0, maxLength);

  const systemPrompt =
    language === 'ru'
      ? `Ты - эксперт по структурированию корпоративной информации.

Проанализируй текст и создай структурированную базу знаний:

1. Определи 5-10 логических категорий (например: "Продукты", "Услуги", "FAQ", "Политики", "Контакты")
2. Для каждой категории определи 0-3 подкатегории
3. Разбей информацию на отдельные статьи (каждая статья = одна конкретная тема)
4. Для каждой статьи:
   - Придумай четкий, информативный заголовок
   - Сформулируй полное содержание (200-1000 слов)
   - Определи тип: faq, policy, product, service, или general
   - Назначь 1-3 категории
   - Укажи приоритет: high, medium, low

Важно:
- Сохрани все важные детали из оригинального текста
- Не выдумывай информацию, которой нет в тексте
- Статьи должны быть самодостаточными и понятными
- Используй простой, понятный язык

Верни результат в формате JSON:
{
  "suggestedCategories": [
    {
      "name": "Название категории",
      "description": "Краткое описание",
      "parentCategory": "Родительская категория (если есть)"
    }
  ],
  "articles": [
    {
      "title": "Заголовок статьи",
      "content": "Полный текст статьи",
      "categoryNames": ["Категория1", "Категория2"],
      "priority": "high|medium|low",
      "type": "faq|policy|product|service|general"
    }
  ],
  "summary": "Краткое резюме всей информации"
}`
      : `You are an expert in structuring corporate information.

Analyze the text and create a structured knowledge base:

1. Identify 5-10 logical categories (e.g., "Products", "Services", "FAQ", "Policies", "Contacts")
2. For each category, identify 0-3 subcategories
3. Break down information into separate articles (each article = one specific topic)
4. For each article:
   - Create a clear, informative title
   - Formulate complete content (200-1000 words)
   - Determine type: faq, policy, product, service, or general
   - Assign 1-3 categories
   - Specify priority: high, medium, low

Important:
- Preserve all important details from the original text
- Don't make up information that isn't in the text
- Articles should be self-contained and understandable
- Use simple, clear language

Return the result in JSON format:
{
  "suggestedCategories": [
    {
      "name": "Category name",
      "description": "Brief description",
      "parentCategory": "Parent category (if any)"
    }
  ],
  "articles": [
    {
      "title": "Article title",
      "content": "Full article text",
      "categoryNames": ["Category1", "Category2"],
      "priority": "high|medium|low",
      "type": "faq|policy|product|service|general"
    }
  ],
  "summary": "Brief summary of all information"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: textToAnalyze },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const analysis = JSON.parse(content);

    return {
      ...analysis,
      totalTokens: completion.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('Error analyzing content with AI:', error);
    throw new Error(
      `Failed to analyze content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Estimate tokens for text (rough estimate: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split large text into chunks to avoid token limits
 */
export function chunkText(text: string, maxChunkSize: number = 40000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < text.length) {
    const chunk = text.slice(currentPosition, currentPosition + maxChunkSize);
    chunks.push(chunk);
    currentPosition += maxChunkSize;
  }

  return chunks;
}
