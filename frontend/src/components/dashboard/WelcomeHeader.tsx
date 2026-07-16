import React from 'react';

interface WelcomeHeaderProps {
    userName: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName }) => {
    return (
        <div className="mb-6 px-2">
            <h1 className="text-3xl font-light text-slate-800 tracking-tight">
                Welcome Back, <span className="font-semibold">{userName}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
                Your AI control room - monitoring agents, costs, and compliance
            </p>
        </div>
    );
};
