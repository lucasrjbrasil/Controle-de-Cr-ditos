import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, AlertCircle, Trash2, CheckCircle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Notifications() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotification();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <Check size={16} className="text-emerald-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'error': return <AlertCircle size={16} className="text-red-500" />;
            default: return <Info size={16} className="text-blue-500" />;
        }
    };

    const getBgColor = (type) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 dark:bg-emerald-900/20';
            case 'warning': return 'bg-amber-50 dark:bg-amber-900/20';
            case 'error': return 'bg-red-50 dark:bg-red-900/20';
            default: return 'bg-blue-50 dark:bg-blue-900/20';
        }
    };

    const handleNotificationClick = (id) => {
        markAsRead(id);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Agora mesmo';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors focus:outline-none"
                title="Notificações"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-irko-orange opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-irko-orange"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notificações</h3>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs font-medium text-irko-blue dark:text-blue-400 hover:underline flex items-center gap-1"
                                    title="Marcar todas como lidas"
                                >
                                    <CheckCircle size={12} />
                                    Lidas
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearNotifications}
                                    className="text-xs font-medium text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:underline flex items-center gap-1"
                                    title="Limpar todas"
                                >
                                    <Trash2 size={12} />
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification.id)}
                                        className={`p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center ${getBgColor(notification.type)}`}>
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-medium truncate ${!notification.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                                                        {formatDate(notification.time)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="self-center">
                                                    <div className="h-2 w-2 rounded-full bg-irko-blue"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 px-4 text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                    <Bell size={20} className="text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                    Nenhuma notificação
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Você está em dia com tudo!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
