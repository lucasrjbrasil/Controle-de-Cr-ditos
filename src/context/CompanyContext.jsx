import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
    const [companies, setCompanies] = useState([]);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');

            if (error) throw error;
            if (data) setCompanies(data);
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const addCompany = async (newCompany) => {
        // Basic duplicate check by CNPJ (Optimistic check, DB also has unique constraint)
        // Ensure we compare numbers only
        const newCnpjClean = newCompany.cnpj.replace(/\D/g, '');

        if (companies.some(c => c.cnpj.replace(/\D/g, '') === newCnpjClean)) {
            throw new Error('Empresa com este CNPJ já está cadastrada!');
        }

        try {
            const companyToSave = {
                ...newCompany,
                cnpj: newCnpjClean, // Ensure strict number format
            };

            const { data, error } = await supabase
                .from('companies')
                .insert([companyToSave])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Postgres unique_violation
                    throw new Error('Empresa com este CNPJ já está cadastrada!');
                }
                throw error;
            }

            setCompanies((prev) => [...prev, data]);
            return data;
        } catch (error) {
            console.error('Error adding company:', error);
            throw error;
        }
    };

    const removeCompany = async (id) => {
        try {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCompanies((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
            console.error('Error deleting company:', error);
            throw error;
        }
    };

    const updateCompany = async (id, updatedFields) => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .update(updatedFields)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setCompanies((prev) =>
                prev.map((c) => (c.id === id ? data : c))
            );
        } catch (error) {
            console.error('Error updating company:', error);
            throw error;
        }
    };

    return (
        <CompanyContext.Provider value={{ companies, addCompany, removeCompany, updateCompany }}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompanies() {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompanies must be used within a CompanyProvider');
    }
    return context;
}
