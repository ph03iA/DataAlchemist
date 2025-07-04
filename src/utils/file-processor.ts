import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataRow, DataSheet, FileUploadProgress } from '@/types';

export class FileProcessor {
  static async processFile(
    file: File,
    type: 'clients' | 'workers' | 'tasks',
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<DataSheet> {
    const startTime = Date.now();
    
    try {
      onProgress?.({
        fileName: file.name,
        progress: 10,
        status: 'processing'
      });

      let rawData: any[][];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        rawData = await this.processCSV(file, onProgress);
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        rawData = await this.processExcel(file, onProgress);
      } else {
        throw new Error('Unsupported file format');
      }

      onProgress?.({
        fileName: file.name,
        progress: 80,
        status: 'processing'
      });

      const dataRows = this.convertToDataRows(rawData);
      
      if (dataRows.length === 0) {
        throw new Error('No data found in the file');
      }

      // Extract column names from the first row (excluding the 'id' field)
      const columns = dataRows.length > 0 ? Object.keys(dataRows[0]).filter(key => key !== 'id') : [];

      onProgress?.({
        fileName: file.name,
        progress: 100,
        status: 'complete'
      });

      const endTime = Date.now();
      
      return {
        id: `${type}-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        type,
        data: dataRows,
        columns,
        validationErrors: [],
        validationSummary: {
          totalErrors: 0,
          totalWarnings: 0,
          totalInfo: 0,
          passedValidations: [],
          failedValidations: [],
          validationsPassed: true,
          lastRun: new Date(),
          errors: []
        },
        lastModified: new Date()
      };
    } catch (error) {
      onProgress?.({
        fileName: file.name,
        progress: 0,
        status: 'error'
      });
      throw error;
    }
  }

  private static async processCSV(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      // First attempt with strict parsing
      Papa.parse(file as any, {
        header: true,
        skipEmptyLines: true,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ',',
        newline: '\n',
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
        complete: (results) => {
          // Check for critical errors (not warnings)
          const criticalErrors = results.errors.filter(error => 
            error.type === 'Delimiter' || 
            error.type === 'FieldMismatch' ||
            (error.type === 'Quotes' && !error.message.includes('Trailing quote'))
          );
          
          if (criticalErrors.length > 0) {
            console.log('Critical CSV errors found, trying fallback parsing:', criticalErrors);
            this.processCSVFallback(file, onProgress).then(resolve).catch(reject);
          } else {
            // Log non-critical errors as warnings
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings (non-critical):', results.errors);
            }
            
            onProgress?.({
              fileName: file.name,
              progress: 60,
              status: 'processing'
            });
            resolve(results.data as any[][]);
          }
        },
        error: (error: Error) => {
          console.log('CSV parsing failed, trying fallback parsing:', error.message);
          this.processCSVFallback(file, onProgress).then(resolve).catch(reject);
        }
      });
    });
  }

  private static async processCSVFallback(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      console.log('Using fallback CSV parsing with relaxed settings...');
      
      Papa.parse(file as any, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header: string) => header.trim().replace(/['"]/g, ''), // Remove quotes from headers
        transform: (value: string) => {
          // Clean up values - remove surrounding quotes and trim
          return value.trim().replace(/^["']|["']$/g, '');
        },
        complete: (results) => {
          console.log('Fallback CSV parsing completed');
          
          // Log any remaining errors as warnings only
          if (results.errors.length > 0) {
            console.warn('CSV fallback parsing warnings:', results.errors);
          }
          
          // Filter out empty rows
          const cleanData = (results.data as any[]).filter(row => {
            return Object.values(row).some(value => 
              value !== null && value !== undefined && String(value).trim() !== ''
            );
          });
          
          onProgress?.({
            fileName: file.name,
            progress: 60,
            status: 'processing'
          });
          
          if (cleanData.length === 0) {
            reject(new Error('No valid data found in CSV file after cleanup'));
          } else {
            console.log(`Successfully parsed ${cleanData.length} rows from CSV`);
            resolve(cleanData);
          }
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing failed completely: ${error.message}. Please check your CSV file format.`));
        }
      });
    });
  }

  private static async processExcel(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          onProgress?.({
            fileName: file.name,
            progress: 60,
            status: 'processing'
          });

          // Convert array of arrays to array of objects
          if (jsonData.length > 0) {
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];
            const objectData = rows.map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });
            resolve(objectData);
          } else {
            resolve([]);
          }
        } catch (error) {
          reject(new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('File reading error'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private static convertToDataRows(data: any[]): DataRow[] {
    return data.map((row, index) => ({
      id: `row-${index}`,
      ...row
    }));
  }

  static exportToCSV(data: DataRow[], filename: string): void {
    if (typeof window === 'undefined') {
      console.warn('Export function called in server environment');
      return;
    }
    
    const cleanData = data.map(({ id, ...rest }) => rest);
    const csv = Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  static exportToExcel(data: DataRow[], filename: string): void {
    if (typeof window === 'undefined') {
      console.warn('Export function called in server environment');
      return;
    }
    
    const cleanData = data.map(({ id, ...rest }) => rest);
    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, filename);
  }

  static validateFileSize(file: File, maxSizeMB: number = 10): boolean {
    return file.size <= maxSizeMB * 1024 * 1024;
  }

  static validateFileType(file: File): boolean {
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    return allowedTypes.includes(file.type) || 
           file.name.toLowerCase().endsWith('.csv') ||
           file.name.toLowerCase().endsWith('.xlsx') ||
           file.name.toLowerCase().endsWith('.xls');
  }
} 