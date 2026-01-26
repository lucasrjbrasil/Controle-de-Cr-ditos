import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const CreditsContext = createContext();

export function CreditsProvider({ children }) {
    const [credits, setCredits] = useState([]);

    useEffect(() => {
        fetchCredits();
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
            const creditToSave = {
                ...newCredit,
                selicHistory: [], // Will be populated by service
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
            const { data, error } = await supabase
                .from('credits')
                .update(updatedFields)
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
        <CreditsContext.Provider value={{ credits, addCredit, removeCredit, updateCredit }}>
            {children}
        </CreditsContext.Provider>
    );
}

export function useCredits() {
    return useContext(CreditsContext);
}
