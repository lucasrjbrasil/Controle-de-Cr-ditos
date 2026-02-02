
import {
    Building2,
    FileText,
    TrendingUp,
    Landmark,
    DollarSign,
    Globe,
    ArrowRight,
    Activity,
    CreditCard,
    FileKey,
    Percent
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Home({ setActiveTab }) {
    const modules = [
        {
            id: 'credits',
            title: 'Gestão de Créditos',
            description: 'Controle centralizado de créditos tributários e não tributários.',
            icon: FileText,
            color: 'text-irko-blue dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-irko-blue/10',
            border: 'hover:border-irko-blue dark:hover:border-blue-800'
        },
        {
            id: 'companies',
            title: 'Empresas',
            description: 'Gerenciamento de base de dados de empresas e filiais.',
            icon: Building2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'hover:border-emerald-200 dark:hover:border-emerald-800'
        },
        {
            id: 'perdcomps',
            title: 'PERDCOMPs',
            description: 'Acompanhamento de pedidos de compensação e restituição.',
            icon: TrendingUp,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'hover:border-purple-200 dark:hover:border-purple-800'
        },
        {
            id: 'loans',
            title: 'Empréstimos',
            description: 'Controle de contratos de mútuo e movimentações financeiras.',
            icon: Landmark,
            color: 'text-irko-orange',
            bg: 'bg-orange-50 dark:bg-irko-orange/10',
            border: 'hover:border-irko-orange dark:hover:border-orange-800'
        },
        {
            id: 'installments',
            title: 'Parcelamentos',
            description: 'Gestão de parcelamentos e controle de prestações.',
            icon: CreditCard,
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'hover:border-amber-200 dark:hover:border-amber-800',
            badge: 'WIP'
        },
        {
            id: 'leases',
            title: 'Arrendamentos',
            description: 'Controle de contratos de arrendamento e leasing.',
            icon: FileKey,
            color: 'text-violet-500',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            border: 'hover:border-violet-200 dark:hover:border-violet-800',
            badge: 'WIP'
        },
        {
            id: 'selic',
            title: 'Selic Histórica',
            description: 'Consulta da taxa Selic acumulada mensalmente.',
            icon: DollarSign,
            color: 'text-red-500',
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'hover:border-red-200 dark:hover:border-red-800'
        },
        {
            id: 'exchange',
            title: 'Taxas Cambiais',
            description: 'Monitoramento de taxas de câmbio atualizadas.',
            icon: Globe,
            color: 'text-cyan-500',
            bg: 'bg-cyan-50 dark:bg-cyan-900/20',
            border: 'hover:border-cyan-200 dark:hover:border-cyan-800'
        },
        {
            id: 'outras-taxas',
            title: 'Outras Taxas',
            description: 'Acompanhamento de outras taxas e indicadores.',
            icon: Percent,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'hover:border-purple-200 dark:hover:border-purple-800',
            badge: 'WIP'
        }
    ];

    const IconPercent = Percent; // Just in case Percent is not in the scope, but I'll add it to imports.

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500 overflow-hidden min-h-0">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-irko-blue via-[#004a8d] to-irko-orange/80 p-5 sm:p-6 text-white shadow-lg flex-shrink-0">
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-bold uppercase tracking-wider mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Sistema Ativo
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black mb-0.5 tracking-tight">
                            Bem-vindo ao <span className="text-white">IRKO</span> <span className="text-irko-orange">Créditos</span>
                        </h1>
                        <p className="text-blue-100/80 text-[13px] font-medium leading-tight">
                            Gestão de créditos tributários e acompanhamento financeiro com a excelência <span className="text-white font-bold italic">IRKO Contabilidade</span>.
                        </p>
                    </div>
                </div>

                {/* Decorative Pattern */}
                <div className="absolute right-[-2%] top-[-30%] h-[160%] w-1/4 opacity-10 pointer-events-none rotate-12">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.5,32.3C58.8,43.1,46.7,51.8,33.9,59.3C21.1,66.8,7.6,73.1,-5.1,81.9C-17.8,90.7,-29.7,102,-41.2,99.8C-52.7,97.6,-63.8,81.9,-72.1,67.4C-80.4,52.9,-85.9,39.6,-86.8,25.9C-87.7,12.2,-84,-1.9,-79.1,-15.1C-74.2,-28.3,-68.1,-40.6,-58.3,-50.2C-48.5,-59.8,-35,-66.7,-21.5,-70.7C-8,-74.7,5.5,-75.8,19.3,-75.8" transform="translate(100 100)" />
                    </svg>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-y-auto pr-1">
                {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                        <Card
                            key={module.id}
                            className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-slate-100 dark:border-slate-800 ${module.border} hover:-translate-y-0.5 h-full min-h-[100px] flex flex-col bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden`}
                            onClick={() => setActiveTab(module.id)}
                        >
                            <CardContent className="p-3.5 flex flex-col h-full relative">
                                {module.badge && (
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 dark:bg-amber-600 text-white text-[8px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                        {module.badge}
                                    </div>
                                )}
                                <div className="flex items-start justify-between mb-2">
                                    <div className={`p-2 rounded-lg ${module.bg} ${module.color} transition-all group-hover:scale-105 duration-500 shadow-sm`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0 bg-slate-50 dark:bg-slate-800 p-1 rounded-full">
                                        <ArrowRight size={14} className="text-irko-blue dark:text-slate-300" />
                                    </div>
                                </div>
                                <div className="mt-1">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0.5 group-hover:text-irko-blue dark:group-hover:text-irko-orange transition-colors">
                                        {module.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight font-medium">
                                        {module.description}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};


