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
      const newDataSheets: DataSheet[] = [];
      
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
        newDataSheets.push(dataSheet);
        
        toast.success(`Successfully processed ${file.name}`);
      }

      // Add new sheets to state first
      const updatedDataSheets = [...dataSheets, ...newDataSheets];
      setDataSheets(updatedDataSheets);
      
      // Set active sheet if none is selected
      if (!activeSheet && newDataSheets.length > 0) {
        setActiveSheet(newDataSheets[0].id);
      }

      // Now run comprehensive validation on all data including newly uploaded
      await runComprehensiveValidation(updatedDataSheets);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [activeSheet, aiProvider, dataSheets]);

  // New comprehensive validation function
  const runComprehensiveValidation = async (sheets: DataSheet[]) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY;
      console.log('Running comprehensive validation on all datasets...');
      
      // Get all data by type
      const allClients = sheets.filter(s => s.type === 'clients').flatMap(s => s.data) as unknown as Client[];
      const allWorkers = sheets.filter(s => s.type === 'workers').flatMap(s => s.data) as unknown as Worker[];
      const allTasks = sheets.filter(s => s.type === 'tasks').flatMap(s => s.data) as unknown as Task[];
      
      console.log('Dataset sizes:', { 
        clients: allClients.length, 
        workers: allWorkers.length, 
        tasks: allTasks.length 
      });

      // Check if we have all three dataset types for comprehensive validation
      const hasAllDataTypes = allClients.length > 0 && allWorkers.length > 0 && allTasks.length > 0;
      
      if (hasAllDataTypes) {
        console.log('🎯 All three datasets present - running comprehensive cross-referential validation');
        toast.success('🎯 All datasets loaded! Running comprehensive validation...', { duration: 3000 });
      }

      // Update each sheet with comprehensive validation results
      const updatedSheets = await Promise.all(sheets.map(async (sheet) => {
        try {
          let validationErrors: ValidationError[] = [];
          
          // Run AI validation if API key is available
          if (apiKey) {
            const aiProviderInstance = createAIProvider(aiProvider, apiKey);
            
            // Comprehensive AI validation with all data
            console.log(`Running AI validation for ${sheet.name} (${sheet.type})`);
            
            const validationSummary = await aiProviderInstance.validateData(allClients, allWorkers, allTasks);
            
            // Enhanced AI validation for this specific sheet
            const enhancedErrors = await aiProviderInstance.enhancedValidation(sheet.data, sheet.type);
            
            // AI-powered data corrections suggestions
            const corrections = await aiProviderInstance.suggestDataCorrections(sheet.data, sheet.type);
            const correctionErrors = corrections.map(correction => ({
              id: correction.id,
              row: correction.row,
              column: correction.column,
              message: `Suggestion: ${correction.reason}`,
              severity: 'info' as const,
              suggestion: `Change "${correction.currentValue}" to "${correction.suggestedValue}"`
            }));
            
            // Combine all AI validation results
            const allAIErrors = [
              ...validationSummary.errors.filter(e => e.validationType && e.validationType.includes(sheet.type)),
              ...enhancedErrors,
              ...correctionErrors
            ];
            
            validationErrors = allAIErrors;
          } else {
            console.warn('No AI API key, using comprehensive basic validation');
          }
          
          // Always run comprehensive basic validation as fallback/supplement
          const basicErrors = await runComprehensiveBasicValidation(sheet, allClients, allWorkers, allTasks, hasAllDataTypes);
          
          // Combine and deduplicate errors
          const combinedErrors = [...validationErrors, ...basicErrors];
          const uniqueErrors = combinedErrors.filter((error, index, self) => 
            index === self.findIndex(e => e.id === error.id || 
              (e.row === error.row && e.column === error.column && e.message === error.message)
            )
          );
          
          console.log(`Validation complete for ${sheet.name}:`, {
            total: uniqueErrors.length,
            errors: uniqueErrors.filter(e => e.severity === 'error').length,
            warnings: uniqueErrors.filter(e => e.severity === 'warning').length,
            info: uniqueErrors.filter(e => e.severity === 'info').length
          });
          
          return {
            ...sheet,
            validationErrors: uniqueErrors,
            validationSummary: {
              totalErrors: uniqueErrors.filter(e => e.severity === 'error').length,
              totalWarnings: uniqueErrors.filter(e => e.severity === 'warning').length,
              totalInfo: uniqueErrors.filter(e => e.severity === 'info').length,
              passedValidations: uniqueErrors.filter(e => e.severity === 'error').length === 0 ? 
                ['basic_structure', 'data_format', 'required_fields'] : [],
              failedValidations: uniqueErrors.filter(e => e.severity === 'error').length > 0 ? 
                ['cross_referential_validation'] : [],
              validationsPassed: uniqueErrors.filter(e => e.severity === 'error').length === 0,
              lastRun: new Date(),
              errors: uniqueErrors
            }
          };
        } catch (error) {
          console.error(`Validation failed for ${sheet.name}:`, error);
          return sheet; // Return original sheet if validation fails
        }
      }));
      
      // Update state with validated sheets
      setDataSheets(updatedSheets);
      
      // Show validation summary
      const totalErrors = updatedSheets.reduce((sum, sheet) => 
        sum + sheet.validationErrors.filter(e => e.severity === 'error').length, 0
      );
      const totalWarnings = updatedSheets.reduce((sum, sheet) => 
        sum + sheet.validationErrors.filter(e => e.severity === 'warning').length, 0
      );
      const totalInfo = updatedSheets.reduce((sum, sheet) => 
        sum + sheet.validationErrors.filter(e => e.severity === 'info').length, 0
      );
      
      if (hasAllDataTypes) {
        if (totalErrors === 0) {
          toast.success(`✅ Comprehensive validation passed! ${totalWarnings} warnings, ${totalInfo} suggestions`, {
            duration: 4000
          });
        } else {
          toast.error(`❌ Found ${totalErrors} critical errors, ${totalWarnings} warnings across all datasets`, {
            duration: 5000
          });
        }
      } else {
        const missingTypes = [];
        if (allClients.length === 0) missingTypes.push('clients');
        if (allWorkers.length === 0) missingTypes.push('workers');
        if (allTasks.length === 0) missingTypes.push('tasks');
        
        toast(`📝 Upload ${missingTypes.join(', ')} data for comprehensive cross-referential validation`, {
          icon: '📝',
          duration: 4000
        });
      }
      
    } catch (error) {
      console.error('Comprehensive validation failed:', error);
      toast.error('Validation failed. Check console for details.');
    }
  };

  // Enhanced basic validation with cross-referential checks
  const runComprehensiveBasicValidation = async (
    sheet: DataSheet, 
    allClients: Client[], 
    allWorkers: Worker[], 
    allTasks: Task[],
    hasAllDataTypes: boolean
  ): Promise<ValidationError[]> => {
    const errors: ValidationError[] = [];
    
    // Check for empty data
    if (sheet.data.length === 0) {
      errors.push({
        id: 'empty-data',
        row: -1,
        column: 'general',
        message: 'No data found in the file',
        severity: 'error',
        suggestion: 'Please ensure the file contains data rows'
      });
      return errors;
    }

    // Basic structure validation (same as before)
    const firstRow = sheet.data[0];
    const requiredColumns = {
      clients: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'],
      workers: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'],
      tasks: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']
    };
    
    const required = requiredColumns[sheet.type] || [];
    required.forEach(column => {
      if (!(column in firstRow)) {
        errors.push({
          id: `missing-${column}`,
          row: -1,
          column,
          message: `Missing required column: ${column}`,
          severity: 'error',
          suggestion: `Add the ${column} column to your data`
        });
      }
    });

    // Cross-referential validation (only if we have all datasets)
    if (hasAllDataTypes) {
      if (sheet.type === 'clients') {
        // Validate RequestedTaskIDs references
        const taskIds = new Set(allTasks.map(t => t.TaskID));
        sheet.data.forEach((client, index) => {
          if (client.RequestedTaskIDs) {
            const requestedIds = client.RequestedTaskIDs.split(',').map((id: string) => id.trim());
            requestedIds.forEach((taskId: string) => {
              if (taskId && !taskIds.has(taskId)) {
                errors.push({
                  id: `unknown-task-ref-${client.ClientID}-${taskId}`,
                  row: index,
                  column: 'RequestedTaskIDs',
                  message: `❌ Unknown TaskID reference: ${taskId}`,
                  severity: 'error',
                  suggestion: 'Ensure all referenced TaskIDs exist in tasks data'
                });
              }
            });
          }
        });
      }

      if (sheet.type === 'tasks') {
        // Validate RequiredSkills coverage
        const availableSkills = new Set(allWorkers.flatMap(w => 
          w.Skills.split(',').map((s: string) => s.trim().toLowerCase())
        ));
        
        sheet.data.forEach((task, index) => {
          if (task.RequiredSkills) {
            const requiredSkills = task.RequiredSkills.split(',').map((s: string) => s.trim());
            const uncoveredSkills = requiredSkills.filter((skill: string) => 
              skill && !availableSkills.has(skill.toLowerCase())
            );
            
            if (uncoveredSkills.length > 0) {
              errors.push({
                id: `uncovered-skills-${task.TaskID}`,
                row: index,
                column: 'RequiredSkills',
                message: `❌ No workers have required skills: ${uncoveredSkills.join(', ')}`,
                severity: 'error',
                suggestion: 'Add workers with these skills or modify task requirements'
              });
            }
          }
        });
      }

      if (sheet.type === 'workers') {
        // Validate phase availability vs task preferences
        const taskPhases = new Set(allTasks.flatMap(task => {
          if (task.PreferredPhases) {
            try {
              if (task.PreferredPhases.includes('-')) {
                const [start, end] = task.PreferredPhases.split('-').map(n => parseInt(n.trim()));
                return Array.from({length: end - start + 1}, (_, i) => start + i);
              }
              return JSON.parse(task.PreferredPhases);
            } catch {
              return [];
            }
          }
          return [];
        }));

        sheet.data.forEach((worker, index) => {
          if (worker.AvailableSlots) {
            try {
              const availableSlots = JSON.parse(worker.AvailableSlots);
              const hasTaskPhaseOverlap = availableSlots.some((slot: number) => taskPhases.has(slot));
              
              if (!hasTaskPhaseOverlap && taskPhases.size > 0) {
                errors.push({
                  id: `no-phase-overlap-${worker.WorkerID}`,
                  row: index,
                  column: 'AvailableSlots',
                  message: `⚠️ Worker slots ${JSON.stringify(availableSlots)} don't overlap with any task preferred phases`,
                  severity: 'warning',
                  suggestion: 'Ensure worker availability aligns with task scheduling needs'
                });
              }
            } catch {
              // Already handled by basic validation
            }
          }
        });
      }
    }

    // Continue with comprehensive type-specific validations
    if (sheet.type === 'clients') {
      sheet.data.forEach((row, index) => {
        // Priority level validation
        if (row.PriorityLevel && (row.PriorityLevel < 1 || row.PriorityLevel > 5)) {
          errors.push({
            id: `invalid-priority-${row.ClientID || index}`,
            row: index,
            column: 'PriorityLevel',
            message: `PriorityLevel must be 1-5, got: ${row.PriorityLevel}`,
            severity: 'error',
            suggestion: 'Set PriorityLevel to a value between 1 and 5'
          });
        }
        
        // Check AttributesJSON
        if (row.AttributesJSON) {
          try {
            JSON.parse(row.AttributesJSON);
          } catch {
            errors.push({
              id: `invalid-json-${row.ClientID || index}`,
              row: index,
              column: 'AttributesJSON',
              message: 'Invalid JSON format in AttributesJSON',
              severity: 'error',
              suggestion: 'Fix the JSON syntax'
            });
          }
        }
        
        // Check required fields
        if (!row.ClientName || row.ClientName.trim() === '') {
          errors.push({
            id: `empty-name-${row.ClientID || index}`,
            row: index,
            column: 'ClientName',
            message: 'ClientName cannot be empty',
            severity: 'error',
            suggestion: 'Provide a valid client name'
          });
        }
      });
    }
    
    if (sheet.type === 'workers') {
      sheet.data.forEach((row, index) => {
        // Check QualificationLevel - handle both numeric (1-10) and text values
        if (row.QualificationLevel) {
          const qualLevel = String(row.QualificationLevel).toLowerCase();
          const numericLevel = Number(row.QualificationLevel);
          
          // Check if it's numeric and in range
          if (!isNaN(numericLevel) && (numericLevel < 1 || numericLevel > 10)) {
            errors.push({
              id: `invalid-qualification-numeric-${row.WorkerID || index}`,
              row: index,
              column: 'QualificationLevel',
              message: `QualificationLevel should be 1-10, got: ${row.QualificationLevel}`,
              severity: 'warning',
              suggestion: 'Set QualificationLevel between 1 and 10'
            });
          }
          // Check if it's text and validate standard levels
          else if (isNaN(numericLevel)) {
            const validTextLevels = ['junior', 'mid-level', 'senior', 'lead', 'principal', 'architect'];
            if (!validTextLevels.includes(qualLevel)) {
              errors.push({
                id: `invalid-qualification-text-${row.WorkerID || index}`,
                row: index,
                column: 'QualificationLevel',
                message: `Invalid QualificationLevel: ${row.QualificationLevel}`,
                severity: 'info',
                suggestion: 'Use: Junior, Mid-level, Senior, Lead, Principal, or Architect'
              });
            }
          }
        }
        
        // Check Skills format
        if (row.Skills) {
          const skills = row.Skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          if (skills.length === 0) {
            errors.push({
              id: `empty-skills-${row.WorkerID || index}`,
              row: index,
              column: 'Skills',
              message: 'Skills cannot be empty',
              severity: 'error',
              suggestion: 'Add at least one skill'
            });
          }
        }
        
        // Check MaxLoadPerPhase
        if (row.MaxLoadPerPhase !== undefined && row.MaxLoadPerPhase !== null && row.MaxLoadPerPhase !== '') {
          const maxLoad = Number(row.MaxLoadPerPhase);
          if (isNaN(maxLoad) || maxLoad < 1) {
            errors.push({
              id: `invalid-load-${row.WorkerID || index}`,
              row: index,
              column: 'MaxLoadPerPhase',
              message: `MaxLoadPerPhase must be ≥ 1, got: ${row.MaxLoadPerPhase}`,
              severity: 'error',
              suggestion: 'Set MaxLoadPerPhase to 1 or higher'
            });
          }
        }
        
        // Check required fields
        if (!row.WorkerName || row.WorkerName.trim() === '') {
          errors.push({
            id: `empty-worker-name-${row.WorkerID || index}`,
            row: index,
            column: 'WorkerName',
            message: 'WorkerName cannot be empty',
            severity: 'error',
            suggestion: 'Provide a valid worker name'
          });
        }
      });
    }
    
    if (sheet.type === 'tasks') {
      sheet.data.forEach((row, index) => {
        // Check Duration
        if (row.Duration && row.Duration < 1) {
          errors.push({
            id: `invalid-duration-${row.TaskID || index}`,
            row: index,
            column: 'Duration',
            message: `Duration must be ≥ 1, got: ${row.Duration}`,
            severity: 'error',
            suggestion: 'Set Duration to 1 or higher'
          });
        }
        
        // Check MaxConcurrent
        if (row.MaxConcurrent && row.MaxConcurrent < 1) {
          errors.push({
            id: `invalid-concurrent-${row.TaskID || index}`,
            row: index,
            column: 'MaxConcurrent',
            message: `MaxConcurrent must be ≥ 1, got: ${row.MaxConcurrent}`,
            severity: 'warning',
            suggestion: 'Set MaxConcurrent to 1 or higher'
          });
        }
        
        // Check required fields
        if (!row.TaskName || row.TaskName.trim() === '') {
          errors.push({
            id: `empty-task-name-${row.TaskID || index}`,
            row: index,
            column: 'TaskName',
            message: 'TaskName cannot be empty',
            severity: 'error',
            suggestion: 'Provide a valid task name'
          });
        }
      });
    }

    return errors;
  };

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
      const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY;
      
      if (!apiKey) {
        throw new Error('AI API key not configured. Please set NEXT_PUBLIC_AI_API_KEY environment variable.');
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
      const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY;
      
      if (!apiKey) {
        console.log('No API key configured, using fallback search');
        throw new Error('AI API key not configured. Please set NEXT_PUBLIC_AI_API_KEY environment variable.');
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
                onRunComprehensiveValidation={() => runComprehensiveValidation(dataSheets)}
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