import React from 'react';
import clsx from 'clsx';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'highlight';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
    children, 
    className, 
    variant = 'default',
    ...props 
}) => {
    return (
        <div 
            className={clsx(
                "rounded-3xl p-6 transition-all duration-300",
                variant === 'default' 
                    ? "bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/70" 
                    : "bg-brand-50/80 backdrop-blur-xl border border-brand-200/50 shadow-[0_8px_30px_rgb(250,204,21,0.1)]",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
