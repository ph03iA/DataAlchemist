'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudArrowUpIcon, 
  DocumentIcon,
  UsersIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface FileUploadProps {
  onFileUpload: (files: File[], type: 'clients' | 'workers' | 'tasks') => void;
  isProcessing: boolean;
}

const uploadTypes = [
  {
    id: 'clients',
    name: 'Clients',
    description: 'Upload client data with priorities and task requests',
    icon: UsersIcon,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:border-blue-400'
  },
  {
    id: 'workers',
    name: 'Workers', 
    description: 'Upload worker skills, availability, and capacity data',
    icon: BriefcaseIcon,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:border-purple-400'
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Upload task requirements and scheduling constraints',
    icon: DocumentIcon,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-200',
    hoverColor: 'hover:border-emerald-400'
  }
] as const;

export function FileUpload({ onFileUpload, isProcessing }: FileUploadProps) {
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File[]}>({});

  const handleDragOver = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDraggedOver(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'clients' | 'workers' | 'tasks') => {
    e.preventDefault();
    setDraggedOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type === 'text/csv' || 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => ({ ...prev, [type]: validFiles }));
      onFileUpload(validFiles, type);
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'clients' | 'workers' | 'tasks') => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => ({ ...prev, [type]: files }));
      onFileUpload(files, type);
    }
  }, [onFileUpload]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="relative inline-block">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-emerald-500 rounded-full blur-2xl opacity-20"
          />
          <div className="relative bg-gradient-to-r from-blue-500 via-purple-600 to-emerald-500 p-4 rounded-2xl">
            <CloudArrowUpIcon className="h-12 w-12 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
            Upload Your Data Files
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Start by uploading your CSV or Excel files. Our AI will automatically detect patterns, 
            validate data integrity, and suggest improvements.
          </p>
        </div>
      </motion.div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {uploadTypes.map((type, index) => {
          const Icon = type.icon;
          const hasFiles = selectedFiles[type.id]?.length > 0;
          const isDragged = draggedOver === type.id;
          
          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative group"
            >
              <div
                onDragOver={(e) => handleDragOver(e, type.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, type.id as any)}
                className={cn(
                  'relative p-6 lg:p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer',
                  'bg-gradient-to-br', type.bgColor,
                  isDragged ? 'border-blue-400 scale-105' : type.borderColor,
                  !isDragged && type.hoverColor,
                  'hover:scale-105 hover:shadow-xl',
                  hasFiles && 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className={cn(
                      'relative p-3 rounded-xl bg-gradient-to-r',
                      hasFiles ? 'from-green-500 to-emerald-500' : type.color
                    )}>
                      {hasFiles ? (
                        <CheckCircleIcon className="h-8 w-8 text-white" />
                      ) : (
                        <Icon className="h-8 w-8 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Text */}
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-800">
                      {type.name}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {type.description}
                    </p>
                  </div>

                  {/* File Status */}
                  <AnimatePresence>
                    {hasFiles ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            {selectedFiles[type.id].length} file(s) uploaded
                          </span>
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {selectedFiles[type.id].map(f => f.name).join(', ')}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-center"
                      >
                        <p className="text-sm text-slate-500 mb-3">
                          Drag & drop files here or click to browse
                        </p>
                        <div className="flex justify-center space-x-4 text-xs text-slate-400">
                          <span>.CSV</span>
                          <span>.XLSX</span>
                          <span>.XLS</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* File Input */}
                  <input
                    type="file"
                    multiple
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileSelect(e, type.id as any)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isProcessing}
                  />

                  {/* Processing Overlay */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center"
                      >
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm font-medium text-slate-700">Processing...</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 via-purple-50 to-emerald-50 rounded-2xl p-6 border border-blue-100"
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-800 mb-2">
              📋 Expected File Formats
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-blue-700 mb-1">Clients File:</p>
                <p>ClientID, ClientName, PriorityLevel, RequestedTaskIDs, GroupTag, AttributesJSON</p>
              </div>
              <div>
                <p className="font-medium text-purple-700 mb-1">Workers File:</p>
                <p>WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup</p>
              </div>
              <div>
                <p className="font-medium text-emerald-700 mb-1">Tasks File:</p>
                <p>TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 