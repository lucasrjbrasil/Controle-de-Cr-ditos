import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const PerdcompContext = createContext();

export function PerdcompProvider({ children }) {
    const [perdcomps, setPerdcomps] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        fetchPerdcomps();

        // Set up realtime subscription for automatic updates
        const channel = supabase
            .channel('perdcomps-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'perdcomps' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setPerdcomps(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setPerdcomps(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
                    } else if (payload.eventType === 'DELETE') {
                        setPerdcomps(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchPerdcomps = async () => {
        try {
            const { data, error } = await supabase
                .from('perdcomps')
                .select('*')
                .order('createdAt', { ascending: false });

            if (error) throw error;
            if (data) setPerdcomps(data);
        } catch (error) {
            console.error('Error fetching perdcomps:', error);
        }
    };

    const addPerdcomp = async (perdcomp) => {
        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const perdcompToSave = {
                ...perdcomp,
                modified_by: userName,
                modified_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('perdcomps')
                .insert([perdcompToSave])
                .select()
                .single();

            if (error) throw error;
            setPerdcomps(prev => [...prev, data]);
        } catch (error) {
            console.error('Error adding perdcomp:', error);
            throw error;
        }
    };

    const updatePerdcomp = async (id, updatedData) => {
        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const fieldsWithModification = {
                ...updatedData,
                modified_by: userName,
                modified_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('perdcomps')
                .update(fieldsWithModification)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setPerdcomps(prev => prev.map(p => p.id === id ? data : p));
        } catch (error) {
            console.error('Error updating perdcomp:', error);
            throw error;
        }
    };

    const removePerdcomp = async (id) => {
        try {
            const { error } = await supabase
                .from('perdcomps')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setPerdcomps(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error removing perdcomp:', error);
            throw error;
        }
    };

    const getPerdcompsByCreditId = (creditId) => {
        return perdcomps.filter(p => p.creditId === creditId);
    };

    return (
        <PerdcompContext.Provider value={{ perdcomps, addPerdcomp, updatePerdcomp, removePerdcomp, getPerdcompsByCreditId, refreshPerdcomps: fetchPerdcomps }}>
            {children}
        </PerdcompContext.Provider>
    );
}

export function usePerdcomp() {
    const context = useContext(PerdcompContext);
    if (!context) {
        throw new Error('usePerdcomp must be used within a PerdcompProvider');
    }
    return context;
}
