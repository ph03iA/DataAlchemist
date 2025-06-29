'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentIcon,
  UsersIcon,
  BriefcaseIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TableCellsIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { DataSheet, ValidationError } from '@/types';
import { cn } from '@/utils/cn';

interface DataViewerProps {
  dataSheets: DataSheet[];
  activeSheet: string | null;
  onActiveSheetChange: (sheetId: string) => void;
  onDataUpdate: (sheetId: string, data: any[]) => void;
  onFileUpload: (files: File[], type: 'clients' | 'workers' | 'tasks') => void;
  onSheetRemove?: (sheetId: string) => void;
  isProcessing: boolean;
}

const getSheetIcon = (type: string) => {
  switch (type) {
    case 'clients':
      return UsersIcon;
    case 'workers':
      return BriefcaseIcon;
    case 'tasks':
      return DocumentIcon;
    default:
      return TableCellsIcon;
  }
};

const getSheetColor = (type: string) => {
  switch (type) {
    case 'clients':
      return {
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        textLight: 'text-blue-600'
      };
    case 'workers':
      return {
        gradient: 'from-purple-500 to-violet-500',
        bg: 'from-purple-50 to-violet-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        textLight: 'text-purple-600'
      };
    case 'tasks':
      return {
        gradient: 'from-emerald-500 to-teal-500',
        bg: 'from-emerald-50 to-teal-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        textLight: 'text-emerald-600'
      };
    default:
      return {
        gradient: 'from-slate-500 to-gray-500',
        bg: 'from-slate-50 to-gray-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        textLight: 'text-slate-600'
      };
  }
};

export function DataViewer({ 
  dataSheets, 
  activeSheet, 
  onActiveSheetChange, 
  onDataUpdate,
  onFileUpload,
  onSheetRemove,
  isProcessing
}: DataViewerProps) {
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSheetData = activeSheet ? dataSheets.find(s => s.id === activeSheet) : null;
  const totalRows = dataSheets.reduce((sum, sheet) => sum + sheet.data.length, 0);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleCellEdit = (row: number, col: string, value: string) => {
    setEditingCell({ row, col });
    setEditValue(String(value || ''));
  };

  const handleCellSave = () => {
    if (!editingCell || !activeSheetData) return;
    
    const updatedData = [...activeSheetData.data];
    updatedData[editingCell.row] = {
      ...updatedData[editingCell.row],
      [editingCell.col]: editValue
    };
    
    onDataUpdate(activeSheetData.id, updatedData);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellCancel();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'clients' | 'workers' | 'tasks') => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileUpload(files, type);
      // Reset the input
      e.target.value = '';
    }
  };

  const handleSheetRemove = (sheetId: string, sheetName: string) => {
    if (window.confirm(`Are you sure you want to remove "${sheetName}"? This action cannot be undone.`)) {
      onSheetRemove?.(sheetId);
      // If we're removing the active sheet, clear the active sheet
      if (activeSheet === sheetId) {
        const remainingSheets = dataSheets.filter(s => s.id !== sheetId);
        if (remainingSheets.length > 0) {
          onActiveSheetChange(remainingSheets[0].id);
        }
      }
    }
  };

  const renderTable = (data: any[]) => {
    if (data.length === 0) return null;
    
    const columns = Object.keys(data[0]);
    
    // Get validation errors for the active sheet
    const validationErrors = activeSheetData?.validationErrors || [];
    
    // Function to get errors for a specific cell
    const getCellErrors = (rowIndex: number, columnName: string) => {
      return validationErrors.filter(error => 
        error.row === rowIndex && error.column === columnName
      );
    };
    
    // Function to get the highest severity for a cell
    const getCellSeverity = (errors: ValidationError[]) => {
      if (errors.some(e => e.severity === 'error')) return 'error';
      if (errors.some(e => e.severity === 'warning')) return 'warning';
      if (errors.some(e => e.severity === 'info')) return 'info';
      return null;
    };
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700 min-w-[120px] border-r border-slate-200 last:border-r-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
              >
                {columns.map((col) => {
                  const cellErrors = getCellErrors(rowIndex, col);
                  const severity = getCellSeverity(cellErrors);
                  const hasErrors = cellErrors.length > 0;
                  
                  // Error styling based on severity
                  const errorStyles = {
                    error: 'border-red-300 bg-red-50/50',
                    warning: 'border-yellow-300 bg-yellow-50/50', 
                    info: 'border-blue-300 bg-blue-50/50'
                  };
                  
                  return (
                    <td
                      key={col}
                      className={cn(
                        "px-4 py-3 text-sm text-slate-700 border-r border-slate-100 last:border-r-0 relative",
                        hasErrors && errorStyles[severity as keyof typeof errorStyles]
                      )}
                    >
                      {editingCell?.row === rowIndex && editingCell?.col === col ? (
                        <div className="relative z-10">
                          <div className="absolute inset-0 bg-blue-50 border-2 border-blue-400 rounded-lg -m-1"></div>
                          <div className="relative bg-white rounded-md shadow-lg border border-blue-300 p-2">
                            <input
                              ref={inputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={handleCellSave}
                              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                              placeholder="Enter value..."
                            />
                            <div className="flex items-center justify-end space-x-1 mt-2">
                              <button
                                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                onClick={handleCellSave}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                onClick={handleCellCancel}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative group">
                          <div
                            className="cursor-pointer hover:bg-blue-50 rounded-md px-2 py-1 transition-colors min-h-[24px] flex items-center group"
                            onClick={() => handleCellEdit(rowIndex, col, String(row[col] || ''))}
                          >
                            <span className="flex-1">{String(row[col] || '')}</span>
                            <div className="flex items-center space-x-1">
                              {/* Error indicator */}
                              {hasErrors && (
                                <div className="relative">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    severity === 'error' ? 'bg-red-500' :
                                    severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                                  )} />
                                  
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap max-w-xs">
                                    <div className="space-y-1">
                                      {cellErrors.slice(0, 3).map((error, idx) => (
                                        <div key={idx} className="flex items-start space-x-2">
                                          <div className={cn(
                                            "w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0",
                                            error.severity === 'error' ? 'bg-red-400' :
                                            error.severity === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                                          )} />
                                          <span>{error.message}</span>
                                        </div>
                                      ))}
                                      {cellErrors.length > 3 && (
                                        <div className="text-gray-400 text-xs">
                                          +{cellErrors.length - 3} more...
                                        </div>
                                      )}
                                    </div>
                                    {/* Tooltip arrow */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  </div>
                                </div>
                              )}
                              <PencilIcon className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFileUploadSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-slate-300 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
            <PlusIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Upload New Files</h4>
            <p className="text-sm text-slate-600">Add more CSV or Excel files to your workspace</p>
          </div>
        </div>
        {dataSheets.length > 0 && (
          <button
            onClick={() => setShowUploadSection(!showUploadSection)}
            className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <XMarkIcon className="h-4 w-4 text-slate-600" />
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {['clients', 'workers', 'tasks'].map((type) => {
          const colors = getSheetColor(type);
          const Icon = getSheetIcon(type);
          
          return (
            <div key={type} className="relative">
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileSelect(e, type as any)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              <div className={cn(
                'p-4 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer hover:scale-105',
                'bg-gradient-to-br', colors.bg, colors.border,
                'hover:shadow-lg',
                isProcessing && 'opacity-50 cursor-not-allowed'
              )}>
                <div className="flex items-center space-x-3">
                  <div className={cn('p-2 rounded-lg bg-gradient-to-r', colors.gradient)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className={cn('font-medium capitalize', colors.text)}>
                      Add {type}
                    </p>
                    <p className={cn('text-sm', colors.textLight)}>
                      CSV, XLSX, XLS
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <TableCellsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Data Viewer</h3>
              <p className="text-sm text-slate-600">
                View and edit your uploaded data
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{totalRows}</p>
              <p className="text-sm text-slate-600">Total Rows</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-slate-600" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          {['clients', 'workers', 'tasks'].map((type) => {
            const sheets = dataSheets.filter(s => s.type === type);
            const count = sheets.reduce((sum, s) => sum + s.data.length, 0);
            const colors = getSheetColor(type);
            const Icon = getSheetIcon(type);
            
            return (
              <div key={type} className={cn('p-3 rounded-xl border bg-gradient-to-br', colors.bg, colors.border)}>
                <div className="flex items-center space-x-2">
                  <div className={cn('p-1 rounded-lg bg-gradient-to-r', colors.gradient)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className={cn('text-lg font-bold', colors.text)}>{count}</p>
                    <p className={cn('text-xs capitalize', colors.textLight)}>{type}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* File Upload Section */}
      {(dataSheets.length === 0 || showUploadSection) && renderFileUploadSection()}

      {/* Add Files Button (when sheets exist and upload section is hidden) */}
      {dataSheets.length > 0 && !showUploadSection && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowUploadSection(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add More Files</span>
          </button>
        </div>
      )}

      {/* Data Sheets */}
      <div className="space-y-4">
        {dataSheets.length > 0 && (
          <>
            {/* Tab Navigation */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {dataSheets.map((sheet) => {
                const colors = getSheetColor(sheet.type);
                const Icon = getSheetIcon(sheet.type);
                const isActive = activeSheet === sheet.id;
                const errorCount = sheet.validationErrors.filter(e => e.severity === 'error').length;
                
                return (
                  <motion.div
                    key={sheet.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex items-center space-x-2 rounded-xl border transition-all duration-200 whitespace-nowrap',
                      isActive
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg border-transparent`
                        : `${colors.bg} ${colors.text} ${colors.border}`
                    )}
                  >
                    <button
                      onClick={() => onActiveSheetChange(sheet.id)}
                      className="flex items-center space-x-3 px-4 py-3 flex-1"
                    >
                      <Icon className={cn('h-5 w-5', isActive ? 'text-white' : colors.text)} />
                      <div className="text-left">
                        <p className="font-medium">{sheet.name}</p>
                        <p className={cn('text-xs', isActive ? 'text-white/80' : colors.textLight)}>
                          {sheet.data.length} rows
                          {errorCount > 0 && (
                            <span className={cn(
                              'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                              isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                            )}>
                              {errorCount} errors
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSheetRemove(sheet.id, sheet.name)}
                      className={cn(
                        'p-2 mr-2 rounded-lg transition-colors',
                        isActive
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-red-100 text-red-600'
                      )}
                      title={`Remove ${sheet.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Active Sheet Content */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {activeSheetData ? (
                <div>
                  {/* Sheet Header */}
                  <div className={cn(
                    'p-4 border-b border-slate-200 bg-gradient-to-r',
                    getSheetColor(activeSheetData.type).bg
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'p-2 rounded-lg bg-gradient-to-r',
                          getSheetColor(activeSheetData.type).gradient
                        )}>
                          {(() => {
                            const Icon = getSheetIcon(activeSheetData.type);
                            return <Icon className="h-5 w-5 text-white" />;
                          })()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{activeSheetData.name}</h4>
                          <p className="text-sm text-slate-600">
                            {activeSheetData.data.length} rows • Last modified: {activeSheetData.lastModified.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                          <EyeIcon className="h-4 w-4 text-slate-600" />
                        </button>
                        <button className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                          <PencilIcon className="h-4 w-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleSheetRemove(activeSheetData.id, activeSheetData.name)}
                          className="p-2 bg-white rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove this sheet"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table Content */}
                  <div className="max-h-96 overflow-auto">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSheetData.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {activeSheetData.data.length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                            <TableCellsIcon className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                            <p>No data in this sheet</p>
                          </div>
                        ) : (
                          renderTable(activeSheetData.data)
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <p>
                        Showing {activeSheetData.data.length} rows
                      </p>
                      <div className="flex items-center space-x-4">
                        <p>
                          💡 Click any cell to edit
                        </p>
                        <div className="flex items-center space-x-2 text-xs">
                          <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-600">Enter</kbd>
                          <span>Save</span>
                          <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-600">Esc</kbd>
                          <span>Cancel</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <TableCellsIcon className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p>Select a sheet to view its data</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 