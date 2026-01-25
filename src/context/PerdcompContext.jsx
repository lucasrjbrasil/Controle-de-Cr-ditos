import React, { createContext, useContext, useState, useEffect } from 'react';

const PerdcompContext = createContext();

export function PerdcompProvider({ children }) {
    const [perdcomps, setPerdcomps] = useState(() => {
        const saved = localStorage.getItem('perdcomps_data');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('perdcomps_data', JSON.stringify(perdcomps));
    }, [perdcomps]);

    const addPerdcomp = (perdcomp) => {
        setPerdcomps(prev => [...prev, { ...perdcomp, id: Date.now() }]);
    };

    const updatePerdcomp = (id, updatedData) => {
        setPerdcomps(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
    };

    const removePerdcomp = (id) => {
        setPerdcomps(prev => prev.filter(p => p.id !== id));
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
