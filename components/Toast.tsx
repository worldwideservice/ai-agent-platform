import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
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
            default:
                return <CheckCircle size={24} className="text-blue-600 dark:text-blue-400" />;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-md animate-fadeIn">
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
