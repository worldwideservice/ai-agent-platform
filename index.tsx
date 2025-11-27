import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';
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
      <ToastProvider>
        <ToastWrapper>
          <App />
        </ToastWrapper>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);