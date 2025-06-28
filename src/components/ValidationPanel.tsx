'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { DataSheet, ValidationError } from '@/types';
import { cn } from '@/utils/cn';

interface ValidationPanelProps {
  dataSheets: DataSheet[];
  onValidationUpdate: (sheetId: string, errors: ValidationError[]) => void;
  totalErrors: number;
}

const severityConfig = {
  error: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    gradient: 'from-red-500 to-rose-500'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    gradient: 'from-yellow-500 to-amber-500'
  },
  info: {
    icon: InformationCircleIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    gradient: 'from-blue-500 to-sky-500'
  }
};

export function ValidationPanel({ dataSheets, onValidationUpdate, totalErrors }: ValidationPanelProps) {
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);

  const toggleSheet = (sheetId: string) => {
    const newExpanded = new Set(expandedSheets);
    if (newExpanded.has(sheetId)) {
      newExpanded.delete(sheetId);
    } else {
      newExpanded.add(sheetId);
    }
    setExpandedSheets(newExpanded);
  };

  const criticalErrors = dataSheets.reduce((sum, sheet) => 
    sum + sheet.validationErrors.filter(e => e.severity === 'error').length, 0
  );
  const warnings = dataSheets.reduce((sum, sheet) => 
    sum + sheet.validationErrors.filter(e => e.severity === 'warning').length, 0
  );
  const infos = dataSheets.reduce((sum, sheet) => 
    sum + sheet.validationErrors.filter(e => e.severity === 'info').length, 0
  );

  const allPassed = criticalErrors === 0;
  const totalRows = dataSheets.reduce((sum, sheet) => sum + sheet.data.length, 0);

  const filteredSheets = dataSheets.map(sheet => ({
    ...sheet,
    validationErrors: selectedSeverity 
      ? sheet.validationErrors.filter(e => e.severity === selectedSeverity)
      : sheet.validationErrors
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            <div className={cn(
              'p-2 rounded-xl bg-gradient-to-r',
              allPassed ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500'
            )}>
              {allPassed ? (
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Validation Status</h3>
            <p className="text-sm text-slate-600">
              Data quality and integrity checks
            </p>
          </div>
        </div>

        {/* Status Overview */}
        <div className={cn(
          'p-4 rounded-xl border-2',
          allPassed 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        )}>
          <div className="flex items-center space-x-3">
            {allPassed ? (
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            ) : (
              <XCircleIcon className="h-6 w-6 text-red-600" />
            )}
            <div className="flex-1">
              <p className={cn(
                'font-semibold text-lg',
                allPassed ? 'text-green-800' : 'text-red-800'
              )}>
                {allPassed ? '✅ All Critical Checks Passed' : `❌ ${criticalErrors} Critical Issues Found`}
              </p>
              <p className={cn(
                'text-sm',
                allPassed ? 'text-green-600' : 'text-red-600'
              )}>
                {allPassed 
                  ? warnings > 0 
                    ? `Ready for export with ${warnings} minor warnings`
                    : 'Data is ready for processing and export'
                  : 'Please resolve critical errors before proceeding'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-50 to-sky-50 p-4 rounded-xl border border-blue-200"
        >
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-800">{totalRows}</p>
              <p className="text-sm text-blue-600">Total Rows</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200"
        >
          <div className="flex items-center space-x-3">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-800">{criticalErrors}</p>
              <p className="text-sm text-red-600">Critical Errors</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200"
        >
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-800">{warnings}</p>
              <p className="text-sm text-yellow-600">Warnings</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200"
        >
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">{dataSheets.length}</p>
              <p className="text-sm text-green-600">Files Loaded</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Severity Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedSeverity(null)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
            selectedSeverity === null
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          All Issues ({totalErrors})
        </button>
        {['error', 'warning', 'info'].map((severity) => {
          const count = severity === 'error' ? criticalErrors : severity === 'warning' ? warnings : infos;
          const config = severityConfig[severity as keyof typeof severityConfig];
          
          return (
            <button
              key={severity}
              onClick={() => setSelectedSeverity(severity)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center space-x-2',
                selectedSeverity === severity
                  ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                  : `${config.bgColor} ${config.color} hover:shadow-md`
              )}
            >
              <config.icon className="h-4 w-4" />
              <span>{severity.charAt(0).toUpperCase() + severity.slice(1)}s ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Validation Details */}
      <div className="space-y-4">
        {filteredSheets.map((sheet) => {
          const isExpanded = expandedSheets.has(sheet.id);
          const sheetErrors = sheet.validationErrors.length;
          
          if (sheetErrors === 0 && selectedSeverity) return null;
          
          return (
            <motion.div
              key={sheet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => toggleSheet(sheet.id)}
                className="w-full p-4 text-left hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-slate-500" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-slate-500" />
                    )}
                    <div className={cn(
                      'p-2 rounded-lg bg-gradient-to-r',
                      sheet.type === 'clients' ? 'from-blue-500 to-cyan-500' :
                      sheet.type === 'workers' ? 'from-purple-500 to-violet-500' :
                      'from-emerald-500 to-teal-500'
                    )}>
                      <EyeIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{sheet.name}</h4>
                      <p className="text-sm text-slate-500">
                        {sheet.data.length} rows • {sheetErrors} issues
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {sheetErrors === 0 ? (
                      <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Valid</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 rounded-full">
                        <XCircleIcon className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-700">{sheetErrors} issues</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-slate-200"
                  >
                    <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                      {sheet.validationErrors.length === 0 ? (
                        <div className="text-center py-6">
                          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                          <p className="text-green-700 font-medium">All validation checks passed!</p>
                          <p className="text-sm text-green-600">This data is ready for processing.</p>
                        </div>
                      ) : (
                        sheet.validationErrors.map((error, index) => {
                          const config = severityConfig[error.severity as keyof typeof severityConfig];
                          
                          return (
                            <motion.div
                              key={error.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn(
                                'p-3 rounded-lg border flex items-start space-x-3',
                                config.bgColor,
                                config.borderColor
                              )}
                            >
                              <config.icon className={cn('h-5 w-5 mt-0.5', config.color)} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm">
                                  {error.message}
                                </p>
                                {error.suggestion && (
                                  <p className="text-xs text-slate-600 mt-1">
                                    💡 {error.suggestion}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                                  {error.row >= 0 && (
                                    <span>Row: {error.row + 1}</span>
                                  )}
                                  {error.column && (
                                    <span>Column: {error.column}</span>
                                  )}
                                  <span className={cn('font-medium', config.color)}>
                                    {error.severity.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-5 w-5 text-slate-600" />
          <p className="text-sm text-slate-600">
            Last validation: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
} 