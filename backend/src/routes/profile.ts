import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as profileController from '../controllers/profile';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Настройка multer для загрузки аватаров
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// GET /api/profile - Получить профиль
router.get('/', authMiddleware, profileController.getProfile);

// PUT /api/profile - Обновить профиль
router.put('/', authMiddleware, profileController.updateProfile);

// PUT /api/profile/email - Сменить email
router.put('/email', authMiddleware, profileController.updateEmail);

// POST /api/profile/avatar - Загрузить аватар
router.post('/avatar', authMiddleware, upload.single('avatar'), profileController.uploadAvatar);

// DELETE /api/profile/avatar - Удалить аватар
router.delete('/avatar', authMiddleware, profileController.deleteAvatar);

// GET /api/profile/avatar/:filename - Получить файл аватара (публичный)
router.get('/avatar/:filename', profileController.getAvatarFile);

// GET /api/profile/timezones - Список часовых поясов
router.get('/timezones', profileController.getTimezones);

// DELETE /api/profile/account - Удалить аккаунт
router.delete('/account', authMiddleware, profileController.deleteAccount);

export default router;
