import { utils, writeFile } from 'xlsx';

export const exportToExcel = (data, filename = 'export.xlsx') => {
    // Create a new workbook
    const wb = utils.book_new();

    // Create a worksheet from data
    const ws = utils.json_to_sheet(data);

    // Add worksheet to workbook
    utils.book_append_sheet(wb, ws, "Sheet1");

    // Write file
    writeFile(wb, filename);
};
