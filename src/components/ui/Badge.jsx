
import { cn } from '../../utils/cn';

const variants = {
    default: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    secondary: 'bg-irko-orange/10 text-irko-orange dark:bg-irko-orange/20',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    outline: 'border border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-300',
};

const Badge = ({ className, variant = 'default', children, ...props }) => {

    return (
        <div className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
            variants[variant],
            className
        )} {...props}>
            {children}
        </div>
    );
};

export default Badge;
