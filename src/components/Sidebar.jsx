import { useState } from 'react';
import { Building2, FileText, TrendingUp, DollarSign, Landmark, ChevronLeft, ChevronRight, ChevronDown, Globe, LayoutDashboard, CreditCard, FileKey, Percent } from 'lucide-react';
import logo from '../assets/logo.png';
import Button from './ui/Button';

export default function Sidebar({ activeTab, setActiveTab, selicStatus }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedSections, setExpandedSections] = useState({ taxas: false });

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const menuItems = [
        { id: 'home', label: 'Início', icon: LayoutDashboard },
        { id: 'companies', label: 'Empresas', icon: Building2 },
        { id: 'credits', label: 'Créditos', icon: FileText },
        { id: 'perdcomps', label: 'PERDCOMPs', icon: TrendingUp },
        { id: 'loans', label: 'Empréstimos', icon: Landmark },
        { id: 'installments', label: 'Parcelamentos', icon: CreditCard },
        { id: 'leases', label: 'Arrendamentos', icon: FileKey },
    ];

    const taxasSection = {
        id: 'taxas',
        label: 'Taxas',
        icon: Percent,
        items: [
            { id: 'selic', label: 'Selic Histórica', icon: DollarSign },
            { id: 'exchange', label: 'Taxas Cambiais', icon: Globe },
            { id: 'outras-taxas', label: 'Outras Taxas', icon: Percent },
        ]
    };

    return (
        <div
            className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 sticky top-0 relative`}
        >
            {/* Toggle Button */}
            <Button
                variant="secondary"
                size="iconSm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 rounded-full shadow-md z-10 h-6 w-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </Button>

            <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden whitespace-nowrap`}>
                <div className="flex-shrink-0 flex items-center">
                    <img src={logo} alt="IRKO Logo" className="w-8 h-8 object-contain" />
                </div>
                <h1 className={`text-base font-bold text-slate-800 dark:text-white transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                    IRKO <span className="text-irko-orange">Créditos</span>
                </h1>
            </div>

            <nav className="flex-1 px-3 space-y-2 overflow-y-auto">
                {/* Regular menu items */}
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 relative group ${isActive
                                ? 'bg-irko-blue text-white shadow-lg shadow-irko-blue/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-irko-blue dark:hover:text-blue-400'
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

                {/* Taxas collapsible section */}
                <div className="space-y-1">
                    {/* Section header */}
                    <button
                        onClick={() => !isCollapsed && toggleSection('taxas')}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 relative group text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-irko-blue dark:hover:text-blue-400`}
                        title={isCollapsed ? taxasSection.label : ''}
                    >
                        <taxasSection.icon size={20} className="flex-shrink-0" />
                        <span className={`font-medium whitespace-nowrap transition-all duration-200 overflow-hidden flex-1 text-left ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            {taxasSection.label}
                        </span>
                        {!isCollapsed && (
                            <ChevronDown
                                size={16}
                                className={`transition-transform duration-200 ${expandedSections.taxas ? 'rotate-0' : '-rotate-90'}`}
                            />
                        )}

                        {/* Tooltip for collapsed state */}
                        {isCollapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                {taxasSection.label}
                            </div>
                        )}
                    </button>

                    {/* Section items */}
                    {(!isCollapsed && expandedSections.taxas) && (
                        <div className="space-y-1 pl-4">
                            {taxasSection.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 relative group ${isActive
                                            ? 'bg-irko-blue text-white shadow-lg shadow-irko-blue/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-irko-blue dark:hover:text-blue-400'
                                            }`}
                                    >
                                        <Icon size={18} className="flex-shrink-0" />
                                        <span className="font-medium whitespace-nowrap text-sm">
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </nav>

            <div className={`p-4 border-t border-slate-200 dark:border-slate-800 ${isCollapsed ? 'items-center text-center' : ''}`}>
                {!isCollapsed && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                        &copy; {new Date().getFullYear()} IRKO Contabilidade
                    </div>
                )}
            </div>
        </div>
    );
}
