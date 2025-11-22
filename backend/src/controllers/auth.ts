import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePasswords, generateToken } from '../utils/auth';
import { AuthRequest } from '../types';

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // Валидация входных данных
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password are required'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Password must be at least 6 characters long'
      });
      return;
    }

    // Проверка, существует ли уже пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
      return;
    }

    // Хэшируем пароль
    const hashedPassword = await hashPassword(password);

    // Устанавливаем дату окончания пробного периода (15 дней)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 15);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name?.trim() || null,
        currentPlan: 'trial',
        trialEndsAt,
        responsesLimit: 5000,
        responsesUsed: 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Генерируем JWT токен
    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register user'
    });
  }
}

/**
 * POST /api/auth/login
 * Вход в систему
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Валидация входных данных
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Email and password are required'
      });
      return;
    }

    // Находим пользователя по email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
      return;
    }

    // Проверяем пароль
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
      return;
    }

    // Генерируем JWT токен
    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to login'
    });
  }
}

/**
 * GET /api/auth/me
 * Получить информацию о текущем пользователе (требует аутентификации)
 */
export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
}
