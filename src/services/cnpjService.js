/**
 * Service to fetch company data from BrasilAPI
 * https://brasilapi.com.br/docs#cnpj
 */

export const cnpjService = {
    /**
     * Fetches company data by CNPJ
     * @param {string} cnpj - The CNPJ to search for (numbers only or formatted)
     * @param {number} [timeout=10000] - Request timeout in milliseconds (default: 10s)
     * @returns {Promise<Object>} - The company data
     * @throws {Error} If CNPJ is invalid, not found, or request fails
     */
    async fetchByCnpj(cnpj, timeout = 10000) {
        // Remove non-numeric characters
        const cleanCnpj = cnpj.replace(/\D/g, '');

        if (cleanCnpj.length !== 14) {
            throw new Error('CNPJ deve ter 14 dígitos.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
                signal: controller.signal
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('CNPJ não encontrado.');
                }
                if (response.status === 429) {
                    throw new Error('Muitas requisições. Tente novamente em alguns instantes.');
                }
                throw new Error('Erro ao consultar CNPJ.');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('A consulta demorou muito para responder. Tente novamente.');
            }
            console.error('Erro na consulta de CNPJ:', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
};
