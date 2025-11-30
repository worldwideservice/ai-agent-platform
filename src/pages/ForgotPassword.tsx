import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shader, ChromaFlow, Swirl } from 'shaders/react';
import { CustomCursor } from '../../components/landing/CustomCursor';
import { GrainOverlay } from '../../components/landing/GrainOverlay';
import { authService } from '../services/api';

export const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaderLoaded, setIsShaderLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsShaderLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(t('auth.forgotPasswordSuccess'));
      setEmail('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      if (errorMessage?.includes('not found')) {
        setError(t('auth.errorUserNotFound'));
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

      {/* Forgot Password Form */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20">
        <div
          className={`w-full max-w-md transition-all duration-700 ${
            isShaderLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl md:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="mb-2 font-sans text-3xl font-light tracking-tight text-white md:text-4xl">
                {t('auth.forgotPasswordTitle')}
              </h1>
              <p className="font-mono text-sm text-white/60">{t('auth.forgotPasswordSubtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block font-mono text-xs text-white/60">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
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
                {isLoading ? t('auth.loading') : t('auth.sendInstructions')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 font-mono text-sm text-white/60 transition-colors hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('auth.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ForgotPassword;
