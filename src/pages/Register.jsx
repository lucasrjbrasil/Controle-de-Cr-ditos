import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import logo from '../assets/logo.png';
import { validatePasswordStrength, sanitize } from '../utils/validationUtils';

const Register = ({ onLoginClick }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [registerMethod, setRegisterMethod] = useState('email');
    const { register } = useAuth();

    // Real-time password strength validation
    const passwordValidation = useMemo(() => validatePasswordStrength(password), [password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSuccess(false);

        // Validate password strength
        if (!passwordValidation.isValid) {
            setError('Senha fraca. ' + passwordValidation.errors.join(', '));
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);

        try {
            // Sanitize inputs before sending
            const sanitizedName = sanitize(name);
            await register(
                registerMethod === 'email' ? email : null,
                password,
                sanitizedName,
                registerMethod === 'phone' ? phone : null
            );
            setIsSuccess(true);
        } catch (err) {
            setError(err.message || 'Falha ao criar conta.');
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
                    {isSuccess ? (
                        <div className="text-center space-y-6 py-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
                                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Conta criada com sucesso!</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {registerMethod === 'email'
                                        ? 'Enviamos um link de confirmação para sua caixa de entrada.'
                                        : 'Sua conta foi criada com sucesso!'}
                                </p>
                            </div>
                            <button
                                onClick={onLoginClick}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-irko-blue hover:bg-irko-blue-hover transition-all"
                            >
                                Ir para Login
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Method Selector */}
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                                <button
                                    onClick={() => setRegisterMethod('email')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${registerMethod === 'email' ? 'bg-white dark:bg-slate-700 shadow-sm text-irko-blue' : 'text-slate-500'}`}
                                >
                                    Email
                                </button>
                                <button
                                    onClick={() => setRegisterMethod('phone')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${registerMethod === 'phone' ? 'bg-white dark:bg-slate-700 shadow-sm text-irko-blue' : 'text-slate-500'}`}
                                >
                                    Celular
                                </button>
                            </div>

                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-irko-blue text-sm dark:bg-slate-800 dark:text-white"
                                        placeholder="Seu nome"
                                    />
                                </div>

                                {registerMethod === 'email' ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Email Corporativo
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-irko-blue text-sm dark:bg-slate-800 dark:text-white"
                                            placeholder="usuario@irko.com.br"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Número do Celular
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-irko-blue text-sm dark:bg-slate-800 dark:text-white"
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="block w-full px-3 py-2 pr-10 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-irko-blue text-sm dark:bg-slate-800 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>

                                        {/* Password Strength Indicator */}
                                        {password && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex gap-1">
                                                    <div className={`h-1 flex-1 rounded-full ${passwordValidation.strength === 'weak' ? 'bg-red-500' : passwordValidation.strength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${passwordValidation.strength === 'medium' ? 'bg-yellow-500' : passwordValidation.strength === 'strong' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${passwordValidation.strength === 'strong' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                </div>
                                                <div className="text-[10px] text-slate-500 space-y-0.5">
                                                    {['Mínimo de 8 caracteres', 'Pelo menos 1 letra maiúscula', 'Pelo menos 1 número', 'Pelo menos 1 caractere especial (!@#$%...)'].map((req, i) => {
                                                        const passed = !passwordValidation.errors.includes(req);
                                                        return (
                                                            <div key={i} className={`flex items-center gap-1 ${passed ? 'text-green-600' : 'text-slate-400'}`}>
                                                                {passed ? <Check size={10} /> : <X size={10} />}
                                                                {req}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Confirmar Senha
                                        </label>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`block w-full px-3 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-irko-blue text-sm dark:bg-slate-800 dark:text-white ${confirmPassword && password !== confirmPassword ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}`}
                                        />
                                        {confirmPassword && password !== confirmPassword && (
                                            <p className="text-[10px] text-red-500 mt-1">As senhas não coincidem</p>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
                                        <p className="text-xs font-medium text-red-800 dark:text-red-300">
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-irko-blue hover:bg-irko-blue-hover transition-all"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Criar minha conta'}
                                    </button>
                                </div>

                                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
                                    <button
                                        onClick={(e) => { e.preventDefault(); onLoginClick(); }}
                                        className="text-xs font-bold text-irko-orange hover:opacity-80 transition-all"
                                    >
                                        Já possui acesso? Entrar agora
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>

            <footer className="mt-6 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-600 flex-shrink-0">
                &copy; {new Date().getFullYear()} IRKO Contabilidade. Todos os direitos reservados.
            </footer>
        </div>
    );
};

export default Register;


