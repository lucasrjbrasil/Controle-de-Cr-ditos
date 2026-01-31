/**
 * Validation utilities for form inputs
 * @module validationUtils
 */

/**
 * Sanitizes a string to prevent XSS attacks
 * Removes script tags, event handlers, and dangerous HTML
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized string
 */
export const sanitize = (value) => {
    if (typeof value !== 'string') return value;
    return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, 'data-blocked:')
        .trim();
};

/**
 * Validates password strength
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 * @param {string} password - Password to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password) => {
    const errors = [];

    if (!password || password.length < 8) {
        errors.push('Mínimo de 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Pelo menos 1 letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Pelo menos 1 letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Pelo menos 1 número');
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password)) {
        errors.push('Pelo menos 1 caractere especial (!@#$%...)');
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength: errors.length === 0 ? 'strong' : errors.length <= 2 ? 'medium' : 'weak'
    };
};

/**
 * Validates Brazilian CNPJ using official algorithm
 * @param {string} cnpj - CNPJ to validate (with or without formatting)
 * @returns {boolean} True if valid CNPJ
 */
export const isValidCNPJ = (cnpj) => {
    if (!cnpj) return false;

    // Remove non-numeric characters
    const cleaned = cnpj.replace(/\D/g, '');

    // Must have exactly 14 digits
    if (cleaned.length !== 14) return false;

    // Reject known invalid patterns
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validate check digits
    const calcDigit = (base, weights) => {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) {
            sum += parseInt(base[i]) * weights[i];
        }
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const digit1 = calcDigit(cleaned.slice(0, 12), weights1);
    const digit2 = calcDigit(cleaned.slice(0, 12) + digit1, weights2);

    return cleaned.endsWith(`${digit1}${digit2}`);
};

/**
 * Validates if a value is not empty
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid
 */
export const required = (value) => {
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    return value !== null && value !== undefined && value !== '';
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates minimum length
 * @param {string} value - Value to validate
 * @param {number} min - Minimum length
 * @returns {boolean} True if valid
 */
export const minLength = (value, min) => {
    return value && value.length >= min;
};

/**
 * Validates maximum length
 * @param {string} value - Value to validate
 * @param {number} max - Maximum length
 * @returns {boolean} True if valid
 */
export const maxLength = (value, max) => {
    return value && value.length <= max;
};

/**
 * Validates if value is numeric
 * @param {any} value - Value to validate
 * @returns {boolean} True if numeric
 */
export const isNumeric = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Validates if value is a valid date
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
export const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

/**
 * Validates if value is positive number
 * @param {number} value - Value to validate
 * @returns {boolean} True if positive
 */
export const isPositive = (value) => {
    return isNumeric(value) && parseFloat(value) > 0;
};

/**
 * Validates if value is within range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if within range
 */
export const inRange = (value, min, max) => {
    const num = parseFloat(value);
    return isNumeric(value) && num >= min && num <= max;
};

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
    REQUIRED: 'Este campo é obrigatório.',
    INVALID_EMAIL: 'Email inválido.',
    MIN_LENGTH: (min) => `Mínimo de ${min} caracteres.`,
    MAX_LENGTH: (max) => `Máximo de ${max} caracteres.`,
    INVALID_NUMBER: 'Valor numérico inválido.',
    INVALID_DATE: 'Data inválida.',
    POSITIVE_NUMBER: 'O valor deve ser positivo.',
    OUT_OF_RANGE: (min, max) => `Valor deve estar entre ${min} e ${max}.`,
};

/**
 * Validates form data against rules
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Object with errors (empty if valid)
 */
export const validateForm = (data, rules) => {
    const errors = {};

    Object.keys(rules).forEach(field => {
        const value = data[field];
        const fieldRules = rules[field];

        if (fieldRules.required && !required(value)) {
            errors[field] = ERROR_MESSAGES.REQUIRED;
            return;
        }

        if (fieldRules.email && value && !isValidEmail(value)) {
            errors[field] = ERROR_MESSAGES.INVALID_EMAIL;
            return;
        }

        if (fieldRules.minLength && value && !minLength(value, fieldRules.minLength)) {
            errors[field] = ERROR_MESSAGES.MIN_LENGTH(fieldRules.minLength);
            return;
        }

        if (fieldRules.maxLength && value && !maxLength(value, fieldRules.maxLength)) {
            errors[field] = ERROR_MESSAGES.MAX_LENGTH(fieldRules.maxLength);
            return;
        }

        if (fieldRules.numeric && value && !isNumeric(value)) {
            errors[field] = ERROR_MESSAGES.INVALID_NUMBER;
            return;
        }

        if (fieldRules.positive && value && !isPositive(value)) {
            errors[field] = ERROR_MESSAGES.POSITIVE_NUMBER;
            return;
        }

        if (fieldRules.date && value && !isValidDate(value)) {
            errors[field] = ERROR_MESSAGES.INVALID_DATE;
            return;
        }

        if (fieldRules.range && value) {
            const [min, max] = fieldRules.range;
            if (!inRange(value, min, max)) {
                errors[field] = ERROR_MESSAGES.OUT_OF_RANGE(min, max);
                return;
            }
        }

        if (fieldRules.custom && value) {
            const customError = fieldRules.custom(value, data);
            if (customError) {
                errors[field] = customError;
            }
        }
    });

    return errors;
};
