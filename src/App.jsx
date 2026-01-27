import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CreditsProvider } from './context/CreditsContext';
import Sidebar from './components/Sidebar';
import { Sun, Moon, LogOut } from 'lucide-react';
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
import Home from './components/Home';
import OutrasTaxasManager from './components/OutrasTaxasManager';
import Login from './components/Login';
import Register from './components/Register';
import ProfileManager from './components/ProfileManager';
import { AuthProvider, useAuth } from './context/AuthContext';
import InstallmentManager from './components/InstallmentManager';
import LeaseManager from './components/LeaseManager';
import { bcbService } from './services/bcbService';
import { useToast } from './context/ToastContext';


function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const { theme, toggleTheme } = useTheme();
  const { isConnected, lastUpdated, loading } = useSelic();
  const { logout, user } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home setActiveTab={setActiveTab} />;
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
      case 'installments':
        return <InstallmentManager />;
      case 'leases':
        return <LeaseManager />;
      case 'exchange':
        return <ExchangeRateManager />;
      case 'outras-taxas':
        return <OutrasTaxasManager />;
      case 'profile':
        return <ProfileManager />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            Módulo {activeTab} em construção
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selicStatus={{ isConnected, lastUpdated, loading }}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Olá, <span className="text-slate-900 dark:text-white font-semibold">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              title="Alternar Tema"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className="h-9 w-9 rounded-full bg-irko-blue text-white flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-irko-orange transition-all shadow-sm"
              title="Perfil e Configurações"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold">
                  {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className={`flex-1 w-full ${activeTab === 'home' ? 'overflow-hidden p-6' : 'overflow-y-auto p-8'}`}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}


function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('login');
  const { success } = useToast();

  useEffect(() => {
    if (user) {
      const performSync = async () => {
        try {
          const result = await bcbService.syncDailyExchangeRates();
          if (result && result.status === 'success') {
            success(`Taxas cambiais sincronizadas para ${result.currenciesSynced} moedas.`);
          }
        } catch (error) {
          console.error('Failed to sync exchange rates:', error);
        }
      };
      performSync();
    }
  }, [user, success]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-irko-blue"></div>
      </div>
    );
  }

  if (!user) {
    if (currentView === 'register') {
      return <Register onLoginClick={() => setCurrentView('login')} />;
    }
    return <Login onRegisterClick={() => setCurrentView('register')} />;
  }

  return <Dashboard />;
}

import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CreditsProvider>
            <PerdcompProvider>
              <CompanyProvider>
                <LoanProvider>
                  <AppContent />
                </LoanProvider>
              </CompanyProvider>
            </PerdcompProvider>
          </CreditsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
