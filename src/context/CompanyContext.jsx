import React, { createContext, useContext, useState, useEffect } from 'react';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
    const [companies, setCompanies] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem('companies');
            return stored ? JSON.parse(stored) : [];
        }
        return [];
    });

    // Persist companies when they change
    useEffect(() => {
        localStorage.setItem('companies', JSON.stringify(companies));
    }, [companies]);

    const addCompany = (newCompany) => {
        // Basic duplicate check by CNPJ
        if (companies.some(c => c.cnpj === newCompany.cnpj)) {
            throw new Error('Empresa com este CNPJ já está cadastrada!');
        }

        const companyWithId = {
            ...newCompany,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        setCompanies((prev) => [...prev, companyWithId]);
        return companyWithId;
    };

    const removeCompany = (id) => {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
    };

    const updateCompany = (id, updatedFields) => {
        setCompanies((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updatedFields } : c))
        );
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
