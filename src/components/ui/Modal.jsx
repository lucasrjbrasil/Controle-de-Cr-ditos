import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full lg:mx-8',
};

/**
 * Reusable Modal component that handles:
 * - Backdrop blur and overlay
 * - Responsive width and max-height
 * - Scrollable content area
 * - Header and clean close button
 * - Keyboard (Esc) support
 */
export default function Modal({
    isOpen = true,
    onClose,
    title,
    children,
    maxWidth = '2xl', // sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, full
    description,
    headerAction
}) {
    // Handle Esc key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    const widthClass = maxWidthClasses[maxWidth] || maxWidthClasses['2xl'];

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`
                    bg-white dark:bg-slate-900 
                    w-full ${widthClass}
                    rounded-2xl shadow-2xl 
                    flex flex-col 
                    max-h-[90vh] 
                    border border-slate-200 dark:border-slate-800
                    animate-in zoom-in-95 duration-200
                `}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl flex-shrink-0">
                    <div className="flex-1 min-w-0">
                        {title && (
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                                {title}
                            </h3>
                        )}
                        {description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pl-4">
                        {headerAction}
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
