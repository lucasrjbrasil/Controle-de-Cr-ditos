import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(({ className, type, icon: Icon, ...props }, ref) => {
    return (
        <div className="relative w-full">
            {Icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon size={18} />
                </div>
            )}
            <input
                type={type}
                className={cn(
                    'flex h-10 w-full rounded-lg border-none bg-slate-50 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:text-white',
                    Icon && 'pl-10',
                    className
                )}
                ref={ref}
                {...props}
            />
        </div>
    );
});
Input.displayName = 'Input';

export default Input;
