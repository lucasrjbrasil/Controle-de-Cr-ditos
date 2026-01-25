import React, { createContext, useContext, useState, useEffect } from 'react';

const LoanContext = createContext();

export function LoanProvider({ children }) {
    const [loans, setLoans] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem('loans');
            try {
                const parsed = stored ? JSON.parse(stored) : [];
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    });

    // Persist loans when they change
    useEffect(() => {
        localStorage.setItem('loans', JSON.stringify(loans));
    }, [loans]);

    const addLoan = (newLoan) => {
        const loanWithId = {
            ...newLoan,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            payments: [],
        };
        setLoans((prev) => [...prev, loanWithId]);
    };

    const removeLoan = (id) => {
        setLoans((prev) => prev.filter((l) => l.id !== id));
    };

    const updateLoan = (id, updatedFields) => {
        setLoans((prev) =>
            prev.map((l) => (l.id === id ? { ...l, ...updatedFields } : l))
        );
    };

    const addPayment = (loanId, payment) => {
        setLoans((prev) =>
            prev.map((l) => {
                if (l.id === loanId) {
                    const newPayment = {
                        ...payment,
                        id: crypto.randomUUID(),
                        createdAt: new Date().toISOString(),
                    };
                    return { ...l, payments: [...(l.payments || []), newPayment] };
                }
                return l;
            })
        );
    };

    const removePayment = (loanId, paymentId) => {
        setLoans((prev) =>
            prev.map((l) => {
                if (l.id === loanId) {
                    return { ...l, payments: l.payments.filter((p) => p.id !== paymentId) };
                }
                return l;
            })
        );
    };

    const updatePayment = (loanId, paymentId, updatedFields) => {
        setLoans((prev) =>
            prev.map((l) => {
                if (l.id === loanId) {
                    return {
                        ...l,
                        payments: l.payments.map((p) =>
                            p.id === paymentId ? { ...p, ...updatedFields } : p
                        ),
                    };
                }
                return l;
            })
        );
    };

    return (
        <LoanContext.Provider value={{ loans, addLoan, removeLoan, updateLoan, addPayment, removePayment, updatePayment }}>
            {children}
        </LoanContext.Provider>
    );
}

export function useLoans() {
    return useContext(LoanContext);
}
