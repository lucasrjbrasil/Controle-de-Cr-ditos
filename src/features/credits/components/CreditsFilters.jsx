import { Search, Filter } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function CreditsFilters({
    searchTerm,
    setSearchTerm,
    showOnlyAvailable,
    setShowOnlyAvailable,
    competencyDate,
    setCompetencyDate
}) {
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
                <Input
                    icon={Search}
                    placeholder="Pesquisar por Empresa, Código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={showOnlyAvailable}
                            onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                        />
                        <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-irko-orange rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-irko-orange"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap group-hover:text-irko-blue transition-colors">
                        Somente com Saldo
                    </span>
                </label>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        Competência:
                    </label>
                    <input
                        type="month"
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none text-sm"
                        value={competencyDate}
                        onChange={(e) => setCompetencyDate(e.target.value)}
                    />
                </div>
            </div>

            <Button variant="secondary" size="icon" className="text-slate-500">
                <Filter size={20} />
            </Button>
        </div>
    );
}


