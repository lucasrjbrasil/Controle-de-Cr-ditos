import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';
import { sanitize } from '../utils/validationUtils';

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30000; // 30 seconds

const Login = ({ onRegisterClick }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginMethod, setLoginMethod] = useState('email');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);

    // Rate limiting state
    const [attempts, setAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState(null);

    const { login } = useAuth();

    const isLockedOut = lockoutUntil && Date.now() < lockoutUntil;
    const remainingLockout = isLockedOut ? Math.ceil((lockoutUntil - Date.now()) / 1000) : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Check rate limiting
        if (isLockedOut) {
            setError(`Muitas tentativas. Aguarde ${remainingLockout} segundos.`);
            return;
        }

        setIsLoading(true);

        try {
            // Sanitize identifier before sending
            const sanitizedIdentifier = sanitize(identifier);
            await login(sanitizedIdentifier, password, rememberMe);
            setAttempts(0); // Reset on success
        } catch (err) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= MAX_ATTEMPTS) {
                setLockoutUntil(Date.now() + LOCKOUT_DURATION);
                setError(`Muitas tentativas falhas. Conta bloqueada por 30 segundos.`);
                // Auto-reset after lockout
                setTimeout(() => {
                    setLockoutUntil(null);
                    setAttempts(0);
                }, LOCKOUT_DURATION);
            } else {
                setError(`${err.message || 'Falha ao processar login.'} (${MAX_ATTEMPTS - newAttempts} tentativas restantes)`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                redirectTo: window.location.origin + '/',
            });
            if (error) throw error;
            setForgotSuccess(true);
        } catch (err) {
            setError(err.message || 'Erro ao enviar email de recuperação.');
        } finally {
            setForgotLoading(false);
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
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full px-3 py-2 pr-10 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-irko-blue focus:border-transparent text-sm dark:bg-slate-800 dark:text-white transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
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

                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-xs font-semibold text-irko-orange hover:text-opacity-80 transition-opacity"
                            >
                                Esqueceu a senha?
                            </button>
                        </div>

                        {/* Rate limiting warning */}
                        {isLockedOut && (
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-600" />
                                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                    Conta bloqueada. Aguarde {remainingLockout}s
                                </p>
                            </div>
                        )}

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

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                            Recuperar Senha
                        </h3>
                        {forgotSuccess ? (
                            <div className="space-y-4">
                                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                                    <p className="text-sm text-green-800 dark:text-green-300">
                                        Email enviado com sucesso! Verifique sua caixa de entrada para redefinir sua senha.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowForgotPassword(false); setForgotSuccess(false); setForgotEmail(''); }}
                                    className="w-full py-2 px-4 bg-irko-blue text-white rounded-xl font-semibold text-sm hover:bg-irko-blue-hover transition-colors"
                                >
                                    Voltar ao Login
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Digite seu email para receber um link de recuperação de senha.
                                </p>
                                <input
                                    type="email"
                                    required
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-irko-blue text-sm dark:bg-slate-800 dark:text-white"
                                    placeholder="seu@email.com"
                                />
                                {error && (
                                    <p className="text-xs text-red-500">{error}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgotPassword(false); setError(''); }}
                                        className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="flex-1 py-2 px-4 bg-irko-orange text-white rounded-xl font-semibold text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {forgotLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Enviar Email'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <footer className="mt-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-600 flex-shrink-0">
                &copy; {new Date().getFullYear()} IRKO Contabilidade. Todos os direitos reservados.
            </footer>
        </div>
    );
};

export default Login;
