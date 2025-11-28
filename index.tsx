import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './src/i18n'; // Initialize i18n
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { ToastProvider, useToast } from './src/contexts/ToastContext';
import { ToastContainer } from './components/Toast';

// Wrapper для toast контейнера
const ToastWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, removeToast } = useToast();
  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SubscriptionProvider>
        <ToastProvider>
          <ToastWrapper>
            <App />
          </ToastWrapper>
        </ToastProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </React.StrictMode>
);