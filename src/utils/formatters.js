export const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(Number(value))) {
        return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const formatPercentage = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value / 100);
};

export const parseCurrency = (value) => {
    if (typeof value === 'number') return value;
    return Number(value.replace(/[^0-9,-]+/g, "").replace(",", "."));
};
