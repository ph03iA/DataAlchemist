'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  TableCellsIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { DataSheet, BusinessRule, Priority, ExportData, Client, Worker, Task } from '@/types';
import { FileProcessor } from '@/utils/file-processor';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface ExportPanelProps {
  dataSheets: DataSheet[];
  businessRules: BusinessRule[];
  priorities: Priority[];
  canExport: boolean;
}

export function ExportPanel({ dataSheets, businessRules, priorities, canExport }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [includeRules, setIncludeRules] = useState(true);

  const handleExportData = async () => {
    // Allow export even with warnings, only block on critical errors
    const criticalErrorsCount = dataSheets.reduce((sum, sheet) => 
      sum + sheet.validationErrors.filter(e => e.severity === 'error').length, 0
    );
    
    if (criticalErrorsCount > 0) {
      toast.error(`Please fix ${criticalErrorsCount} critical errors before exporting`);
      return;
    }

    setIsExporting(true);
    
    try {
      // Group data by type
      const clientsData = dataSheets.filter(sheet => sheet.type === 'clients').flatMap(sheet => sheet.data);
      const workersData = dataSheets.filter(sheet => sheet.type === 'workers').flatMap(sheet => sheet.data);
      const tasksData = dataSheets.filter(sheet => sheet.type === 'tasks').flatMap(sheet => sheet.data);

      let filesExported = 0;

      // Export each data type
      if (clientsData.length > 0) {
        const filename = `clients_cleaned.${exportFormat}`;
        if (exportFormat === 'csv') {
          FileProcessor.exportToCSV(clientsData, filename);
        } else {
          FileProcessor.exportToExcel(clientsData, filename);
        }
        filesExported++;
      }

      if (workersData.length > 0) {
        const filename = `workers_cleaned.${exportFormat}`;
        if (exportFormat === 'csv') {
          FileProcessor.exportToCSV(workersData, filename);
        } else {
          FileProcessor.exportToExcel(workersData, filename);
        }
        filesExported++;
      }

      if (tasksData.length > 0) {
        const filename = `tasks_cleaned.${exportFormat}`;
        if (exportFormat === 'csv') {
          FileProcessor.exportToCSV(tasksData, filename);
        } else {
          FileProcessor.exportToExcel(tasksData, filename);
        }
        filesExported++;
      }

      if (filesExported === 0) {
        toast.error('No data to export');
      } else {
        toast.success(`Successfully exported ${filesExported} file(s)`);
      }
    } catch (error) {
      toast.error('Export failed. Please try again.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRules = () => {
    const exportData: ExportData = {
      cleanedData: {
        clients: dataSheets.filter(sheet => sheet.type === 'clients').flatMap(sheet => sheet.data) as unknown as Client[],
        workers: dataSheets.filter(sheet => sheet.type === 'workers').flatMap(sheet => sheet.data) as unknown as Worker[],
        tasks: dataSheets.filter(sheet => sheet.type === 'tasks').flatMap(sheet => sheet.data) as unknown as Task[]
      },
      rules: businessRules.filter(rule => rule.isActive),
      priorities,
      metadata: {
        exportedAt: new Date(),
        totalRows: dataSheets.reduce((sum, sheet) => sum + sheet.data.length, 0),
        validationsPassed: canExport,
        validationSummary: {
          totalErrors: dataSheets.reduce((sum, sheet) => sum + sheet.validationErrors.filter(e => e.severity === 'error').length, 0),
          totalWarnings: dataSheets.reduce((sum, sheet) => sum + sheet.validationErrors.filter(e => e.severity === 'warning').length, 0),
          totalInfo: dataSheets.reduce((sum, sheet) => sum + sheet.validationErrors.filter(e => e.severity === 'info').length, 0),
          passedValidations: [],
          failedValidations: [],
          validationsPassed: canExport,
          lastRun: new Date(),
          errors: dataSheets.flatMap(sheet => sheet.validationErrors)
        }
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'allocation_rules.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Rules exported successfully!');
  };

  const totalRows = dataSheets.reduce((sum, sheet) => sum + sheet.data.length, 0);
  const totalErrors = dataSheets.reduce((sum, sheet) => sum + sheet.validationErrors.length, 0);
  const criticalErrors = dataSheets.reduce((sum, sheet) => 
    sum + sheet.validationErrors.filter(e => e.severity === 'error').length, 0
  );
  const warnings = dataSheets.reduce((sum, sheet) => 
    sum + sheet.validationErrors.filter(e => e.severity === 'warning').length, 0
  );
  const activeRules = businessRules.filter(rule => rule.isActive).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <ArrowDownTrayIcon className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Export</h3>
        </div>

        <p className="text-gray-600 text-sm">
          Download your cleaned data and configuration files for the next stage of processing.
        </p>
      </div>

      <div className="p-4">
        {/* Status Overview */}
        <div className="mb-6 space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">Export Readiness</h4>
          
          <div className={cn(
            'flex items-center space-x-3 p-3 rounded-lg',
            canExport ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          )}>
            {canExport ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            )}
            <div className="flex-1">
              <p className={cn(
                'font-medium',
                canExport ? 'text-green-800' : 'text-red-800'
              )}>
                {canExport ? 'Ready to Export' : 'Fix Critical Issues First'}
              </p>
              <p className={cn(
                'text-sm',
                canExport ? 'text-green-600' : 'text-red-600'
              )}>
                {canExport 
                  ? warnings > 0 
                    ? `All critical issues resolved (${warnings} warnings remaining)`
                    : 'All validation checks passed'
                  : `${criticalErrors} critical errors need to be resolved`
                }
              </p>
            </div>
          </div>

          {/* Data Summary */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-800 font-medium">{totalRows}</div>
              <div className="text-blue-600">Total Rows</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-red-800 font-medium">{criticalErrors}</div>
              <div className="text-red-600">Critical Errors</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-yellow-800 font-medium">{warnings}</div>
              <div className="text-yellow-600">Warnings</div>
            </div>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-purple-800 font-medium">{activeRules}</div>
            <div className="text-purple-600">Active Rules</div>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Export Format</h5>
            <div className="flex space-x-3">
              <button
                onClick={() => setExportFormat('csv')}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                  exportFormat === 'csv'
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <DocumentTextIcon className="h-4 w-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => setExportFormat('xlsx')}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                  exportFormat === 'xlsx'
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <TableCellsIcon className="h-4 w-4" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Export Actions */}
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              disabled={!canExport || isExporting}
              className={cn(
                'w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors',
                canExport && !isExporting
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <ArrowDownTrayIcon className="h-5 w-5" />
              )}
              <span>
                {isExporting ? 'Exporting...' : `Export Cleaned Data (${exportFormat.toUpperCase()})`}
              </span>
            </button>

            <button
              onClick={handleExportRules}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span>Export Rules & Config (JSON)</span>
            </button>
          </div>

          {/* Export Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h6 className="text-sm font-medium text-blue-900 mb-1">What gets exported:</h6>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Cleaned and validated data files</li>
              <li>• Business rules configuration (JSON)</li>
              <li>• Priority settings and weights</li>
              <li>• Export metadata and validation status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 