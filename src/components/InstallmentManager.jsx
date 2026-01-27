import React from 'react';
import { CreditCard, Construction } from 'lucide-react';

export default function InstallmentManager() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Parcelamentos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Acompanhe e organize seus parcelamentos.</p>
                </div>
            </div>

            {/* WIP Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] flex items-center justify-center">
                <div className="flex flex-col items-center justify-center text-center p-8">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 rounded-2xl flex items-center justify-center">
                            <CreditCard size={48} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                            <Construction size={24} className="text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        Módulo em Desenvolvimento
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-4">
                        O módulo de Parcelamentos está sendo desenvolvido e estará disponível em breve.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Work in Progress
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
