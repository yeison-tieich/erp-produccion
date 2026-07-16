import React from 'react';
import clsx from 'clsx';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'outline';
    icon?: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({ 
    children, 
    variant = 'default', 
    icon,
    className,
    ...props 
}) => {
    return (
        <button 
            className={clsx(
                "px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
                {
                    'bg-white/60 hover:bg-white text-slate-800 shadow-sm border border-black/5 hover:border-black/10 hover:shadow': variant === 'default',
                    'bg-brand-400 hover:bg-brand-500 text-brand-950 shadow-sm': variant === 'primary',
                    'bg-transparent hover:bg-white/30 text-slate-700 border border-slate-300 hover:border-slate-400': variant === 'outline',
                },
                className
            )}
            {...props}
        >
            {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
            {children}
        </button>
    );
};
