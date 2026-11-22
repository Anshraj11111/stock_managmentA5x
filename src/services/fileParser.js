import ExcelJS from 'exceljs';
import csv from 'csv-parser';
import { Readable } from 'stream';

/**
 * Parse CSV file
 */
export const parseCSV = async (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        const headers = Object.keys(results[0]);
        const rows = results.map(row => headers.map(h => row[h]));

        resolve({ headers, rows, totalRows: rows.length });
      })
      .on('error', (error) => reject(error));
  });
};

/**
 * Parse Excel file (XLS/XLSX) using ExcelJS (replaces vulnerable xlsx/SheetJS)
 */
export const parseExcel = async (buffer) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Get first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel file is empty or has no sheets');
    }

    const jsonData = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        // Handle different cell value types safely
        let val = cell.value;
        if (val && typeof val === 'object') {
          // RichText, formula result, hyperlink etc.
          val = val.result ?? val.text ?? val.toString();
        }
        rowData.push(val !== undefined && val !== null ? String(val).trim() : '');
      });
      jsonData.push(rowData);
    });

    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    const headers = jsonData[0];
    const rows = jsonData.slice(1).filter(row =>
      row.some(cell => cell !== undefined && cell !== null && cell !== '')
    );

    return { headers, rows, totalRows: rows.length };
  } catch (error) {
    console.error('❌ Excel parsing error:', error.message);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse PDF — not supported, guide user to convert first
 */
export const parsePDF = async (_buffer) => {
  throw new Error(
    'PDF parsing is not supported. Please:\n' +
    '1. Open your PDF file\n' +
    '2. Copy the product table\n' +
    '3. Paste into Excel or Google Sheets\n' +
    '4. Save as .xlsx or .csv\n' +
    '5. Upload that file here'
  );
};

/**
 * Main parser — detects file type and delegates
 */
export const parseFile = async (file) => {
  const { buffer, mimetype, originalname } = file;

  let result;

  if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
    result = await parseCSV(buffer);
    result.fileType = 'CSV';
  } else if (
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    originalname.endsWith('.xlsx') ||
    originalname.endsWith('.xls')
  ) {
    result = await parseExcel(buffer);
    result.fileType = 'Excel';
  } else if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
    await parsePDF(buffer);
  } else {
    throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
  }

  result.fileName = originalname;
  return result;
};
