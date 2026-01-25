import { useState } from 'react';
import { Building2, FileText, TrendingUp, DollarSign, Landmark, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Sidebar({ activeTab, setActiveTab, selicStatus }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems = [
        { id: 'companies', label: 'Empresas', icon: Building2 },
        { id: 'credits', label: 'Créditos', icon: FileText },
        { id: 'perdcomps', label: 'PERDCOMPs', icon: TrendingUp },
        { id: 'loans', label: 'Empréstimos', icon: Landmark },
        { id: 'selic', label: 'Selic Histórica', icon: DollarSign },
        { id: 'exchange', label: 'Taxas Cambiais', icon: Globe },
    ];

    return (
        <div
            className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 sticky top-0 relative`}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-md text-slate-500 hover:text-blue-600 transition-colors z-10"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden whitespace-nowrap`}>
                <div className="flex-shrink-0 flex items-center">
                    <img src={logo} alt="IRKO Logo" className="w-8 h-8 object-contain" />
                </div>
                <h1 className={`text-base font-bold text-slate-800 dark:text-white transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    IRKO <span className="text-irko-orange">Créditos</span>
                </h1>
            </div>

            <nav className="flex-1 px-3 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 relative group ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <Icon size={20} className="flex-shrink-0" />
                            <span className={`font-medium whitespace-nowrap transition-all duration-200 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                {item.label}
                            </span>

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className={`p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 ${isCollapsed ? 'items-center text-center' : ''}`}>
                <div className="flex flex-col gap-1">
                    {!isCollapsed && (
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Conexão BCB
                        </div>
                    )}
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
                        <div className={`w-2 h-2 rounded-full ${selicStatus?.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} title={selicStatus?.isConnected ? 'Conectado' : 'Desconectado'}></div>
                        {!isCollapsed && (
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                                {selicStatus?.loading ? 'Conectando...' : (selicStatus?.isConnected ? 'Ativa' : 'Inativa')}
                            </span>
                        )}
                    </div>
                    {!isCollapsed && selicStatus?.lastUpdated && (
                        <div className="text-[10px] text-slate-400">
                            Última taxa: {selicStatus.lastUpdated}
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                        &copy; 2026 Tax App
                    </div>
                )}
            </div>
        </div>
    );
}
