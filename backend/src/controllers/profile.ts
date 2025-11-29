/**
 * Profile Controller
 * Управление профилем пользователя: аватар, настройки, удаление аккаунта
 */

import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { comparePasswords } from '../utils/auth';
import path from 'path';
import fs from 'fs';

// Папка для хранения аватаров
const AVATARS_DIR = path.join(__dirname, '../../uploads/avatars');

// Создаём папку если не существует
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

/**
 * GET /api/profile
 * Получить профиль текущего пользователя
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        avatarUrl: true,
        timezone: true,
        language: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('📷 Get profile - avatarUrl:', user.avatarUrl);

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

/**
 * PUT /api/profile
 * Обновить профиль пользователя (имя, компания, timezone, language)
 */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, company, timezone, language } = req.body;

    // Валидация языка
    const validLanguages = ['ru', 'en', 'ua'];
    if (language && !validLanguages.includes(language)) {
      res.status(400).json({ error: 'Неверный язык. Доступные: ru, en, ua' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        company: company !== undefined ? company : undefined,
        timezone: timezone !== undefined ? timezone : undefined,
        language: language !== undefined ? language : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        avatarUrl: true,
        timezone: true,
        language: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'Профиль обновлён',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Не удалось обновить профиль' });
  }
}

/**
 * PUT /api/profile/email
 * Сменить email (требует пароль для подтверждения)
 */
export async function updateEmail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      res.status(400).json({ error: 'Email и пароль обязательны' });
      return;
    }

    // Проверяем пароль
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Неверный пароль' });
      return;
    }

    // Проверяем, не занят ли email
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase().trim() },
    });

    if (existingUser && existingUser.id !== userId) {
      res.status(409).json({ error: 'Этот email уже используется' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail.toLowerCase().trim() },
    });

    res.json({ success: true, message: 'Email успешно изменён' });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Не удалось изменить email' });
  }
}

/**
 * POST /api/profile/avatar
 * Загрузить аватар
 */
export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }

    // Удаляем старый аватар если есть
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl) {
      const oldAvatarPath = path.join(AVATARS_DIR, path.basename(user.avatarUrl));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Сохраняем URL аватара в базу
    const avatarUrl = `/api/profile/avatar/${req.file.filename}`;

    console.log('📷 Avatar upload - userId:', userId);
    console.log('📷 Avatar upload - filename:', req.file.filename);
    console.log('📷 Avatar upload - avatarUrl:', avatarUrl);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });

    console.log('📷 Avatar upload - updated user:', updatedUser);

    res.json({
      success: true,
      message: 'Аватар загружен',
      avatarUrl
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Не удалось загрузить аватар' });
  }
}

/**
 * DELETE /api/profile/avatar
 * Удалить аватар
 */
export async function deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl) {
      const avatarPath = path.join(AVATARS_DIR, path.basename(user.avatarUrl));
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    res.json({ success: true, message: 'Аватар удалён' });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ error: 'Не удалось удалить аватар' });
  }
}

/**
 * GET /api/profile/avatar/:filename
 * Получить файл аватара
 */
export async function getAvatarFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { filename } = req.params;
    const filePath = path.join(AVATARS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Аватар не найден' });
      return;
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Get avatar file error:', error);
    res.status(500).json({ error: 'Не удалось получить аватар' });
  }
}

/**
 * DELETE /api/profile/account
 * Удалить аккаунт (требует пароль для подтверждения)
 */
export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { password, confirmation } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Пароль обязателен для удаления аккаунта' });
      return;
    }

    if (confirmation !== 'DELETE') {
      res.status(400).json({ error: 'Для подтверждения введите "DELETE"' });
      return;
    }

    // Проверяем пароль
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Неверный пароль' });
      return;
    }

    // Удаляем аватар если есть
    if (user.avatarUrl) {
      const avatarPath = path.join(AVATARS_DIR, path.basename(user.avatarUrl));
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Удаляем все связанные данные пользователя
    // Агенты
    await prisma.agent.deleteMany({ where: { userId } });

    // Статьи базы знаний
    await prisma.kbArticle.deleteMany({ where: { userId } });

    // Категории базы знаний
    await prisma.kbCategory.deleteMany({ where: { userId } });

    // Настройки пользователя
    await prisma.userSettings.deleteMany({ where: { userId } });

    // Роли обучения
    await prisma.trainingRole.deleteMany({ where: { userId } });

    // Источники обучения
    await prisma.trainingSource.deleteMany({ where: { userId } });

    // Удаляем самого пользователя
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true, message: 'Аккаунт успешно удалён' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Не удалось удалить аккаунт' });
  }
}

/**
 * Список доступных часовых поясов
 */
export const TIMEZONES = [
  { value: 'Europe/Kiev', label: 'Киев (UTC+2/+3)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Париж (UTC+1/+2)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1/+2)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8/-7)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Asia/Singapore', label: 'Сингапур (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+10/+11)' },
];

/**
 * GET /api/profile/timezones
 * Получить список доступных часовых поясов
 */
export async function getTimezones(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ timezones: TIMEZONES });
}
