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

export const formatCurrencyByCode = (value, currencyCode = 'BRL') => {
    if (value === undefined || value === null || isNaN(Number(value))) {
        return `${currencyCode === 'BRL' ? 'R$' : currencyCode} 0,00`;
    }
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currencyCode,
        }).format(value);
    } catch (e) {
        // Fallback for invalid currency codes
        return `${currencyCode} ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value)}`;
    }
};

/**
 * Formats a CNPJ string to the pattern XX.XXX.XXX/XXXX-XX
 * @param {string} cnpj - CNPJ with or without formatting
 * @returns {string} Formatted CNPJ
 */
export const formatCNPJ = (cnpj) => {
    if (!cnpj) return '';

    // Remove all non-numeric characters
    const cleaned = cnpj.toString().replace(/\D/g, '');

    // If not 14 digits, return as is
    if (cleaned.length !== 14) return cnpj;

    // Format: XX.XXX.XXX/XXXX-XX
    return cleaned.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    );
};

/**
 * Formats a number with Brazilian locale (comma for decimal, period for thousands)
 * @param {number|string} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number
 */
export const formatNumber = (value, decimals = 2) => {
    if (value === undefined || value === null || isNaN(Number(value))) {
        return '0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};
