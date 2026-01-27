import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = ({ onRegisterClick }) => {
    // ... existing ...
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(identifier, password, rememberMe);
        } catch (err) {
            setError(err.message || 'Falha ao processar login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 font-sans overflow-hidden">
            <div className="w-full max-w-md flex flex-col justify-center min-h-0">
                <div className="flex justify-center flex-col items-center mb-6 flex-shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 relative group transform transition-all duration-300 hover:scale-105">
                        <div className="absolute inset-0 bg-irko-orange rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <img
                            src={logo}
                            alt="Logo IRKO"
                            className="relative w-full h-full object-contain filter drop-shadow-sm"
                        />
                    </div>
                    <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight">
                        <span className="text-irko-blue dark:text-white">IRKO</span>
                        <span className="text-irko-orange ml-2">Créditos</span>
                    </h2>
                    <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium italic">
                        Plataforma de Gestão de Créditos Tributários
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 overflow-y-auto py-6 px-8 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-800 transition-all duration-300 max-h-[80vh]">

                    {/* Method Selector */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                        <button
                            onClick={() => { setLoginMethod('email'); setIdentifier(''); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white dark:bg-slate-700 shadow-sm text-irko-blue' : 'text-slate-500'}`}
                        >
                            Email
                        </button>
                        <button
                            onClick={() => { setLoginMethod('phone'); setIdentifier(''); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white dark:bg-slate-700 shadow-sm text-irko-blue' : 'text-slate-500'}`}
                        >
                            Celular
                        </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="identifier" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {loginMethod === 'email' ? 'Email Corporativo' : 'Número do Celular'}
                            </label>
                            <input
                                id="identifier"
                                name="identifier"
                                type={loginMethod === 'email' ? 'email' : 'tel'}
                                autoComplete={loginMethod === 'email' ? 'email' : 'tel'}
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-irko-blue focus:border-transparent text-sm dark:bg-slate-800 dark:text-white transition-all"
                                placeholder={loginMethod === 'email' ? 'usuario@irko.com.br' : '(11) 99999-9999'}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" name="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-irko-blue focus:border-transparent text-sm dark:bg-slate-800 dark:text-white transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center justify-between py-1">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-3.5 w-3.5 text-irko-blue focus:ring-irko-orange border-slate-300 rounded cursor-pointer transition-colors"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-irko-blue transition-colors">
                                    Lembrar acesso
                                </label>
                            </div>

                            <div className="text-xs">
                                <a href="#" className="font-semibold text-irko-orange hover:text-opacity-80 transition-opacity">
                                    Esqueceu a senha?
                                </a>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2">
                                <p className="text-xs font-medium text-red-800 dark:text-red-300 flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-red-500"></span>
                                    {error}
                                </p>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg shadow-irko-blue/10 text-sm sm:text-base font-bold text-white bg-irko-blue hover:bg-irko-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-irko-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    'Entrar no Sistema'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div className="text-center">
                            <button
                                onClick={onRegisterClick}
                                className="text-xs font-bold text-irko-blue hover:text-irko-orange transition-colors duration-300"
                            >
                                Ainda não possui acesso? <span className="border-b-2 border-transparent hover:border-irko-orange pb-0.5">Solicitar Cadastro</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="mt-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-600 flex-shrink-0">
                &copy; {new Date().getFullYear()} IRKO Contabilidade. Todos os direitos reservados.
            </footer>
        </div>
    );
};

export default Login;
