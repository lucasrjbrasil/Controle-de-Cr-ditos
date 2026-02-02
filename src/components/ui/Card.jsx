import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Card = forwardRef(({ className, children, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                'rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});
Card.displayName = 'Card';

const CardHeader = forwardRef(({ className, children, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn('flex flex-col space-y-1.5 p-6', className)}
            {...props}
        >
            {children}
        </div>
    );
});
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ className, children, ...props }, ref) => {
    return (
        <h3
            ref={ref}
            className={cn(
                'text-2xl font-semibold leading-none tracking-tight',
                className
            )}
            {...props}
        >
            {children}
        </h3>
    );
});
CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef(({ className, children, ...props }, ref) => {
    return (
        <div ref={ref} className={cn('p-6 pt-0', className)} {...props}>
            {children}
        </div>
    );
});
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
