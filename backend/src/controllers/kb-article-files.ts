import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../lib/prisma";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { pool } from "../config/database";
import {
  analyzeKbArticleFile,
  deleteKbArticleFileEmbeddings,
} from "../services/document-analysis.service";

// Директория для хранения файлов статей
const uploadDir = path.join(__dirname, "../../uploads/kb-article-files");
const thumbnailDir = path.join(
  __dirname,
  "../../uploads/kb-article-files/thumbnails",
);

// Создаем директории если не существуют
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Разрешенные типы файлов
const allowedMimeTypes = [
  // Документы
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  // Изображения
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Аудио
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  // Видео
  "video/mp4",
  "video/webm",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`));
    }
  },
});

export const uploadMiddleware = upload.single("file");
export const uploadMultipleMiddleware = upload.array("files", 10); // До 10 файлов за раз

/**
 * Генерация миниатюры для файла
 */
async function generateThumbnail(
  filePath: string,
  fileType: string,
  storageKey: string,
): Promise<string | null> {
  const thumbnailName = `thumb_${storageKey}.png`;
  const thumbnailPath = path.join(thumbnailDir, thumbnailName);

  try {
    // Для изображений - создаем миниатюру через sharp
    if (
      ["jpg", "jpeg", "png", "gif", "webp"].includes(fileType.toLowerCase())
    ) {
      await sharp(filePath)
        .resize(200, 200, { fit: "cover", position: "center" })
        .png()
        .toFile(thumbnailPath);
      return thumbnailName;
    }

    return null;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

/**
 * Получить расширение файла из MIME типа
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
    "text/plain": "txt",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return mimeToExt[mimeType] || "unknown";
}

/**
 * POST /api/kb/articles/:articleId/files
 * Загрузить файл для статьи
 */
export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { articleId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Проверяем что статья принадлежит пользователю
    const article = await prisma.kbArticle.findFirst({
      where: { id: parseInt(articleId), userId },
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileType = getExtensionFromMimeType(file.mimetype);

    // Генерируем миниатюру
    const thumbnailKey = await generateThumbnail(
      file.path,
      fileType,
      file.filename,
    );

    // Сохраняем в базу
    const kbFile = await prisma.kbArticleFile.create({
      data: {
        articleId: parseInt(articleId),
        fileName: file.originalname,
        fileType,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey: file.filename,
        thumbnailKey,
      },
    });

    console.log(
      `📄 KB Article file uploaded: ${file.originalname} for article ${articleId}`,
    );

    // Автоматический анализ файла (асинхронно, не блокируем ответ)
    analyzeKbArticleFile(pool, {
      fileId: kbFile.id,
      articleId: parseInt(articleId),
      userId,
      fileName: file.originalname,
      fileType,
      storageKey: file.filename,
      articleTitle: article.title,
    })
      .then((result) => {
        if (result.success && result.textLength) {
          console.log(
            `🧠 KB file analyzed: ${file.originalname} (${result.textLength} chars)`,
          );
        }
      })
      .catch((err) => {
        console.error(
          `❌ KB file analysis failed: ${file.originalname}`,
          err.message,
        );
      });

    return res.status(201).json({
      id: kbFile.id,
      fileName: kbFile.fileName,
      fileType: kbFile.fileType,
      mimeType: kbFile.mimeType,
      fileSize: kbFile.fileSize,
      thumbnailUrl: thumbnailKey
        ? `/api/kb/articles/${articleId}/files/thumbnail/${thumbnailKey}`
        : null,
      createdAt: kbFile.createdAt,
    });
  } catch (error: any) {
    console.error("Error uploading KB article file:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

/**
 * POST /api/kb/articles/:articleId/files/multiple
 * Загрузить несколько файлов для статьи
 */
export const uploadMultipleFiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { articleId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Проверяем что статья принадлежит пользователю
    const article = await prisma.kbArticle.findFirst({
      where: { id: parseInt(articleId), userId },
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileType = getExtensionFromMimeType(file.mimetype);
      const thumbnailKey = await generateThumbnail(
        file.path,
        fileType,
        file.filename,
      );

      const kbFile = await prisma.kbArticleFile.create({
        data: {
          articleId: parseInt(articleId),
          fileName: file.originalname,
          fileType,
          mimeType: file.mimetype,
          fileSize: file.size,
          storageKey: file.filename,
          thumbnailKey,
        },
      });

      // Автоматический анализ файла (асинхронно)
      analyzeKbArticleFile(pool, {
        fileId: kbFile.id,
        articleId: parseInt(articleId),
        userId,
        fileName: file.originalname,
        fileType,
        storageKey: file.filename,
        articleTitle: article.title,
      })
        .then((result) => {
          if (result.success && result.textLength) {
            console.log(
              `🧠 KB file analyzed: ${file.originalname} (${result.textLength} chars)`,
            );
          }
        })
        .catch((err) => {
          console.error(
            `❌ KB file analysis failed: ${file.originalname}`,
            err.message,
          );
        });

      uploadedFiles.push({
        id: kbFile.id,
        fileName: kbFile.fileName,
        fileType: kbFile.fileType,
        mimeType: kbFile.mimeType,
        fileSize: kbFile.fileSize,
        thumbnailUrl: thumbnailKey
          ? `/api/kb/articles/${articleId}/files/thumbnail/${thumbnailKey}`
          : null,
        createdAt: kbFile.createdAt,
      });
    }

    console.log(
      `📄 ${files.length} KB Article files uploaded for article ${articleId}`,
    );

    return res.status(201).json(uploadedFiles);
  } catch (error: any) {
    console.error("Error uploading KB article files:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

/**
 * GET /api/kb/articles/:articleId/files
 * Получить все файлы статьи
 */
export const getFiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { articleId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Проверяем что статья принадлежит пользователю
    const article = await prisma.kbArticle.findFirst({
      where: { id: parseInt(articleId), userId },
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const files = await prisma.kbArticleFile.findMany({
      where: { articleId: parseInt(articleId) },
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        thumbnailUrl: file.thumbnailKey
          ? `/api/kb/articles/${articleId}/files/thumbnail/${file.thumbnailKey}`
          : null,
        createdAt: file.createdAt,
      })),
    );
  } catch (error: any) {
    console.error("Error fetching KB article files:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

/**
 * GET /api/kb/articles/:articleId/files/thumbnail/:thumbnailKey
 * Получить миниатюру файла
 */
export const getThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const { thumbnailKey } = req.params;
    const thumbnailPath = path.join(thumbnailDir, thumbnailKey);

    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ message: "Thumbnail not found" });
    }

    return res.sendFile(thumbnailPath);
  } catch (error: any) {
    console.error("Error fetching thumbnail:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

/**
 * GET /api/kb/articles/:articleId/files/:fileId/download
 * Скачать файл
 */
export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { articleId, fileId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Проверяем что статья принадлежит пользователю
    const article = await prisma.kbArticle.findFirst({
      where: { id: parseInt(articleId), userId },
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const file = await prisma.kbArticleFile.findFirst({
      where: { id: fileId, articleId: parseInt(articleId) },
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.join(uploadDir, file.storageKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );
    return res.sendFile(filePath);
  } catch (error: any) {
    console.error("Error downloading KB article file:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

/**
 * DELETE /api/kb/articles/:articleId/files/:fileId
 * Удалить файл
 */
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { articleId, fileId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Проверяем что статья принадлежит пользователю
    const article = await prisma.kbArticle.findFirst({
      where: { id: parseInt(articleId), userId },
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const file = await prisma.kbArticleFile.findFirst({
      where: { id: fileId, articleId: parseInt(articleId) },
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Удаляем файл с диска
    const filePath = path.join(uploadDir, file.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Удаляем миниатюру
    if (file.thumbnailKey) {
      const thumbnailPath = path.join(thumbnailDir, file.thumbnailKey);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Удаляем embeddings файла
    await deleteKbArticleFileEmbeddings(pool, fileId);

    // Удаляем из базы
    await prisma.kbArticleFile.delete({
      where: { id: fileId },
    });

    console.log(
      `🗑️ KB Article file deleted: ${file.fileName} from article ${articleId}`,
    );

    return res.json({ message: "File deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting KB article file:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};
