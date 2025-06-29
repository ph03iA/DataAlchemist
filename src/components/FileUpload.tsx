'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudArrowUpIcon, 
  DocumentIcon,
  UsersIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface FileUploadProps {
  onFileUpload: (files: File[], type: 'clients' | 'workers' | 'tasks') => void;
  onContinue: () => void;
  isProcessing: boolean;
  uploadedFiles: {
    clients: boolean;
    workers: boolean;
    tasks: boolean;
  };
}

const uploadTypes = [
  {
    id: 'clients',
    name: 'Clients',
    description: 'Upload client data with priorities and task requests',
    details: 'ClientID, ClientName, PriorityLevel (1-5), RequestedTaskIDs, GroupTag, AttributesJSON',
    icon: UsersIcon,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:border-blue-400',
    step: 1
  },
  {
    id: 'workers',
    name: 'Workers', 
    description: 'Upload worker skills, availability, and capacity data',
    details: 'WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel',
    icon: BriefcaseIcon,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:border-purple-400',
    step: 2
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Upload task requirements and scheduling constraints',
    details: 'TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent',
    icon: DocumentIcon,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-200',
    hoverColor: 'hover:border-emerald-400',
    step: 3
  }
] as const;

export function FileUpload({ onFileUpload, onContinue, isProcessing, uploadedFiles }: FileUploadProps) {
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File[]}>({});

  // Determine which files are ready for upload
  const getUploadStatus = (typeId: string) => {
    const hasFiles = selectedFiles[typeId]?.length > 0;
    const isUploaded = uploadedFiles[typeId as keyof typeof uploadedFiles];
    const nextTypeToUpload = getNextTypeToUpload();
    const canUpload = nextTypeToUpload === typeId || isUploaded;
    
    return {
      hasFiles,
      isUploaded,
      canUpload,
      isPending: !canUpload && !isUploaded
    };
  };

  const getNextTypeToUpload = () => {
    if (!uploadedFiles.clients) return 'clients';
    if (!uploadedFiles.workers) return 'workers';
    if (!uploadedFiles.tasks) return 'tasks';
    return null;
  };

  const allFilesUploaded = uploadedFiles.clients && uploadedFiles.workers && uploadedFiles.tasks;
  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;

  const handleDragOver = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    const status = getUploadStatus(type);
    if (status.canUpload && !status.isUploaded) {
      setDraggedOver(type);
    }
  }, [uploadedFiles, selectedFiles]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'clients' | 'workers' | 'tasks') => {
    e.preventDefault();
    setDraggedOver(null);
    
    const status = getUploadStatus(type);
    if (!status.canUpload || status.isUploaded) return;
    
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
  }, [onFileUpload, uploadedFiles, selectedFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'clients' | 'workers' | 'tasks') => {
    const status = getUploadStatus(type);
    if (!status.canUpload || status.isUploaded) return;
    
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => ({ ...prev, [type]: files }));
      onFileUpload(files, type);
    }
  }, [onFileUpload, uploadedFiles, selectedFiles]);

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
            Upload all three required files in sequence: <strong>Clients → Workers → Tasks</strong>
          </p>
          
          {/* Progress Indicator */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-4">
              {uploadTypes.map((type, index) => (
                <div key={type.id} className="flex items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                    uploadedFiles[type.id as keyof typeof uploadedFiles]
                      ? 'bg-green-500 text-white'
                      : getNextTypeToUpload() === type.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  )}>
                    {uploadedFiles[type.id as keyof typeof uploadedFiles] ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      type.step
                    )}
                  </div>
                  <span className={cn(
                    'ml-2 text-sm font-medium',
                    uploadedFiles[type.id as keyof typeof uploadedFiles]
                      ? 'text-green-600'
                      : getNextTypeToUpload() === type.id
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  )}>
                    {type.name}
                  </span>
                  {index < uploadTypes.length - 1 && (
                    <ArrowRightIcon className="w-4 h-4 mx-3 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-slate-500">
              Progress: {uploadedCount}/3 files uploaded
            </p>
          </div>
        </div>
      </motion.div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {uploadTypes.map((type, index) => {
          const Icon = type.icon;
          const status = getUploadStatus(type.id);
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
                  'relative p-6 lg:p-8 rounded-2xl border-2 border-dashed transition-all duration-300',
                  'bg-gradient-to-br', type.bgColor,
                  status.isUploaded && 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50',
                  status.canUpload && !status.isUploaded && 'cursor-pointer hover:scale-105 hover:shadow-xl',
                  status.canUpload && !status.isUploaded && (isDragged ? 'border-blue-400 scale-105' : type.borderColor),
                  status.canUpload && !status.isUploaded && !isDragged && type.hoverColor,
                  status.isPending && 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50'
                )}
              >
                {/* Step Number */}
                <div className="absolute top-4 right-4">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    status.isUploaded
                      ? 'bg-green-500 text-white'
                      : status.canUpload
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  )}>
                    {status.isUploaded ? '✓' : type.step}
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className={cn(
                      'relative p-3 rounded-xl bg-gradient-to-r',
                      status.isUploaded ? 'from-green-500 to-emerald-500' : 
                      status.canUpload ? type.color : 'from-gray-400 to-gray-500'
                    )}>
                      {status.isUploaded ? (
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
                      {status.isPending && (
                        <span className="ml-2 text-sm font-normal text-gray-500">(Waiting...)</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {type.description}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {type.details}
                    </p>
                  </div>

                  {/* File Status */}
                  <AnimatePresence>
                    {status.isUploaded ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            ✅ File uploaded successfully!
                          </span>
                        </div>
                      </motion.div>
                    ) : status.canUpload ? (
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
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-center"
                      >
                        <p className="text-sm text-gray-500">
                          Upload previous files first
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* File Input */}
                  {status.canUpload && !status.isUploaded && (
                    <input
                      type="file"
                      multiple
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => handleFileSelect(e, type.id as any)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isProcessing}
                    />
                  )}

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

      {/* Continue Button */}
      <AnimatePresence>
        {allFilesUploaded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <motion.button
              onClick={onContinue}
              disabled={isProcessing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-12 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-3">
                <PlayIcon className="w-6 h-6" />
                <span>Continue to Data Processing</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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
              📋 Required Data Relationships
            </h4>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-medium text-blue-700 mb-1">🔗 Cross-References:</p>
                <p>• Clients.RequestedTaskIDs must match existing TaskIDs in Tasks file</p>
                <p>• Tasks.RequiredSkills must have matching workers with those skills</p>
                <p>• Workers.AvailableSlots should align with Tasks.PreferredPhases</p>
              </div>
              <div>
                <p className="font-medium text-purple-700 mb-1">⚖️ Priority Levels:</p>
                <p>• Client PriorityLevel: 1-5 (higher = more important)</p>
                <p>• Worker QualificationLevel: 1-10 or text levels (Junior, Senior, etc.)</p>
              </div>
              <div>
                <p className="font-medium text-emerald-700 mb-1">📅 Phase Management:</p>
                <p>• AvailableSlots: JSON array like [1,3,5]</p>
                <p>• PreferredPhases: Range "1-3" or array [2,4,5]</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 