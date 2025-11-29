import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { Pool } from 'pg';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { extractContent } from '../services/content-extraction.service';
import { analyzeContentWithAI } from '../services/ai-kb-analyzer.service';
import { buildKnowledgeBase } from '../services/kb-builder.service';

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10, // Maximum 10 files
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv', '.html', '.htm', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

export const uploadMiddleware = upload.array('files', 10);

/**
 * POST /api/kb/import/analyze
 * Upload files and analyze content
 */
export const analyzeFiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { autoCreate = false, language = 'ru', agentId } = req.body;

    // Получаем модель для анализа KB из настроек агента (если указан)
    let kbAnalysisModel = 'anthropic/claude-3.5-sonnet';
    if (agentId) {
      const advancedSettings = await prisma.agentAdvancedSettings.findUnique({
        where: { agentId },
      });
      if (advancedSettings?.kbAnalysisModel) {
        kbAnalysisModel = advancedSettings.kbAnalysisModel;
      }
    }

    // Create import job
    const job = await prisma.kbImportJob.create({
      data: {
        userId,
        status: 'analyzing',
        progress: 0,
        currentStep: 'Extracting text from files',
        filesUploaded: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
      },
    });

    console.log(`Created import job ${job.id} for ${files.length} files`);

    // Extract text from all files
    const extractedTexts: string[] = [];
    const fileRecords: Array<{ fileName: string; fileType: string; size: number; storageKey: string; extractedText: string }> = [];

    for (const file of files) {
      try {
        const extension = path.extname(file.originalname).slice(1).toLowerCase();
        const extracted = await extractContent(file.path, extension);

        extractedTexts.push(extracted.text);
        fileRecords.push({
          fileName: file.originalname,
          fileType: extension,
          size: file.size,
          storageKey: file.filename,
          extractedText: extracted.text,
        });

        console.log(`✅ Extracted text from ${file.originalname} (${extracted.text.length} chars)`);
      } catch (error) {
        console.error(`Failed to extract ${file.originalname}:`, error);
        // Clean up uploaded files on error
        fs.unlinkSync(file.path);
      }
    }

    // Save file records
    for (const record of fileRecords) {
      await prisma.kbUploadedFile.create({
        data: {
          jobId: job.id,
          ...record,
        },
      });
    }

    // Update job progress
    await prisma.kbImportJob.update({
      where: { id: job.id },
      data: {
        progress: 30,
        currentStep: 'Analyzing content with AI',
      },
    });

    // Analyze with AI
    console.log(`Analyzing content with AI (model: ${kbAnalysisModel})...`);
    const analysis = await analyzeContentWithAI(extractedTexts, language as 'ru' | 'en', kbAnalysisModel);

    console.log(
      `AI Analysis complete: ${analysis.suggestedCategories.length} categories, ${analysis.articles.length} articles`
    );

    // Update job with analysis
    await prisma.kbImportJob.update({
      where: { id: job.id },
      data: {
        progress: 60,
        currentStep: autoCreate ? 'Creating Knowledge Base' : 'Analysis complete',
        analysis: JSON.stringify(analysis),
      },
    });

    // If autoCreate is true, build KB immediately
    if (autoCreate) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL?.replace('?pgbouncer=true', ''),
      });

      try {
        const buildResult = await buildKnowledgeBase(userId, analysis, pool);

        await prisma.kbImportJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            progress: 100,
            currentStep: 'Knowledge Base created successfully',
            categoriesCreated: buildResult.categoriesCreated,
            articlesCreated: buildResult.articlesCreated,
            embeddingsGenerated: buildResult.embeddingsGenerated,
            errors: buildResult.errors.length > 0 ? JSON.stringify(buildResult.errors) : null,
            completedAt: new Date(),
          },
        });

        // Clean up uploaded files
        for (const file of files) {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.warn(`Failed to delete ${file.path}:`, err);
          }
        }

        return res.json({
          jobId: job.id,
          analysis,
          result: buildResult,
          preview: {
            categoriesCount: analysis.suggestedCategories.length,
            articlesCount: analysis.articles.length,
            estimatedTokens: analysis.totalTokens,
          },
        });
      } finally {
        await pool.end();
      }
    }

    // Return analysis for review
    return res.json({
      jobId: job.id,
      analysis,
      preview: {
        categoriesCount: analysis.suggestedCategories.length,
        articlesCount: analysis.articles.length,
        estimatedTokens: analysis.totalTokens,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing files:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/kb/import/execute
 * Execute KB creation from previous analysis
 */
export const executeImport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { jobId, modifications } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Get job
    const job = await prisma.kbImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!job.analysis) {
      return res.status(400).json({ message: 'No analysis found for this job' });
    }

    let analysis = JSON.parse(job.analysis);

    // Apply modifications if provided
    if (modifications) {
      if (modifications.categories) {
        analysis.suggestedCategories = modifications.categories;
      }
      if (modifications.articles) {
        analysis.articles = modifications.articles;
      }
    }

    // Update job status
    await prisma.kbImportJob.update({
      where: { id: jobId },
      data: {
        status: 'building',
        progress: 70,
        currentStep: 'Creating Knowledge Base',
      },
    });

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL?.replace('?pgbouncer=true', ''),
    });

    try {
      const buildResult = await buildKnowledgeBase(userId, analysis, pool);

      await prisma.kbImportJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          currentStep: 'Knowledge Base created successfully',
          categoriesCreated: buildResult.categoriesCreated,
          articlesCreated: buildResult.articlesCreated,
          embeddingsGenerated: buildResult.embeddingsGenerated,
          errors: buildResult.errors.length > 0 ? JSON.stringify(buildResult.errors) : null,
          completedAt: new Date(),
        },
      });

      // Clean up uploaded files
      const files = await prisma.kbUploadedFile.findMany({
        where: { jobId },
      });

      for (const file of files) {
        try {
          const filePath = path.join(uploadDir, file.storageKey);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn(`Failed to delete ${file.storageKey}:`, err);
        }
      }

      return res.json({
        result: buildResult,
        categories: await prisma.kbCategory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: buildResult.categoriesCreated,
        }),
        articles: await prisma.kbArticle.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: buildResult.articlesCreated,
        }),
      });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error('Error executing import:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/kb/import/status/:jobId
 * Get import job status
 */
export const getImportStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const job = await prisma.kbImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.json({
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      result: job.status === 'completed'
        ? {
            categoriesCreated: job.categoriesCreated,
            articlesCreated: job.articlesCreated,
            embeddingsGenerated: job.embeddingsGenerated,
            errors: job.errors ? JSON.parse(job.errors) : [],
            duration: job.completedAt
              ? new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()
              : null,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error getting import status:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
