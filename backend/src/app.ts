import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";

// Utilities
import logger, { httpLoggerStream, logRequest } from "./utils/logger";

// Middleware
import { globalLimiter, authLimiter, apiLimiter, chatLimiter, webhookLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import agentRoutes from "./routes/agents";
import kbCategoryRoutes from "./routes/kb-categories";
import kbArticleRoutes from "./routes/kb-articles";
import contactRoutes from "./routes/contacts";
import dealRoutes from "./routes/deals";
import crmRoutes from "./routes/crm";
import settingsRoutes from "./routes/settings";
import analyticsRoutes from "./routes/analytics";
import billingRoutes from "./routes/billing";
import chatRoutes from "./routes/chat";
import triggersRoutes from "./routes/triggers";
import chainsRoutes from "./routes/chains";
import integrationsRoutes from "./routes/integrations";
import agentSettingsRoutes from "./routes/agent-settings";
import modelsRoutes from "./routes/models";
import kommoRoutes from "./routes/kommo";
import googleRoutes from "./routes/google";
import googleCalendarRoutes from "./routes/google-calendar";
import memoryRoutes from "./routes/memory";
import kbImportRoutes from "./routes/kb-import";
import trainingRoutes from "./routes/training";
import agentDocumentsRoutes from "./routes/agent-documents";
import profileRoutes from "./routes/profile";
import notificationsRoutes from "./routes/notifications";
import testRoutes from "./routes/test";
import conversationsRoutes from "./routes/conversations";
import adminRoutes from "./routes/admin";
import testChatRoutes from "./routes/test-chat";

// Public routes (без авторизации)
import { getPublicDocumentFile } from "./controllers/agent-documents";

// Stats imports for monitoring
import { getQueueStats } from "./services/webhook-queue.service";
import { getOpenRouterStats } from "./services/openrouter.service";

// Chain executor for scheduled steps
import { processScheduledChainSteps } from "./services/chain-executor.service";

const app: Express = express();

// Trust proxy for correct IP detection behind reverse proxy
app.set("trust proxy", 1);

// Периодическая проверка отложенных шагов цепочек (каждую минуту)
const CHAIN_SCHEDULER_INTERVAL = 60 * 1000; // 1 минута
setInterval(() => {
  processScheduledChainSteps().catch((err) =>
    logger.error("Chain scheduler error", { error: err.message }),
  );
}, CHAIN_SCHEDULER_INTERVAL);
logger.info("Chain scheduler started", { interval: "1 minute" });

// ============================================================================
// Security Middleware
// ============================================================================

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3002",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
});

// Global rate limiter
app.use(globalLimiter);

// ============================================================================
// Request Parsing & Logging
// ============================================================================

// HTTP request logging
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined", { stream: httpLoggerStream }));
} else {
  app.use(morgan("dev"));
}

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request timing for logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    // Only log API requests, skip health checks
    if (!req.path.startsWith("/health")) {
      logRequest(req, res, duration);
    }
  });

  next();
});

// ============================================================================
// Health Check Endpoints
// ============================================================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

app.get("/health/stats", async (_req: Request, res: Response) => {
  try {
    const queueStats = await getQueueStats();
    const openRouterStats = getOpenRouterStats();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      queue: queueStats,
      openRouter: openRouterStats,
    });
  } catch (error: any) {
    logger.error("Health stats error", { error: error.message });
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ============================================================================
// API Routes with Rate Limiting
// ============================================================================

// Auth routes (stricter rate limiting)
app.use("/api/auth", authLimiter, authRoutes);

// Profile routes
app.use("/api/profile", apiLimiter, profileRoutes);

// Models routes
app.use("/api/models", apiLimiter, modelsRoutes);

// Kommo routes (webhook has its own limiter)
app.use("/api/kommo", kommoRoutes);

// Google routes
app.use("/api/google", apiLimiter, googleRoutes);
app.use("/api/google-calendar", apiLimiter, googleCalendarRoutes);

// Agent routes
app.use("/api/agents", apiLimiter, agentRoutes);
app.use("/api/agents", apiLimiter, triggersRoutes);
app.use("/api/agents", apiLimiter, chainsRoutes);
app.use("/api/agents", apiLimiter, integrationsRoutes);
app.use("/api/agents", apiLimiter, agentSettingsRoutes);
app.use("/api/agents", apiLimiter, memoryRoutes);
app.use("/api/agents", apiLimiter, agentDocumentsRoutes);

// Knowledge Base routes
app.use("/api/kb/categories", apiLimiter, kbCategoryRoutes);
app.use("/api/kb/articles", apiLimiter, kbArticleRoutes);
app.use("/api/kb/import", apiLimiter, kbImportRoutes);

// CRM routes
app.use("/api/contacts", apiLimiter, contactRoutes);
app.use("/api/deals", apiLimiter, dealRoutes);
app.use("/api/crm", apiLimiter, crmRoutes);

// Other routes
app.use("/api/settings", apiLimiter, settingsRoutes);
app.use("/api/analytics", apiLimiter, analyticsRoutes);
app.use("/api/billing", apiLimiter, billingRoutes);
app.use("/api/training", apiLimiter, trainingRoutes);
app.use("/api/notifications", apiLimiter, notificationsRoutes);
app.use("/api/conversations", apiLimiter, conversationsRoutes);

// Chat routes (chat-specific rate limiting)
app.use("/api/chat", chatLimiter, chatRoutes);
app.use("/api/test-chat", chatLimiter, testChatRoutes);

// Test routes (only in development)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test", testRoutes);
}

// Admin routes
app.use("/api/admin", apiLimiter, adminRoutes);

// ============================================================================
// Public Routes (без авторизации)
// ============================================================================

// Public document access (for Kommo file delivery)
app.get("/api/public/documents/:documentId", getPublicDocumentFile);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
