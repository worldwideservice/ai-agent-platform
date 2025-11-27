import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Секрет для подписи публичных URL (используем JWT_SECRET или отдельный)
const FILE_URL_SECRET = process.env.FILE_URL_SECRET || process.env.JWT_SECRET || 'default-file-secret';

/**
 * Генерация подписи для публичного URL
 * @param documentId ID документа
 * @param expires Время истечения (unix timestamp)
 */
export function generateFileSignature(documentId: string, expires: number): string {
  const data = `${documentId}:${expires}:${FILE_URL_SECRET}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Проверка подписи публичного URL
 */
export function verifyFileSignature(documentId: string, expires: number, signature: string): boolean {
  // Проверяем срок действия
  if (Date.now() > expires) {
    return false;
  }
  const expectedSignature = generateFileSignature(documentId, expires);
  return signature === expectedSignature;
}

/**
 * Генерация публичного URL для документа (с подписью)
 * URL действителен 24 часа
 */
export function generatePublicDocumentUrl(documentId: string, baseUrl: string): string {
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 часа
  const signature = generateFileSignature(documentId, expires);
  return `${baseUrl}/api/public/documents/${documentId}?expires=${expires}&sig=${signature}`;
}

// Директория для хранения документов агента
const uploadDir = path.join(__dirname, '../../uploads/agent-documents');
const thumbnailDir = path.join(__dirname, '../../uploads/agent-documents/thumbnails');

// Создаем директории если не существуют
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Разрешенные типы файлов
const allowedMimeTypes = [
  // Документы
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  // Изображения
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`));
    }
  },
});

export const uploadMiddleware = upload.single('file');

/**
 * Генерация миниатюры для файла
 */
async function generateThumbnail(filePath: string, fileType: string, storageKey: string): Promise<string | null> {
  const thumbnailName = `thumb_${storageKey}.png`;
  const thumbnailPath = path.join(thumbnailDir, thumbnailName);

  try {
    // Для изображений - создаем миниатюру через sharp
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType.toLowerCase())) {
      await sharp(filePath)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .png()
        .toFile(thumbnailPath);
      return thumbnailName;
    }

    // Для PDF - используем первую страницу (требует pdf-poppler или подобное)
    // Пока возвращаем null - будем показывать иконку типа файла
    if (fileType.toLowerCase() === 'pdf') {
      // TODO: Добавить генерацию превью для PDF через pdf-poppler
      return null;
    }

    // Для остальных типов - возвращаем null (будет показана иконка)
    return null;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Получить расширение файла из MIME типа
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
    'text/plain': 'txt',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return mimeToExt[mimeType] || 'unknown';
}

/**
 * POST /api/agents/:agentId/documents
 * Загрузить документ для агента
 */
export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileType = getExtensionFromMimeType(file.mimetype);

    // Генерируем миниатюру
    const thumbnailKey = await generateThumbnail(file.path, fileType, file.filename);

    // Сохраняем в базу
    const document = await prisma.agentDocument.create({
      data: {
        agentId,
        fileName: file.originalname,
        fileType,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey: file.filename,
        thumbnailKey,
        isEnabled: true,
      },
    });

    console.log(`📄 Document uploaded: ${file.originalname} for agent ${agentId}`);

    return res.status(201).json({
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      thumbnailUrl: thumbnailKey ? `/api/agents/${agentId}/documents/thumbnail/${thumbnailKey}` : null,
      isEnabled: document.isEnabled,
      createdAt: document.createdAt,
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/documents
 * Получить все документы агента
 */
export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const documents = await prisma.agentDocument.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(
      documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        thumbnailUrl: doc.thumbnailKey ? `/api/agents/${agentId}/documents/thumbnail/${doc.thumbnailKey}` : null,
        description: doc.description,
        isEnabled: doc.isEnabled,
        createdAt: doc.createdAt,
      }))
    );
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/documents/thumbnail/:thumbnailKey
 * Получить миниатюру документа
 */
export const getThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const { thumbnailKey } = req.params;
    const thumbnailPath = path.join(thumbnailDir, thumbnailKey);

    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ message: 'Thumbnail not found' });
    }

    return res.sendFile(thumbnailPath);
  } catch (error: any) {
    console.error('Error fetching thumbnail:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/documents/file/:documentId
 * Получить сам файл документа
 */
export const getDocumentFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, documentId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const document = await prisma.agentDocument.findFirst({
      where: { id: documentId, agentId },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = path.join(uploadDir, document.storageKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    return res.sendFile(filePath);
  } catch (error: any) {
    console.error('Error fetching document file:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PATCH /api/agents/:agentId/documents/:documentId
 * Обновить документ (включить/выключить, изменить описание)
 */
export const updateDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, documentId } = req.params;
    const { isEnabled, description } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const document = await prisma.agentDocument.findFirst({
      where: { id: documentId, agentId },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const updateData: any = {};
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (description !== undefined) updateData.description = description;

    const updatedDocument = await prisma.agentDocument.update({
      where: { id: documentId },
      data: updateData,
    });

    return res.json({
      id: updatedDocument.id,
      fileName: updatedDocument.fileName,
      fileType: updatedDocument.fileType,
      mimeType: updatedDocument.mimeType,
      fileSize: updatedDocument.fileSize,
      thumbnailUrl: updatedDocument.thumbnailKey
        ? `/api/agents/${agentId}/documents/thumbnail/${updatedDocument.thumbnailKey}`
        : null,
      description: updatedDocument.description,
      isEnabled: updatedDocument.isEnabled,
      createdAt: updatedDocument.createdAt,
    });
  } catch (error: any) {
    console.error('Error updating document:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /api/agents/:agentId/documents/:documentId
 * Удалить документ
 */
export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, documentId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const document = await prisma.agentDocument.findFirst({
      where: { id: documentId, agentId },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Удаляем файл с диска
    const filePath = path.join(uploadDir, document.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Удаляем миниатюру
    if (document.thumbnailKey) {
      const thumbnailPath = path.join(thumbnailDir, document.thumbnailKey);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Удаляем из базы
    await prisma.agentDocument.delete({
      where: { id: documentId },
    });

    console.log(`🗑️ Document deleted: ${document.fileName} from agent ${agentId}`);

    return res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PATCH /api/agents/:agentId/documents/toggle-all
 * Включить/выключить все документы
 */
export const toggleAllDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { isEnabled } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await prisma.agentDocument.updateMany({
      where: { agentId },
      data: { isEnabled },
    });

    return res.json({ message: `All documents ${isEnabled ? 'enabled' : 'disabled'}` });
  } catch (error: any) {
    console.error('Error toggling documents:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/public/documents/:documentId
 * Публичный доступ к файлу документа (с подписью)
 * Используется для отправки файлов в Kommo
 */
export const getPublicDocumentFile = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { expires, sig } = req.query;

    // Проверяем наличие параметров подписи
    if (!expires || !sig) {
      return res.status(400).json({ message: 'Missing signature parameters' });
    }

    const expiresNum = parseInt(expires as string, 10);
    const signature = sig as string;

    // Проверяем подпись
    if (!verifyFileSignature(documentId, expiresNum, signature)) {
      return res.status(403).json({ message: 'Invalid or expired signature' });
    }

    // Получаем документ
    const document = await prisma.agentDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = path.join(uploadDir, document.storageKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    // Устанавливаем заголовки для корректной загрузки
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.fileName)}"`);

    // Разрешаем кросс-доменные запросы для Kommo
    res.setHeader('Access-Control-Allow-Origin', '*');

    console.log(`📤 Public document access: ${document.fileName} (ID: ${documentId})`);

    return res.sendFile(filePath);
  } catch (error: any) {
    console.error('Error serving public document:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
