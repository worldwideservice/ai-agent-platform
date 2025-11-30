import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { GrainOverlay } from '../../components/ui/GrainOverlay';
import { CustomCursor } from '../../components/ui/CustomCursor';
import { MagneticButton } from '../../components/ui/MagneticButton';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/app');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      if (errorMessage?.includes('Invalid email or password')) {
        setError(t('auth.errorInvalidCredentials'));
      } else {
        setError(errorMessage || t('auth.errorGeneric'));
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
            <h1 className="mb-2 text-center font-sans text-3xl font-bold text-white">
              Вход в аккаунт
            </h1>
            <p className="mb-8 text-center font-sans text-white/60">
              Добро пожаловать обратно
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block font-sans text-sm font-medium text-white/80">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 font-sans text-white placeholder-white/40 backdrop-blur-sm transition-all focus:border-white/30 focus:bg-white/10 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block font-sans text-sm font-medium text-white/80">
                  Пароль
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

              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="font-sans text-sm text-white/60 transition-colors hover:text-white"
                >
                  Забыли пароль?
                </Link>
              </div>

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
                {isLoading ? 'Вход...' : 'Войти'}
              </MagneticButton>
            </form>

            <div className="mt-8 text-center">
              <span className="font-sans text-sm text-white/60">
                Нет аккаунта?{' '}
              </span>
              <Link
                to="/register"
                className="font-sans text-sm font-medium text-white transition-colors hover:text-white/80"
              >
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
