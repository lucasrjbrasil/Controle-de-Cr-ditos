import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const CreditsContext = createContext();

export function CreditsProvider({ children }) {
    const [credits, setCredits] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        fetchCredits();

        // Set up realtime subscription for automatic updates
        const channel = supabase
            .channel('credits-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'credits' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setCredits(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setCredits(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
                    } else if (payload.eventType === 'DELETE') {
                        setCredits(prev => prev.filter(c => c.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchCredits = async () => {
        try {
            const { data, error } = await supabase
                .from('credits')
                .select('*')
                .order('createdAt', { ascending: false });

            if (error) throw error;
            if (data) setCredits(data);
        } catch (error) {
            console.error('Error fetching credits:', error);
        }
    };

    const addCredit = async (newCredit) => {
        // Integrity Hash Check
        if (credits.some(c => c.integrityHash === newCredit.integrityHash)) {
            throw new Error('Crédito duplicado detectado! (Empresa + PA + Código + Valor já existem)');
        }

        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const creditToSave = {
                ...newCredit,
                selicHistory: [], // Will be populated by service
                modified_by: userName,
                modified_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('credits')
                .insert([creditToSave])
                .select()
                .single();

            if (error) throw error;
            setCredits((prev) => [...prev, data]);
        } catch (error) {
            console.error('Error adding credit:', error);
            throw error;
        }
    };

    const removeCredit = async (id) => {
        try {
            const { error } = await supabase
                .from('credits')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCredits((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
            console.error('Error removing credit:', error);
            throw error;
        }
    };

    const updateCredit = async (id, updatedFields) => {
        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const fieldsWithModification = {
                ...updatedFields,
                modified_by: userName,
                modified_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('credits')
                .update(fieldsWithModification)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setCredits((prev) =>
                prev.map((c) => (c.id === id ? data : c))
            );
        } catch (error) {
            console.error('Error updating credit:', error);
            throw error;
        }
    };

    return (
        <CreditsContext.Provider value={{ credits, addCredit, removeCredit, updateCredit, refreshCredits: fetchCredits }}>
            {children}
        </CreditsContext.Provider>
    );
}

export function useCredits() {
    return useContext(CreditsContext);
}
