
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const variants = {
    primary: 'bg-irko-blue text-white hover:bg-irko-blue-hover shadow-lg shadow-irko-blue/20 active:scale-95',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-irko-blue shadow-sm active:scale-95 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 active:scale-95',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white active:scale-95',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95',
    link: 'text-irko-blue underline-offset-4 hover:underline dark:text-blue-400',
};

const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-8 text-lg',
    icon: 'h-10 w-10 p-2 flex items-center justify-center',
    iconSm: 'h-7 w-7 p-1 flex items-center justify-center'
};

/**
 * Reusable Button component with 6 distinct variants and 5 sizes.
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'link'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg' | 'icon' | 'iconSm'} [props.size='md']
 * @param {'button' | 'submit' | 'reset'} [props.type='button']
 * @param {string} [props.className]
 */
const Button = forwardRef(({
    className,
    variant = 'primary',
    size = 'md',
    type = 'button',
    children,
    ...props
}, ref) => {

    return (
        <button
            ref={ref}
            type={type}
            className={cn(
                'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-irko-orange disabled:pointer-events-none disabled:opacity-50',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
