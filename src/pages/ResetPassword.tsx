import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { GrainOverlay } from '../../components/ui/GrainOverlay';
import { CustomCursor } from '../../components/ui/CustomCursor';
import { MagneticButton } from '../../components/ui/MagneticButton';
import { authService } from '../services/api';

export const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (!token) {
      setError('Недействительная ссылка для сброса пароля');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess('Пароль успешно изменён! Перенаправляем на страницу входа...');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      if (errorMessage?.includes('expired')) {
        setError('Срок действия ссылки истёк. Запросите новую');
      } else if (errorMessage?.includes('invalid')) {
        setError('Недействительная ссылка для сброса пароля');
      } else {
        setError(errorMessage || 'Произошла ошибка');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <CustomCursor />
      <GrainOverlay opacity={0.05} />

      {/* Header */}
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md">
            <span className="font-sans text-xl font-bold text-white">G</span>
          </div>
          <span className="font-sans text-xl font-semibold tracking-tight text-white">
            GPT Агент
          </span>
        </Link>
      </nav>

      {/* Form */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl md:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                <span className="text-3xl">🔑</span>
              </div>
              <h1 className="mb-2 font-sans text-3xl font-bold text-white">
                Новый пароль
              </h1>
              <p className="font-sans text-white/60">
                Введите новый пароль для вашего аккаунта
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block font-sans text-sm font-medium text-white/80">
                  Новый пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 font-sans text-white placeholder-white/40 backdrop-blur-sm transition-all focus:border-white/30 focus:bg-white/10 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block font-sans text-sm font-medium text-white/80">
                  Подтвердите пароль
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 font-sans text-white placeholder-white/40 backdrop-blur-sm transition-all focus:border-white/30 focus:bg-white/10 focus:outline-none"
                />
              </div>

              {success && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center font-sans text-sm text-green-400">
                  {success}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center font-sans text-sm text-red-400">
                  {error}
                </div>
              )}

              <MagneticButton
                variant="primary"
                size="lg"
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
              </MagneticButton>
            </form>

            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="font-sans text-sm text-white/60 transition-colors hover:text-white"
              >
                ← Вернуться к входу
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
