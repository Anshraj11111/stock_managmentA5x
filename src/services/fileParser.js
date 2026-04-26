import xlsx from 'xlsx';
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

        // Convert object array to 2D array
        const headers = Object.keys(results[0]);
        const rows = results.map(row => headers.map(h => row[h]));

        resolve({
          headers,
          rows,
          totalRows: rows.length
        });
      })
      .on('error', (error) => reject(error));
  });
};

/**
 * Parse Excel file (XLS/XLSX)
 */
export const parseExcel = async (buffer) => {
  try {
    console.log('📊 Parsing Excel file, buffer size:', buffer.length);
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    console.log('📄 Workbook sheets:', workbook.SheetNames);
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log('📋 JSON data rows:', jsonData.length);
    console.log('📋 First row (headers):', jsonData[0]);

    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    // First row is headers
    const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
    const rows = jsonData.slice(1).filter(row => 
      row.some(cell => cell !== undefined && cell !== null && cell !== '')
    );

    console.log('✅ Parsed headers:', headers);
    console.log('✅ Total data rows:', rows.length);

    return {
      headers,
      rows,
      totalRows: rows.length
    };
  } catch (error) {
    console.error('❌ Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse PDF file - Simple text extraction
 * Note: For best results, convert PDF to Excel/CSV before uploading
 */
export const parsePDF = async (buffer) => {
  try {
    // For now, we'll provide a helpful error message
    // PDF parsing in Node.js is complex and requires additional setup
    throw new Error(
      'PDF parsing requires additional setup. For best results, please:\n' +
      '1. Open your PDF file\n' +
      '2. Copy the product table\n' +
      '3. Paste into Excel or Google Sheets\n' +
      '4. Save as Excel (.xlsx) or CSV file\n' +
      '5. Upload the Excel/CSV file here\n\n' +
      'This ensures accurate data import with proper column detection.'
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Main parser function - detects file type and parses accordingly
 */
export const parseFile = async (file) => {
  const { buffer, mimetype, originalname } = file;

  try {
    let result;

    // Detect file type
    if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
      result = await parseCSV(buffer);
      result.fileType = 'CSV';
    } 
    else if (
      mimetype === 'application/vnd.ms-excel' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      originalname.endsWith('.xlsx') ||
      originalname.endsWith('.xls')
    ) {
      result = await parseExcel(buffer);
      result.fileType = 'Excel';
    } 
    else if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      result = await parsePDF(buffer);
      result.fileType = 'PDF';
    } 
    else {
      throw new Error('Unsupported file type. Please upload CSV or Excel file.');
    }

    result.fileName = originalname;
    return result;

  } catch (error) {
    throw new Error(`File parsing failed: ${error.message}`);
  }
};
