import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch(err => {
            console.error("Auth session fetch failed:", err);
            setLoading(false);
        });


        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (identifier, password, rememberMe) => {
        // identifier can be email or phone
        const isEmail = identifier.includes('@');
        const loginPayload = isEmail ? { email: identifier, password } : { phone: identifier.startsWith('+') ? identifier : `+55${identifier.replace(/\D/g, '')}`, password };

        const { data, error } = await supabase.auth.signInWithPassword(loginPayload);

        if (error) throw error;
        return { user: data.user, error: null };
    };

    const register = async (email, password, name, phone) => {
        const signUpOptions = {
            email,
            password,
            options: {
                data: {
                    full_name: name,
                }
            }
        };

        if (phone) {
            signUpOptions.phone = phone.startsWith('+') ? phone : `+55${phone.replace(/\D/g, '')}`;
        }

        const { data, error } = await supabase.auth.signUp(signUpOptions);

        if (error) throw error;
        return { user: data.user, error: null };
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
