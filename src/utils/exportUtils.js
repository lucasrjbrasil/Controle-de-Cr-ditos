import ExcelJS from 'exceljs';
import { formatCNPJ } from './formatters';

const addSheetToWorkbook = (workbook, sheetName, data, metadata = null) => {
    if (!data || data.length === 0) return;

    const worksheet = workbook.addWorksheet(sheetName);

    // Determines start row for the table
    let startRow = 1;
    if (metadata) {
        startRow = 10; // Leave space for metadata (rows 1-9)
    }

    // Extract headers from the first object, excluding internal keys
    const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));

    // Define columns (keys only, no auto-header)
    worksheet.columns = headers.map(header => ({
        key: header,
        width: 20
    }));

    // --- METADATA SECTION ---
    if (metadata || (data.length > 0 && data[0]._metadata)) { // Support metadata passed in data or arg
        const meta = metadata || data[0]._metadata;
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = meta.title || 'RELATÓRIO';
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

        let fields = [];

        // custom headerInfo array support
        if (meta.headerInfo) {
            fields = meta.headerInfo.map((info, idx) => ({
                label: info.label,
                value: info.value,
                row: 3 + idx
            }));
        } else {
            // Legacy support
            fields = [
                { label: 'Empresa:', value: meta.empresa, row: 3 },
                { label: 'CNPJ:', value: formatCNPJ(meta.cnpj), row: 4 },
                { label: 'Código Interno:', value: meta.codigoInterno, row: 5 },
                { label: 'Pedido de Restituição:', value: meta.pedidoRestituicao, row: 6 },
                { label: 'PA do Crédito:', value: meta.dataArrecadacao, row: 7 },
                { label: 'Tipo de Crédito:', value: meta.tipoCredito, row: 8 },
                { label: 'Data de Geração:', value: new Date().toLocaleString('pt-BR'), row: 3, colOffset: 4 }
            ];
        }

        fields.forEach(field => {
            const labelCell = worksheet.getCell(field.row, field.colOffset ? 1 + field.colOffset : 1);
            labelCell.value = field.label;
            labelCell.font = { bold: true };

            const valueCell = worksheet.getCell(field.row, field.colOffset ? 2 + field.colOffset : 2);
            valueCell.value = field.value;
            valueCell.alignment = { horizontal: 'left' };
        });
    }

    // --- TABLE HEADER ---
    const headerRow = worksheet.getRow(startRow);
    headerRow.values = headers;
    headerRow.font = {
        name: 'Arial',
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
    };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
    };
    headerRow.alignment = {
        vertical: 'middle',
        horizontal: 'center'
    };
    headerRow.height = 30;

    // --- DATA ROWS ---
    data.forEach(item => {
        worksheet.addRow(item);
    });

    // --- STYLING ---
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > startRow) {
            row.eachCell((cell, colNumber) => {
                // Borders
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };

                // Zebra striping
                if ((rowNumber - startRow) % 2 === 0) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' }
                    };
                }

                // Formatting
                const value = cell.value;
                const header = headers[colNumber - 1];

                if (typeof value === 'number') {
                    if (header.includes('%') || header.toLowerCase().includes('taxa') || header.toLowerCase().includes('rate')) {
                        cell.numFmt = '0.00%';
                    } else if (
                        header.toLowerCase().includes('valor') ||
                        header.toLowerCase().includes('saldo') ||
                        header.toLowerCase().includes('principal') ||
                        header.toLowerCase().includes('juros') ||
                        header.toLowerCase().includes('multa') ||
                        header.toLowerCase().includes('total') ||
                        header.toLowerCase().includes('atualização')
                    ) {
                        cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
                    } else {
                        cell.numFmt = '#,##0.00';
                    }
                    cell.alignment = { horizontal: 'right' };
                } else if (value instanceof Date) {
                    cell.numFmt = 'dd/mm/yyyy';
                    cell.alignment = { horizontal: 'center' };
                } else {
                    cell.alignment = { horizontal: 'left' };
                }
            });
        }
    });

    // Auto-adjust widths
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, function (cell) {
            const v = cell.value;
            let columnLength = v ? v.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
    });
};

export const exportToExcel = async (data, filename = 'export.xlsx', metadata = null, additionalSheets = []) => {
    const hasMainData = data && data.length > 0;
    const hasAdditionalSheets = additionalSheets && additionalSheets.length > 0;

    if (!hasMainData && !hasAdditionalSheets) {
        alert("Nenhum dado para exportar.");
        return;
    }

    const workbook = new ExcelJS.Workbook();

    // Main Sheet
    if (hasMainData) {
        addSheetToWorkbook(workbook, 'Dados', data, metadata);
    }

    // Additional Sheets
    if (additionalSheets && additionalSheets.length > 0) {
        additionalSheets.forEach(sheet => {
            // Pass sheet-specific metadata if available, otherwise fallback to main metadata
            addSheetToWorkbook(workbook, sheet.name, sheet.data, sheet.metadata || metadata);
        });
    }

    // Write & Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};
