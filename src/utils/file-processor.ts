import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataRow, DataSheet, FileUploadProgress } from '@/types';

export class FileProcessor {
  static async processFile(
    file: File,
    type: 'clients' | 'workers' | 'tasks',
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<DataSheet> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      throw new Error('Unsupported file format. Please upload CSV or XLSX files.');
    }

    onProgress?.({
      fileName: file.name,
      progress: 10,
      status: 'processing'
    });

    try {
      let data: any[][] = [];
      
      if (fileExtension === 'csv') {
        data = await this.processCSV(file, onProgress);
      } else {
        data = await this.processExcel(file, onProgress);
      }

      onProgress?.({
        fileName: file.name,
        progress: 80,
        status: 'processing'
      });

      const processedData = this.convertToDataRows(data);
      const columns = data.length > 0 ? Object.keys(processedData[0]).filter(key => key !== 'id') : [];

      onProgress?.({
        fileName: file.name,
        progress: 100,
        status: 'complete'
      });

      return {
        id: Date.now().toString(),
        name: file.name,
        type,
        data: processedData,
        columns,
        validationErrors: [],
        lastModified: new Date()
      };
    } catch (error) {
      onProgress?.({
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processCSV(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          } else {
            onProgress?.({
              fileName: file.name,
              progress: 60,
              status: 'processing'
            });
            resolve(results.data as any[][]);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
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