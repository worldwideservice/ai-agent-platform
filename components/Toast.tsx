import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

interface ToastProps {
    toast: Toast;
    onClose: (id: string) => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, 4000);

        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle size={24} className="text-green-600 dark:text-green-400" />;
            case 'error':
                return <XCircle size={24} className="text-red-600 dark:text-red-400" />;
            case 'warning':
                return <AlertCircle size={24} className="text-amber-600 dark:text-amber-400" />;
            case 'info':
            default:
                return <AlertCircle size={24} className="text-blue-600 dark:text-blue-400" />;
        }
    };

    const getBorderColor = () => {
        switch (toast.type) {
            case 'success':
                return 'border-l-green-500';
            case 'error':
                return 'border-l-red-500';
            case 'warning':
                return 'border-l-amber-500';
            case 'info':
            default:
                return 'border-l-blue-500';
        }
    };

    return (
        <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${getBorderColor()} rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-md animate-fadeIn`}>
            {getIcon()}
            <span className="flex-1 text-gray-900 dark:text-white text-sm font-medium">
                {toast.message}
            </span>
            <button
                onClick={() => onClose(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
                <X size={18} />
            </button>
        </div>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-6 right-6 z-[300] flex flex-col gap-3">
            {toasts.map(toast => (
                <ToastNotification key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
};
