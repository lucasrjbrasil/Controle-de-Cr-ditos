/**
 * Application constants
 */

// Loan types
export const LOAN_TYPES = {
    FIXED: 'fixed',
    VARIABLE: 'variable',
};

// Compounding frequencies
export const COMPOUNDING_FREQUENCIES = {
    DAILY: 'daily',
    MONTHLY: 'monthly',
    ANNUAL: 'annual',
    AT_MATURITY: 'at_maturity',
};

export const COMPOUNDING_FREQUENCY_LABELS = {
    [COMPOUNDING_FREQUENCIES.DAILY]: 'Diária',
    [COMPOUNDING_FREQUENCIES.MONTHLY]: 'Mensal',
    [COMPOUNDING_FREQUENCIES.ANNUAL]: 'Anual',
    [COMPOUNDING_FREQUENCIES.AT_MATURITY]: 'No Vencimento',
};

// Payment types
export const PAYMENT_TYPES = {
    PRINCIPAL: 'principal',
    INTEREST: 'interest',
    BOTH: 'both',
};

export const PAYMENT_TYPE_LABELS = {
    [PAYMENT_TYPES.PRINCIPAL]: 'Principal',
    [PAYMENT_TYPES.INTEREST]: 'Juros',
    [PAYMENT_TYPES.BOTH]: 'Principal + Juros',
};

// Currencies
export const CURRENCIES = {
    BRL: 'BRL',
    USD: 'USD',
    EUR: 'EUR',
};

// Date formats
export const DATE_FORMATS = {
    DISPLAY: 'dd/MM/yyyy',
    ISO: 'yyyy-MM-dd',
    MONTH_YEAR: 'MM/yyyy',
};

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// Toast durations (ms)
export const TOAST_DURATION = {
    SHORT: 2000,
    MEDIUM: 4000,
    LONG: 6000,
};

// Local storage keys
export const STORAGE_KEYS = {
    THEME: 'irko-theme',
    USER_PREFERENCES: 'irko-user-preferences',
    COLUMN_WIDTHS: 'irko-column-widths',
};

// API endpoints - BCB URLs are managed in bcbService.js

// Validation limits
export const VALIDATION_LIMITS = {
    MIN_PASSWORD_LENGTH: 6,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MIN_INTEREST_RATE: 0,
    MAX_INTEREST_RATE: 100,
};
