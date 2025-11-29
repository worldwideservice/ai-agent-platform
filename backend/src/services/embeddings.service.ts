import { Pool } from "pg";

/**
 * Embeddings Service
 * Универсальный сервис для работы с различными провайдерами embeddings
 * Поддерживает: Jina AI, Voyage AI, Cohere, OpenAI
 */

export interface Embedding {
  id: string;
  userId: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  sourceType:
    | "kb_article"
    | "contact"
    | "deal"
    | "chat_message"
    | "memory_node"
    | "agent_document"
    | "kb_article_file";
  sourceId: string;
  createdAt: Date;
}

export interface EmbeddingSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  sourceType: string;
  sourceId: string;
}

// Конфигурация провайдеров
interface EmbeddingProvider {
  name: string;
  url: string;
  model: string;
  dimension: number;
  requestBuilder: (
    text: string,
    apiKey: string,
  ) => {
    url: string;
    options: RequestInit;
  };
  responseParser: (data: any) => number[];
}

const PROVIDERS: Record<string, EmbeddingProvider> = {
  jina: {
    name: "Jina AI",
    url: "https://api.jina.ai/v1/embeddings",
    model: "jina-embeddings-v3",
    dimension: 1024,
    requestBuilder: (text: string, apiKey: string) => ({
      url: "https://api.jina.ai/v1/embeddings",
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "jina-embeddings-v3",
          input: [text],
          task: "retrieval.passage",
        }),
      },
    }),
    responseParser: (data: any) => data.data[0].embedding,
  },

  voyage: {
    name: "Voyage AI",
    url: "https://api.voyageai.com/v1/embeddings",
    model: "voyage-3",
    dimension: 1024,
    requestBuilder: (text: string, apiKey: string) => ({
      url: "https://api.voyageai.com/v1/embeddings",
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "voyage-3",
          input: [text],
          input_type: "document",
        }),
      },
    }),
    responseParser: (data: any) => data.data[0].embedding,
  },

  cohere: {
    name: "Cohere",
    url: "https://api.cohere.ai/v1/embed",
    model: "embed-english-v3.0",
    dimension: 1024,
    requestBuilder: (text: string, apiKey: string) => ({
      url: "https://api.cohere.ai/v1/embed",
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "embed-english-v3.0",
          texts: [text],
          input_type: "search_document",
          embedding_types: ["float"],
        }),
      },
    }),
    responseParser: (data: any) => data.embeddings.float[0],
  },

  openai: {
    name: "OpenAI",
    url: "https://api.openai.com/v1/embeddings",
    model: "text-embedding-3-small",
    dimension: 1536,
    requestBuilder: (text: string, apiKey: string) => ({
      url: "https://api.openai.com/v1/embeddings",
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text,
          dimensions: 1536,
        }),
      },
    }),
    responseParser: (data: any) => data.data[0].embedding,
  },
};

/**
 * Генерация embedding через выбранный провайдер
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Определяем провайдера из переменных окружения
  const providerName = (process.env.EMBEDDING_PROVIDER || "jina").toLowerCase();
  const provider = PROVIDERS[providerName];

  if (!provider) {
    console.error(`❌ Unknown embedding provider: ${providerName}`);
    console.warn("⚠️  Using mock embeddings as fallback");
    return generateMockEmbedding(1024);
  }

  // Получаем API ключ
  const apiKey = process.env[`${providerName.toUpperCase()}_API_KEY`];

  if (!apiKey) {
    console.warn(
      `⚠️  ${provider.name} API key not set (${providerName.toUpperCase()}_API_KEY)`,
    );
    console.warn("⚠️  Using mock embeddings as fallback");
    return generateMockEmbedding(provider.dimension);
  }

  try {
    console.log(
      `🔮 Generating embedding using ${provider.name} (${provider.model})`,
    );

    const { url, options } = provider.requestBuilder(text, apiKey);
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${provider.name} API error: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    const embedding = provider.responseParser(data);

    console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
    return embedding;
  } catch (error: any) {
    console.error(
      `❌ Error generating embedding with ${provider.name}:`,
      error.message,
    );
    console.warn("⚠️  Falling back to mock embeddings");
    return generateMockEmbedding(provider.dimension);
  }
}

/**
 * Генерация mock embedding для разработки/тестирования
 */
function generateMockEmbedding(dimension: number): number[] {
  return Array(dimension)
    .fill(0)
    .map(() => Math.random());
}

/**
 * Сохранение embedding в базу данных
 */
export async function saveEmbedding(
  pool: Pool,
  params: {
    userId: string;
    content: string;
    embedding: number[];
    sourceType: Embedding["sourceType"];
    sourceId: string;
    metadata?: Record<string, any>;
  },
): Promise<string> {
  const {
    userId,
    content,
    embedding,
    sourceType,
    sourceId,
    metadata = {},
  } = params;

  // Конвертируем массив в PostgreSQL vector формат
  const vectorString = `[${embedding.join(",")}]`;

  const result = await pool.query(
    `INSERT INTO embeddings (
      id, user_id, content, embedding, metadata,
      source_type, source_id, created_at
    ) VALUES (
      gen_random_uuid()::text, $1, $2, $3::vector, $4,
      $5, $6, NOW()
    ) RETURNING id`,
    [
      userId,
      content,
      vectorString,
      JSON.stringify(metadata),
      sourceType,
      sourceId,
    ],
  );

  return result.rows[0].id;
}

/**
 * Семантический поиск по embeddings с использованием косинусной близости
 */
export async function searchSimilarEmbeddings(
  pool: Pool,
  params: {
    userId: string;
    queryEmbedding: number[];
    limit?: number;
    threshold?: number;
    sourceTypes?: Embedding["sourceType"][];
  },
): Promise<EmbeddingSearchResult[]> {
  const {
    userId,
    queryEmbedding,
    limit = 10,
    threshold = 0.7,
    sourceTypes,
  } = params;

  // Конвертируем query embedding в vector формат
  const vectorString = `[${queryEmbedding.join(",")}]`;

  let query = `
    SELECT
      id,
      content,
      metadata,
      source_type,
      source_id,
      1 - (embedding <=> $1::vector) as similarity
    FROM embeddings
    WHERE user_id = $2
      AND 1 - (embedding <=> $1::vector) > $3
  `;

  const params_array: any[] = [vectorString, userId, threshold];
  let paramIndex = 4;

  if (sourceTypes && sourceTypes.length > 0) {
    query += ` AND source_type = ANY($${paramIndex}::text[])`;
    params_array.push(sourceTypes);
    paramIndex++;
  }

  query += `
    ORDER BY embedding <=> $1::vector
    LIMIT $${paramIndex}
  `;
  params_array.push(limit);

  const result = await pool.query(query, params_array);

  return result.rows.map((row) => ({
    id: row.id,
    content: row.content,
    similarity: parseFloat(row.similarity),
    metadata: row.metadata,
    sourceType: row.source_type,
    sourceId: row.source_id,
  }));
}

/**
 * Создание embedding для текста и сохранение в БД
 */
export async function createAndSaveEmbedding(
  pool: Pool,
  params: {
    userId: string;
    content: string;
    sourceType: Embedding["sourceType"];
    sourceId: string;
    metadata?: Record<string, any>;
  },
): Promise<string> {
  const { content } = params;

  // Генерируем embedding
  const embedding = await generateEmbedding(content);

  // Сохраняем в базу
  const embeddingId = await saveEmbedding(pool, {
    ...params,
    embedding,
  });

  return embeddingId;
}

/**
 * Обновление embedding (пересоздание)
 */
export async function updateEmbedding(
  pool: Pool,
  params: {
    embeddingId: string;
    content: string;
  },
): Promise<void> {
  const { embeddingId, content } = params;

  // Генерируем новый embedding
  const embedding = await generateEmbedding(content);
  const vectorString = `[${embedding.join(",")}]`;

  await pool.query(
    `UPDATE embeddings
     SET content = $1, embedding = $2::vector, created_at = NOW()
     WHERE id = $3`,
    [content, vectorString, embeddingId],
  );
}

/**
 * Удаление embedding
 */
export async function deleteEmbedding(
  pool: Pool,
  embeddingId: string,
): Promise<void> {
  await pool.query("DELETE FROM embeddings WHERE id = $1", [embeddingId]);
}

/**
 * Удаление всех embeddings для источника
 */
export async function deleteEmbeddingsBySource(
  pool: Pool,
  params: {
    sourceType: Embedding["sourceType"];
    sourceId: string;
  },
): Promise<void> {
  const { sourceType, sourceId } = params;

  await pool.query(
    "DELETE FROM embeddings WHERE source_type = $1 AND source_id = $2",
    [sourceType, sourceId],
  );
}

/**
 * Семантический поиск по тексту (генерирует embedding и ищет похожие)
 */
export async function semanticSearch(
  pool: Pool,
  params: {
    userId: string;
    query: string;
    limit?: number;
    threshold?: number;
    sourceTypes?: Embedding["sourceType"][];
  },
): Promise<EmbeddingSearchResult[]> {
  const { query, ...searchParams } = params;

  // Генерируем embedding для запроса
  const queryEmbedding = await generateEmbedding(query);

  // Ищем похожие embeddings
  return searchSimilarEmbeddings(pool, {
    ...searchParams,
    queryEmbedding,
  });
}

/**
 * Получить информацию о текущем провайдере
 */
export function getEmbeddingProviderInfo(): {
  provider: string;
  model: string;
  dimension: number;
  configured: boolean;
} {
  const providerName = (process.env.EMBEDDING_PROVIDER || "jina").toLowerCase();
  const provider = PROVIDERS[providerName];

  if (!provider) {
    return {
      provider: "unknown",
      model: "none",
      dimension: 0,
      configured: false,
    };
  }

  const apiKey = process.env[`${providerName.toUpperCase()}_API_KEY`];

  return {
    provider: provider.name,
    model: provider.model,
    dimension: provider.dimension,
    configured: !!apiKey,
  };
}
