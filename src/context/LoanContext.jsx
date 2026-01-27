import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const LoanContext = createContext();

export function LoanProvider({ children }) {
    const [loans, setLoans] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        try {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .order('createdAt', { ascending: false });

            if (error) throw error;
            // Ensure payments is initialized
            const sanitizedLoans = data ? data.map(l => ({ ...l, payments: l.payments || [] })) : [];
            setLoans(sanitizedLoans);
        } catch (error) {
            console.error('Error fetching loans:', error);
        }
    };

    const addLoan = async (newLoan) => {
        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const loanToSave = {
                ...newLoan,
                payments: [],
                modified_by: userName,
                modified_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('loans')
                .insert([loanToSave])
                .select()
                .single();

            if (error) throw error;
            setLoans((prev) => [...prev, data]);
        } catch (error) {
            console.error('Error adding loan:', error);
            throw error;
        }
    };

    const removeLoan = async (id) => {
        try {
            const { error } = await supabase
                .from('loans')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setLoans((prev) => prev.filter((l) => l.id !== id));
        } catch (error) {
            console.error('Error removing loan:', error);
            throw error;
        }
    };

    const updateLoan = async (id, updatedFields) => {
        try {
            const userName = user?.user_metadata?.full_name || user?.email || 'Usuário Desconhecido';
            const fieldsWithModification = {
                ...updatedFields,
                modified_by: userName,
                modified_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('loans')
                .update(fieldsWithModification)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setLoans((prev) =>
                prev.map((l) => (l.id === id ? { ...l, ...data } : l))
            );
        } catch (error) {
            console.error('Error updating loan:', error);
            throw error;
        }
    };

    const addPayment = async (loanId, payment) => {
        try {
            const loan = loans.find(l => l.id === loanId);
            if (!loan) throw new Error('Loan not found');

            const newPayment = {
                ...payment,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
            };

            const updatedPayments = [...(loan.payments || []), newPayment];

            const { error } = await supabase
                .from('loans')
                .update({ payments: updatedPayments })
                .eq('id', loanId);

            if (error) throw error;

            setLoans((prev) =>
                prev.map((l) => {
                    if (l.id === loanId) {
                        return { ...l, payments: updatedPayments };
                    }
                    return l;
                })
            );
        } catch (error) {
            console.error('Error adding payment:', error);
            throw error;
        }
    };

    const removePayment = async (loanId, paymentId) => {
        try {
            const loan = loans.find(l => l.id === loanId);
            if (!loan) return;

            const updatedPayments = loan.payments.filter((p) => p.id !== paymentId);

            const { error } = await supabase
                .from('loans')
                .update({ payments: updatedPayments })
                .eq('id', loanId);

            if (error) throw error;

            setLoans((prev) =>
                prev.map((l) => {
                    if (l.id === loanId) {
                        return { ...l, payments: updatedPayments };
                    }
                    return l;
                })
            );
        } catch (error) {
            console.error('Error removing payment:', error);
            throw error;
        }
    };

    const updatePayment = async (loanId, paymentId, updatedFields) => {
        try {
            const loan = loans.find(l => l.id === loanId);
            if (!loan) return;

            const updatedPayments = loan.payments.map((p) =>
                p.id === paymentId ? { ...p, ...updatedFields } : p
            );

            const { error } = await supabase
                .from('loans')
                .update({ payments: updatedPayments })
                .eq('id', loanId);

            if (error) throw error;

            setLoans((prev) =>
                prev.map((l) => {
                    if (l.id === loanId) {
                        return { ...l, payments: updatedPayments };
                    }
                    return l;
                })
            );
        } catch (error) {
            console.error('Error updating payment:', error);
            throw error;
        }
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
