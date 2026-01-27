
// Script de verificação para as mudanças no bcbService.js
// Testa a integração com as APIs Olinda e SGS do Banco Central.

import { bcbService, COMMON_CODES } from './src/services/bcbService.js';

async function testCurrency(symbol) {
    console.log(`\n--- Testando Moeda: ${symbol} ---`);
    try {
        const start = '01/01/2026';
        const end = '25/01/2026';
        console.log(`Buscando intervalo de ${start} até ${end}...`);

        const history = await bcbService.fetchExchangeRatesForRange(start, end, symbol);

        if (history && history.length > 0) {
            console.log(`✅ Sucesso! ${history.length} registros encontrados.`);
            console.log(`Primeiro registro: ${JSON.stringify(history[0])}`);
            console.log(`Fonte: ${history[0].source}`);

            // Verificar se os valores de Compra e Venda estão presentes
            const hasBoth = history.every(r => r.valor.buy && r.valor.sell);
            if (hasBoth) {
                console.log("✅ Todas as taxas possuem Compra e Venda.");
            } else {
                console.log("⚠️ Alguns registros possuem apenas Compra ou Venda.");
            }
        } else {
            console.log("❌ Nenhum registro encontrado para este período.");
        }
    } catch (error) {
        console.error(`❌ Erro crítico ao testar ${symbol}:`, error.message);
    }
}

async function runTests() {
    console.log("Iniciando Verificação de Taxas Cambiais...");

    // Testar HKD (Dólar de Hong Kong) que era o problema principal
    await testCurrency('HKD');

    // Testar USD (Dólar Americano) para garantir que não quebrou o básico
    await testCurrency('USD');

    // Testar uma moeda que use cache
    console.log("\n--- Testando Cache ---");
    await testCurrency('USD');

    console.log("\nVerificação concluída.");
}

// Nota: Como este script roda em Node, ele pode ter problemas com 'fetch' 
// se a versão do Node for antiga, mas o bcbService é modular.
runTests();
