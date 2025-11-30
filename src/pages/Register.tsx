import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shader, ChromaFlow, Swirl } from 'shaders/react';
import { useAuth } from '../contexts/AuthContext';
import { CustomCursor } from '../../components/landing/CustomCursor';
import { GrainOverlay } from '../../components/landing/GrainOverlay';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaderLoaded, setIsShaderLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsShaderLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
        navigate('/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Register form submitted');
    setError('');
    setSuccess('');

    if (!organizationName.trim()) {
      setError(t('auth.errorOrgRequired'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.errorPasswordMin'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.errorPasswordMismatch'));
      return;
    }

    setIsLoading(true);

    try {
      await register({ email, password, name: organizationName.trim() });
      setSuccess(t('auth.registerSuccess'));
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setOrganizationName('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      if (errorMessage?.includes('already exists')) {
        setError(t('auth.errorUserExists'));
      } else {
        setError(errorMessage || t('auth.errorGeneric'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gray-900">
      <CustomCursor />
      <GrainOverlay />

      {/* Shader Background */}
      <div
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${isShaderLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ contain: 'strict' }}
      >
        <Shader className="h-full w-full">
          <Swirl
            colorA="#1275d8"
            colorB="#e19136"
            speed={0.6}
            detail={0.8}
            blend={50}
            coarseX={40}
            coarseY={40}
            mediumX={40}
            mediumY={40}
            fineX={40}
            fineY={40}
          />
          <ChromaFlow
            baseColor="#0066ff"
            upColor="#0066ff"
            downColor="#d1d1d1"
            leftColor="#e19136"
            rightColor="#e19136"
            intensity={0.9}
            radius={1.8}
            momentum={25}
            maskType="alpha"
            opacity={0.97}
          />
        </Shader>
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Logo */}
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/25">
            <span className="font-sans text-xl font-bold text-white">A</span>
          </div>
          <span className="font-sans text-xl font-semibold tracking-tight text-white">AI Agent</span>
        </Link>
      </nav>

      {/* Register Form */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20">
        <div
          className={`w-full max-w-md transition-all duration-700 ${
            isShaderLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl md:p-10">
            <div className="mb-8 text-center">
              <h1 className="mb-2 font-sans text-3xl font-light tracking-tight text-white md:text-4xl">
                {t('auth.registerTitle')}
              </h1>
              <p className="font-mono text-sm text-white/60">AI Agent Platform</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block font-mono text-xs text-white/60">{t('auth.organizationName')} *</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={t('auth.organizationPlaceholder')}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-xs text-white/60">{t('auth.email')} *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-xs text-white/60">{t('auth.password')} *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-xs text-white/60">{t('auth.confirmPassword')} *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/20 px-4 py-3 text-center text-sm text-green-200">
                  {success}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-center text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-white px-6 py-3 font-sans text-base font-medium text-gray-900 transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? t('auth.loading') : t('auth.registerButton')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="font-mono text-sm text-white/60">
                {t('auth.hasAccount')}{' '}
                <Link to="/login" className="text-white underline transition-colors hover:text-white/80">
                  {t('auth.loginLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Register;
