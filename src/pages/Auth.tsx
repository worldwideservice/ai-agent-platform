import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Auth: React.FC = () => {
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
        setSuccess('Вход выполнен успешно!');
      } else {
        // РЕГИСТРАЦИЯ
        // Валидация
        if (!organizationName.trim()) {
          setError('Введите название организации');
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Пароль должен содержать минимум 6 символов');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Пароли не совпадают');
          setIsLoading(false);
          return;
        }

        console.log('🔐 Calling register...');
        await register({ email, password, name: organizationName.trim() });
        console.log('✅ Register successful!');

        // Показываем успешное сообщение
        setSuccess('Регистрация успешна! Теперь войдите в систему.');

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

      // Переводим ошибки на русский
      if (errorMessage?.includes('already exists')) {
        setError('Пользователь с таким email уже существует');
      } else if (errorMessage?.includes('Invalid email or password')) {
        setError('Неверный email или пароль');
      } else {
        setError(errorMessage || 'Произошла ошибка. Проверьте данные и попробуйте снова.');
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
          {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
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
                Название организации *
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="ООО Ваша Компания"
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
              Email *
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
              Пароль *
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
                Подтвердите пароль *
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
            {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#718096',
          fontSize: '14px',
        }}>
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
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
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
