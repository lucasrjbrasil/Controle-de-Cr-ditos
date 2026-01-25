import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CreditsProvider } from './context/CreditsContext';
import Sidebar from './components/Sidebar';
import { Sun, Moon } from 'lucide-react';
import { useSelic } from './hooks/useSelic';
import CreditsManager from './components/CreditsManager';
import SelicManager from './components/SelicManager';
import PerdcompManager from './components/PerdcompManager';
import { PerdcompProvider } from './context/PerdcompContext';
import { CompanyProvider } from './context/CompanyContext';
import CompanyManager from './components/CompanyManager';
import { LoanProvider } from './context/LoanContext';
import LoanManager from './components/LoanManager';
import ExchangeRateManager from './components/ExchangeRateManager';
import ErrorBoundary from './components/ErrorBoundary';


function Dashboard() {
  const [activeTab, setActiveTab] = useState('credits');
  const { theme, toggleTheme } = useTheme();
  const { isConnected, lastUpdated, loading } = useSelic();

  const renderContent = () => {
    switch (activeTab) {
      case 'credits':
        return <CreditsManager />;
      case 'selic':
        return <SelicManager />;
      case 'perdcomps':
        return <PerdcompManager />;
      case 'companies':
        return <CompanyManager />;
      case 'loans':
        return (
          <ErrorBoundary>
            <LoanManager />
          </ErrorBoundary>
        );
      case 'exchange':
        return <ExchangeRateManager />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            Módulo {activeTab} em construção
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selicStatus={{ isConnected, lastUpdated, loading }}
      />

      <main className="flex-1">
        <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Olá, Usuário
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div className="p-8 w-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CreditsProvider>
        <PerdcompProvider>
          <CompanyProvider>
            <LoanProvider>
              <Dashboard />
            </LoanProvider>
          </CompanyProvider>
        </PerdcompProvider>
      </CreditsProvider>
    </ThemeProvider>
  );
}

export default App;
