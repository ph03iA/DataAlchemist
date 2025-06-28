'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileUpload } from '@/components/FileUpload';
import { DataViewer } from '@/components/DataViewer';
import { ValidationPanel } from '@/components/ValidationPanel';
import { RulesCreator } from '@/components/RulesCreator';
import { PriorityControls } from '@/components/PriorityControls';
import { ExportPanel } from '@/components/ExportPanel';
import { AISearch } from '@/components/AISearch';
import { DataCorrectionsPanel } from '@/components/DataCorrectionsPanel';
import { AllocationRunner } from '@/components/AllocationRunner';
import { Header } from '@/components/Header';
import { DataSheet, BusinessRule, Priority, ValidationError, Client, Worker, Task } from '@/types';
import { FileProcessor } from '@/utils/file-processor';
import { createAIProvider } from '@/lib/ai-provider';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [dataSheets, setDataSheets] = useState<DataSheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([
    { id: '1', name: 'Cost Optimization', weight: 0.3, description: 'Minimize operational costs', category: 'efficiency' },
    { id: '2', name: 'Speed', weight: 0.4, description: 'Complete tasks quickly', category: 'efficiency' },
    { id: '3', name: 'Quality', weight: 0.3, description: 'Ensure high-quality results', category: 'quality' },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'huggingface'>('gemini');

  const handleFileUpload = useCallback(async (files: File[], type: 'clients' | 'workers' | 'tasks') => {
    setIsProcessing(true);
    
    try {
      for (const file of files) {
        if (!FileProcessor.validateFileType(file)) {
          toast.error(`Invalid file type: ${file.name}`);
          continue;
        }
        
        if (!FileProcessor.validateFileSize(file)) {
          toast.error(`File too large: ${file.name} (max 10MB)`);
          continue;
        }

        const dataSheet = await FileProcessor.processFile(file, type);
        
        // Run AI validation
        try {
          const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || 'AIzaSyCVhx0OqlKD7VxQqPxsLyTCFndgXcZN-So'; // Fallback for testing
          console.log('API Key available:', !!apiKey, 'Length:', apiKey?.length);
          
          if (!apiKey) {
            throw new Error('No API key available');
          }
          
          const aiProviderInstance = createAIProvider(aiProvider, apiKey);
          
          // Get all data by type for comprehensive validation
          const allClients = dataSheets.filter(s => s.type === 'clients').flatMap(s => s.data) as unknown as Client[];
          const allWorkers = dataSheets.filter(s => s.type === 'workers').flatMap(s => s.data) as unknown as Worker[];
          const allTasks = dataSheets.filter(s => s.type === 'tasks').flatMap(s => s.data) as unknown as Task[];
          
          // Add current sheet data if it's not already included
          let currentData: any[] = [];
          if (dataSheet.type === 'clients') {
            currentData = [...allClients, ...dataSheet.data];
          } else if (dataSheet.type === 'workers') {
            currentData = [...allWorkers, ...dataSheet.data];
          } else if (dataSheet.type === 'tasks') {
            currentData = [...allTasks, ...dataSheet.data];
          }
          
          // Core validation first
          const validationSummary = await aiProviderInstance.validateData(
            dataSheet.type === 'clients' ? dataSheet.data as unknown as Client[] : allClients,
            dataSheet.type === 'workers' ? dataSheet.data as unknown as Worker[] : allWorkers,
            dataSheet.type === 'tasks' ? dataSheet.data as unknown as Task[] : allTasks
          );
          
          // Enhanced AI validation
          try {
            const aiValidationErrors = await aiProviderInstance.enhancedValidation(dataSheet.data, dataSheet.type);
            validationSummary.errors = [...validationSummary.errors, ...aiValidationErrors];
            validationSummary.totalErrors += aiValidationErrors.filter(e => e.severity === 'error').length;
            validationSummary.totalWarnings += aiValidationErrors.filter(e => e.severity === 'warning').length;
            validationSummary.totalInfo += aiValidationErrors.filter(e => e.severity === 'info').length;
            console.log('Enhanced AI validation added', aiValidationErrors.length, 'additional errors');
          } catch (aiValidationError) {
            console.log('AI enhanced validation failed, using core validation only:', aiValidationError);
          }
          
          dataSheet.validationSummary = validationSummary;
          dataSheet.validationErrors = validationSummary.errors;
        } catch (error) {
          console.warn('AI validation failed, using basic validation:', error);
          // Add basic validation as fallback
          const basicErrors: ValidationError[] = [];
          
          // Check for empty data
          if (dataSheet.data.length === 0) {
            basicErrors.push({
              id: 'empty-data',
              row: -1,
              column: 'general',
              message: 'No data found in the file',
              severity: 'error',
              suggestion: 'Please ensure the file contains data rows'
            });
          }
          
          // Check for missing required columns
          if (dataSheet.data.length > 0) {
            const firstRow = dataSheet.data[0];
            const requiredColumns = {
              clients: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'],
              workers: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'],
              tasks: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']
            };
            
            const required = requiredColumns[dataSheet.type] || [];
            required.forEach(column => {
              if (!(column in firstRow)) {
                basicErrors.push({
                  id: `missing-${column}`,
                  row: -1,
                  column,
                  message: `Missing required column: ${column}`,
                  severity: 'error',
                  suggestion: `Add the ${column} column to your data`
                });
              }
            });
            
            // Check for duplicate IDs
            const idColumn = dataSheet.type === 'clients' ? 'ClientID' : 
                            dataSheet.type === 'workers' ? 'WorkerID' : 'TaskID';
            
            if (idColumn in firstRow) {
              const ids = new Set();
              dataSheet.data.forEach((row, index) => {
                const id = row[idColumn];
                if (ids.has(id)) {
                  basicErrors.push({
                    id: `duplicate-${idColumn}-${id}`,
                    row: index,
                    column: idColumn,
                    message: `Duplicate ${idColumn}: ${id}`,
                    severity: 'error',
                    suggestion: `Use a unique ${idColumn}`
                  });
                }
                ids.add(id);
              });
            }
            
            // Type-specific validations
            if (dataSheet.type === 'clients') {
              dataSheet.data.forEach((row, index) => {
                if (row.PriorityLevel && (row.PriorityLevel < 1 || row.PriorityLevel > 5)) {
                  basicErrors.push({
                    id: `invalid-priority-${row.ClientID || index}`,
                    row: index,
                    column: 'PriorityLevel',
                    message: `PriorityLevel must be 1-5, got: ${row.PriorityLevel}`,
                    severity: 'error',
                    suggestion: 'Set PriorityLevel to a value between 1 and 5'
                  });
                }
              });
            }
          }
          
          dataSheet.validationErrors = basicErrors;
          console.log('Basic validation found', basicErrors.length, 'errors for', dataSheet.name);
        }

        setDataSheets(prev => [...prev, dataSheet]);
        if (!activeSheet) {
          setActiveSheet(dataSheet.id);
        }
        
        toast.success(`Successfully processed ${file.name}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [activeSheet, aiProvider, dataSheets]);

  const handleDataUpdate = useCallback((sheetId: string, updatedData: any[]) => {
    setDataSheets(prev => prev.map(sheet => 
      sheet.id === sheetId 
        ? { 
            ...sheet, 
            data: updatedData, 
            lastModified: new Date(),
            // Clear validation errors when data is manually updated/corrected
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
            }
          }
        : sheet
    ));
  }, []);

  const handleValidationUpdate = useCallback((sheetId: string, errors: ValidationError[]) => {
    setDataSheets(prev => prev.map(sheet =>
      sheet.id === sheetId
        ? { ...sheet, validationErrors: errors }
        : sheet
    ));
  }, []);

  const handleRuleCreate = useCallback(async (naturalLanguage: string) => {
    try {
      setIsProcessing(true);
      const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || 'AIzaSyCVhx0OqlKD7VxQqPxsLyTCFndgXcZN-So'; // Fallback for testing
      
      if (!apiKey) {
        throw new Error('No API key available');
      }
      
      const aiProviderInstance = createAIProvider(aiProvider, apiKey);
      const rule = await aiProviderInstance.generateBusinessRule(naturalLanguage, {
        clients: dataSheets.filter(s => s.type === 'clients').flatMap(s => s.data) as unknown as Client[],
        workers: dataSheets.filter(s => s.type === 'workers').flatMap(s => s.data) as unknown as Worker[],
        tasks: dataSheets.filter(s => s.type === 'tasks').flatMap(s => s.data) as unknown as Task[]
      });
      setBusinessRules(prev => [...prev, rule]);
      toast.success('Business rule created successfully!');
    } catch (error) {
      toast.error('Failed to create business rule');
      console.error('Rule creation error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [aiProvider, dataSheets]);

  const handleDataModification = useCallback((modifications: any[]) => {
    if (!activeSheet) return;
    
    const sheet = dataSheets.find(s => s.id === activeSheet);
    if (!sheet) return;

    let updatedData = [...sheet.data];
    
    modifications.forEach(modification => {
      if (modification.row >= 0 && modification.row < updatedData.length) {
        updatedData[modification.row] = {
          ...updatedData[modification.row],
          [modification.column]: modification.suggestedValue
        };
      }
    });

    handleDataUpdate(activeSheet, updatedData);
    toast.success(`Applied ${modifications.length} modifications`);
  }, [activeSheet, dataSheets, handleDataUpdate]);

  const handleSheetRemove = useCallback((sheetId: string) => {
    setDataSheets(prev => prev.filter(sheet => sheet.id !== sheetId));
    
    // If we're removing the active sheet, clear it
    if (activeSheet === sheetId) {
      const remainingSheets = dataSheets.filter(s => s.id !== sheetId);
      if (remainingSheets.length > 0) {
        setActiveSheet(remainingSheets[0].id);
      } else {
        setActiveSheet(null);
      }
    }
    
    toast.success('Data sheet removed successfully');
  }, [activeSheet, dataSheets]);

  const handleSearch = async (query: string, filters?: any) => {
    console.log('Search initiated:', { query, activeSheet, hasData: !!activeSheet });
    
    if (!activeSheet) {
      console.log('No active sheet selected');
      return [];
    }
    
    const sheet = dataSheets.find(s => s.id === activeSheet);
    if (!sheet) {
      console.log('Sheet not found:', activeSheet);
      return [];
    }

    console.log('Searching in sheet:', { name: sheet.name, type: sheet.type, rows: sheet.data.length });

    try {
      const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || 'AIzaSyCVhx0OqlKD7VxQqPxsLyTCFndgXcZN-So'; // Fallback for testing
      
      if (!apiKey) {
        console.log('No API key, using fallback search');
        throw new Error('No API key available');
      }
      
      console.log('Attempting AI search...');
      const aiProviderInstance = createAIProvider(aiProvider, apiKey);
      const results = await aiProviderInstance.searchData(query, sheet.data, sheet.type);
      console.log('AI search results:', results.length);
      return results;
    } catch (error) {
      console.log('AI search failed, using fallback:', error);
      
      // Enhanced fallback search
      const searchTerm = query.toLowerCase().trim();
      const results = sheet.data.filter(row => {
        // Search in all string values
        const searchableText = Object.values(row)
          .map(value => String(value || '').toLowerCase())
          .join(' ');
        
        // Check for exact matches and partial matches
        return searchableText.includes(searchTerm) ||
               // Split query into words and check if all words match
               searchTerm.split(' ').every(word => 
                 word.length > 0 && searchableText.includes(word)
               );
      });
      
      console.log('Fallback search results:', results.length);
      return results;
    }
  };

  const activeSheetData = activeSheet ? dataSheets.find(s => s.id === activeSheet) : null;
  
  // Calculate errors more accurately
  const criticalErrors = dataSheets.reduce((sum, sheet) => 
    sum + sheet.validationErrors.filter(e => e.severity === 'error').length, 0
  );
  const totalErrors = dataSheets.reduce((sum, sheet) => sum + sheet.validationErrors.length, 0);
  const canExport = criticalErrors === 0; // Only block export for critical errors, not warnings

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-indigo-600/20 blur-3xl"
            />
            <div className="relative">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                <span className="block">🚀 Data Alchemist</span>
              </h1>
              <p className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-4xl mx-auto leading-relaxed">
                Transform messy spreadsheets into clean, validated data with 
                <span className="font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> AI-powered tools</span>
              </p>
            </div>
          </div>
        </motion.div>

        {dataSheets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 lg:p-12">
              <FileUpload 
                onFileUpload={handleFileUpload}
                isProcessing={isProcessing}
              />
            </div>
          </motion.div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
            {/* Data Viewer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <DataViewer
                dataSheets={dataSheets}
                activeSheet={activeSheet}
                onActiveSheetChange={setActiveSheet}
                onDataUpdate={handleDataUpdate}
                onFileUpload={handleFileUpload}
                onSheetRemove={handleSheetRemove}
                isProcessing={isProcessing}
              />
            </motion.div>

            {/* AI Search */}
            {activeSheetData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
              >
                <AISearch
                  onSearch={handleSearch}
                  onDataModification={handleDataModification}
                  activeSheetData={activeSheetData?.data || []}
                  activeSheetType={activeSheetData?.type}
                  placeholder="Search your data with natural language..."
                />
              </motion.div>
            )}

            {/* AI Data Corrections Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <DataCorrectionsPanel
                dataSheets={dataSheets}
                onDataUpdate={handleDataUpdate}
              />
            </motion.div>

            {/* Validation Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <ValidationPanel
                dataSheets={dataSheets}
                onValidationUpdate={handleValidationUpdate}
                totalErrors={totalErrors}
              />
            </motion.div>

            {/* Rules Creator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <RulesCreator
                rules={businessRules}
                onRuleCreate={handleRuleCreate}
                onRuleUpdate={(id, updates) => 
                  setBusinessRules(prev => prev.map(rule => 
                    rule.id === id ? { ...rule, ...updates } : rule
                  ))
                }
                onRuleDelete={(id) => 
                  setBusinessRules(prev => prev.filter(rule => rule.id !== id))
                }
                isProcessing={isProcessing}
                clients={dataSheets.filter(s => s.type === 'clients').flatMap(s => s.data) as unknown as Client[]}
                workers={dataSheets.filter(s => s.type === 'workers').flatMap(s => s.data) as unknown as Worker[]}
                tasks={dataSheets.filter(s => s.type === 'tasks').flatMap(s => s.data) as unknown as Task[]}
              />
            </motion.div>

            {/* Allocation Runner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <AllocationRunner
                dataSheets={dataSheets}
                businessRules={businessRules}
                priorities={priorities}
              />
            </motion.div>

            {/* Priority Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <PriorityControls
                priorities={priorities}
                onPriorityUpdate={setPriorities}
              />
            </motion.div>

            {/* Export Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            >
              <ExportPanel
                dataSheets={dataSheets}
                businessRules={businessRules}
                priorities={priorities}
                canExport={canExport}
              />
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
} 