import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const InstallmentContext = createContext();

export function InstallmentProvider({ children }) {
    const [installments, setInstallments] = useState([]);
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchInstallments();
        }
    }, [user]);

    const fetchInstallments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('installments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setInstallments(data);
        } catch (error) {
            console.error('Error fetching installments:', error);
        } finally {
            setLoading(false);
        }
    };

    const addInstallment = async (installment) => {
        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const itemToSave = {
                ...installment,
                modified_by: userName,
                modified_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('installments')
                .insert([itemToSave])
                .select()
                .single();

            if (error) throw error;
            setInstallments(prev => [data, ...prev]);
            return data;
        } catch (error) {
            console.error('Error adding installment:', error);
            throw error;
        }
    };

    const updateInstallment = async (id, updatedData) => {
        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const fieldsWithModification = {
                ...updatedData,
                modified_by: userName,
                modified_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('installments')
                .update(fieldsWithModification)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setInstallments(prev => prev.map(p => p.id === id ? data : p));
            return data;
        } catch (error) {
            console.error('Error updating installment:', error);
            throw error;
        }
    };

    const removeInstallment = async (id) => {
        try {
            const { error } = await supabase
                .from('installments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setInstallments(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error removing installment:', error);
            throw error;
        }
    };

    return (
        <InstallmentContext.Provider value={{
            installments,
            loading,
            fetchInstallments,
            addInstallment,
            updateInstallment,
            removeInstallment
        }}>
            {children}
        </InstallmentContext.Provider>
    );
}

export function useInstallment() {
    const context = useContext(InstallmentContext);
    if (!context) {
        throw new Error('useInstallment must be used within a InstallmentProvider');
    }
    return context;
}
