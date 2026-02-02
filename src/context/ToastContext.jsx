import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotification } from './NotificationContext';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const { addNotification, updateNotification } = useNotification();

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);

        // Automatically add to notification history
        // Pass the same ID to notification context so we can update it later
        addNotification({
            id,
            message,
            type,
            title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : type === 'warning' ? 'Atenção' : 'Informação'
        });

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, [addNotification]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const updateToast = useCallback((id, updates) => {
        // Determine new type to get correct title
        const newType = updates.type || 'info'; // fallback, though usually we have access to old type in state, here we only know updates. 
        // Actually, we don't know the OLD type here easily without looking at state, but we can guess if type IS updated.
        // If type is updated, we should provide the new title.

        let newTitle = updates.title;
        if (!newTitle && updates.type) {
            newTitle = updates.type === 'success' ? 'Sucesso' : updates.type === 'error' ? 'Erro' : updates.type === 'warning' ? 'Atenção' : 'Informação';
        }

        // Update notification history as well
        updateNotification(id, {
            message: updates.message,
            type: updates.type,
            title: newTitle
        });

        setToasts(prev => prev.map(toast => {
            if (toast.id === id) {
                // Determine new type to update notification history if type changes
                const newType = updates.type || toast.type;
                const newMessage = updates.message || toast.message;

                // If duration is updated, we might need to handle timeout reset, 
                // but for now simpler to just update content.
                // Ideally, if type changes to success/error, we want auto-dismiss.

                if (updates.duration) {
                    setTimeout(() => {
                        removeToast(id);
                    }, updates.duration);
                }

                return { ...toast, ...updates };
            }
            return toast;
        }));
    }, [removeToast, updateNotification]);

    const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
    const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
    const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
    const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, updateToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function Toast({ toast, onClose }) {
    const { message, type } = toast;

    const config = {
        success: {
            icon: CheckCircle,
            className: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-100 dark:border-emerald-800',
            iconClassName: 'text-emerald-600 dark:text-emerald-400'
        },
        error: {
            icon: AlertCircle,
            className: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800',
            iconClassName: 'text-red-600 dark:text-red-400'
        },
        warning: {
            icon: AlertTriangle,
            className: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800',
            iconClassName: 'text-amber-600 dark:text-amber-400'
        },
        info: {
            icon: Info,
            className: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-800',
            iconClassName: 'text-blue-600 dark:text-blue-400'
        }
    };

    const { icon: Icon, className, iconClassName } = config[type] || config.info;

    return (
        <div
            className={`
                pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg
                min-w-[300px] max-w-md
                animate-in slide-in-from-right duration-300
                ${className}
            `}
        >
            <Icon className={`flex-shrink-0 ${iconClassName}`} size={20} />
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={onClose}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Fechar notificação"
            >
                <X size={18} />
            </button>
        </div>
    );
}
