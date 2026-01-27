import React from 'react';
import { FileKey, Construction } from 'lucide-react';

export default function LeaseManager() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Arrendamentos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Acompanhe e organize seus arrendamentos.</p>
                </div>
            </div>

            {/* WIP Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] flex items-center justify-center">
                <div className="flex flex-col items-center justify-center text-center p-8">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl flex items-center justify-center">
                            <FileKey size={48} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                            <Construction size={24} className="text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        Módulo em Desenvolvimento
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-4">
                        O módulo de Arrendamentos está sendo desenvolvido e estará disponível em breve.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                            Work in Progress
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
