import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const PerdcompContext = createContext();

export function PerdcompProvider({ children }) {
    const [perdcomps, setPerdcomps] = useState([]);

    useEffect(() => {
        fetchPerdcomps();
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
            const { data, error } = await supabase
                .from('perdcomps')
                .insert([perdcomp])
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
            const { data, error } = await supabase
                .from('perdcomps')
                .update(updatedData)
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
        <PerdcompContext.Provider value={{ perdcomps, addPerdcomp, updatePerdcomp, removePerdcomp, getPerdcompsByCreditId }}>
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
