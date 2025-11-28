import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export const Auth: React.FC = () => {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Автоматически скрывать success toast через 3 секунды
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Form submitted:', { isLogin, email });
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // ВХОД
        console.log('🔐 Calling login...');
        await login({ email, password });
        console.log('✅ Login successful!');
        setSuccess(t('auth.loginSuccess'));
      } else {
        // РЕГИСТРАЦИЯ
        // Валидация
        if (!organizationName.trim()) {
          setError(t('auth.errorOrgRequired'));
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          setError(t('auth.errorPasswordMin'));
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError(t('auth.errorPasswordMismatch'));
          setIsLoading(false);
          return;
        }

        console.log('🔐 Calling register...');
        await register({ email, password, name: organizationName.trim() });
        console.log('✅ Register successful!');

        // Показываем успешное сообщение
        setSuccess(t('auth.registerSuccess'));

        // Очищаем форму
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setOrganizationName('');

        // Через 2 секунды переключаем на форму входа
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      console.error('❌ Auth error:', err);
      const errorMessage = err.response?.data?.message || err.message;

      // Переводим ошибки
      if (errorMessage?.includes('already exists')) {
        setError(t('auth.errorUserExists'));
      } else if (errorMessage?.includes('Invalid email or password')) {
        setError(t('auth.errorInvalidCredentials'));
      } else {
        setError(errorMessage || t('auth.errorGeneric'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '8px',
          textAlign: 'center',
          color: '#1a202c',
        }}>
          AI Agent Platform
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#718096',
          marginBottom: '32px',
        }}>
          {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                {t('auth.organizationName')} *
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder={t('auth.organizationPlaceholder')}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {t('auth.email')} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <div style={{ marginBottom: isLogin ? '24px' : '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {t('auth.password')} *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {!isLogin && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                {t('auth.confirmPassword')} *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          )}

          {/* Success Toast */}
          {success && (
            <div style={{
              background: '#c6f6d5',
              color: '#22543d',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>✓</span>
              {success}
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div style={{
              background: '#fed7d7',
              color: '#c53030',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>✕</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? t('auth.loading') : (isLogin ? t('auth.loginButton') : t('auth.registerButton'))}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#718096',
          fontSize: '14px',
        }}>
          {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          {' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
              // Очищаем поля при переключении
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setOrganizationName('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: '600',
              textDecoration: 'underline',
            }}
          >
            {isLogin ? t('auth.registerLink') : t('auth.loginLink')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
