import React, { createContext, useContext, useState, useEffect } from 'react';

const CreditsContext = createContext();

export function CreditsProvider({ children }) {
    const [credits, setCredits] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem('credits');
            return stored ? JSON.parse(stored) : [];
        }
        return [];
    });

    // Persist credits when they change
    useEffect(() => {
        localStorage.setItem('credits', JSON.stringify(credits));
    }, [credits]);

    const addCredit = (newCredit) => {
        // Integrity Hash Check
        if (credits.some(c => c.integrityHash === newCredit.integrityHash)) {
            throw new Error('Crédito duplicado detectado! (Empresa + PA + Código + Valor já existem)');
        }

        const creditWithId = {
            ...newCredit,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            selicHistory: [], // Will be populated by service
        };
        setCredits((prev) => [...prev, creditWithId]);
    };

    const removeCredit = (id) => {
        setCredits((prev) => prev.filter((c) => c.id !== id));
    };

    const updateCredit = (id, updatedFields) => {
        setCredits((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updatedFields } : c))
        );
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
