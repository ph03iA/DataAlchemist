'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SparklesIcon, 
  CheckIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { DataSheet, DataModificationSuggestion } from '@/types';
import { createAIProvider } from '@/lib/ai-provider';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface DataCorrectionsPanelProps {
  dataSheets: DataSheet[];
  onDataUpdate: (sheetId: string, data: any[]) => void;
}

export function DataCorrectionsPanel({ dataSheets, onDataUpdate }: DataCorrectionsPanelProps) {
  const [corrections, setCorrections] = useState<DataModificationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(new Set());
  const [lastAnalyzedData, setLastAnalyzedData] = useState<string>('');
  const [analysisCount, setAnalysisCount] = useState<Record<string, number>>({});

  const generateCorrections = useCallback(async (sheetId: string) => {
    const sheet = dataSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    // Prevent too frequent analysis of the same sheet
    const currentCount = analysisCount[sheetId] || 0;
    if (currentCount >= 3) {
      toast.error('Maximum analysis attempts reached for this sheet. Use "Reset" to try again.');
      return;
    }

    // Check if data has changed since last analysis
    const dataHash = JSON.stringify(sheet.data);
    if (dataHash === lastAnalyzedData && selectedSheet === sheetId) {
      toast.success('Data unchanged - no new analysis needed');
      return;
    }

    setIsLoading(true);
    setSelectedSheet(sheetId);
    setAnalysisCount(prev => ({ ...prev, [sheetId]: currentCount + 1 }));
    
    try {
              const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY;
        
                if (!apiKey) {
          console.log('AI API key not configured, skipping AI corrections');
          return;
        }
      
      const aiProvider = createAIProvider('gemini', apiKey);
      const suggestions = await aiProvider.suggestDataCorrections(sheet.data, sheet.type);
      
      // Filter out corrections that have already been applied or dismissed
      const newCorrections = suggestions.filter(suggestion => {
        const correctionKey = `${sheetId}-${suggestion.row}-${suggestion.column}-${suggestion.currentValue}`;
        return !appliedCorrections.has(correctionKey);
      });
      
      setCorrections(newCorrections);
      setLastAnalyzedData(dataHash);
      
      if (newCorrections.length === 0) {
        toast.success('No new corrections needed - your data looks good!');
      } else {
        toast.success(`Found ${newCorrections.length} correction suggestions`);
      }
    } catch (error) {
      console.error('Failed to generate corrections:', error);
      toast.error('Failed to generate AI corrections');
      setCorrections([]);
    } finally {
      setIsLoading(false);
    }
  }, [dataSheets, appliedCorrections, lastAnalyzedData, selectedSheet, analysisCount]);

  const applyCorrection = useCallback((correction: DataModificationSuggestion) => {
    if (!selectedSheet) return;
    
    const sheet = dataSheets.find(s => s.id === selectedSheet);
    if (!sheet) return;

    const updatedData = sheet.data.map((row, index) => {
      if (index === correction.row) {
        return {
          ...row,
          [correction.column]: correction.suggestedValue
        };
      }
      return row;
    });

    onDataUpdate(selectedSheet, updatedData);
    
    // Mark this correction as applied
    const correctionKey = `${selectedSheet}-${correction.row}-${correction.column}-${correction.currentValue}`;
    setAppliedCorrections(prev => new Set([...Array.from(prev), correctionKey]));
    
    // Remove applied correction from current list
    setCorrections(prev => prev.filter(c => c.id !== correction.id));
    
    // Clear the last analyzed data to allow re-analysis with new data
    setLastAnalyzedData('');
    
    toast.success('Correction applied successfully');
  }, [selectedSheet, dataSheets, onDataUpdate]);

  const applyAllCorrections = useCallback(() => {
    if (!selectedSheet) return;
    
    const sheet = dataSheets.find(s => s.id === selectedSheet);
    if (!sheet) return;

    let updatedData = [...sheet.data];
    const appliedKeys: string[] = [];
    
    corrections.forEach(correction => {
      if (correction.autoApplyable && correction.confidence > 0.7) {
        updatedData[correction.row] = {
          ...updatedData[correction.row],
          [correction.column]: correction.suggestedValue
        };
        
        // Track applied corrections
        const correctionKey = `${selectedSheet}-${correction.row}-${correction.column}-${correction.currentValue}`;
        appliedKeys.push(correctionKey);
      }
    });

    if (appliedKeys.length > 0) {
      onDataUpdate(selectedSheet, updatedData);
      
      // Mark all applied corrections
      setAppliedCorrections(prev => new Set([...Array.from(prev), ...appliedKeys]));
      
      // Remove applied corrections from current list
      setCorrections(prev => prev.filter(c => !(c.autoApplyable && c.confidence > 0.7)));
      
      // Clear the last analyzed data
      setLastAnalyzedData('');
      
      toast.success(`Applied ${appliedKeys.length} corrections successfully`);
    } else {
      toast.success('No auto-applicable corrections found');
    }
  }, [selectedSheet, dataSheets, corrections, onDataUpdate]);

  const dismissCorrection = useCallback((correctionId: string) => {
    const correction = corrections.find(c => c.id === correctionId);
    if (correction && selectedSheet) {
      // Mark as dismissed so it won't appear again
      const correctionKey = `${selectedSheet}-${correction.row}-${correction.column}-${correction.currentValue}`;
      setAppliedCorrections(prev => new Set([...Array.from(prev), correctionKey]));
    }
    
    setCorrections(prev => prev.filter(c => c.id !== correctionId));
  }, [corrections, selectedSheet]);

  const resetCorrections = useCallback(() => {
    setAppliedCorrections(new Set());
    setLastAnalyzedData('');
    setCorrections([]);
    setAnalysisCount({});
    setSelectedSheet(null);
    toast.success('Correction history cleared - ready for fresh analysis');
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const autoApplicableCount = corrections.filter(c => c.autoApplyable && c.confidence > 0.7).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Data Corrections</h3>
          </div>
          
          {appliedCorrections.size > 0 && (
            <button
              onClick={resetCorrections}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Reset ({appliedCorrections.size} applied)
            </button>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Let AI analyze your data and suggest corrections for common issues.
        </p>

        {/* Sheet Selection */}
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-700">Select a sheet to analyze:</h5>
          <div className="space-y-2">
            {dataSheets.map(sheet => {
              const analysisCountForSheet = analysisCount[sheet.id] || 0;
              const maxAnalysisReached = analysisCountForSheet >= 3;
              
              return (
                <button
                  key={sheet.id}
                  onClick={() => generateCorrections(sheet.id)}
                  disabled={isLoading || maxAnalysisReached}
                  className={cn(
                    'w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors',
                    selectedSheet === sheet.id 
                      ? 'border-purple-300 bg-purple-50'
                      : maxAnalysisReached
                      ? 'border-gray-300 bg-gray-100 opacity-60'
                      : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <div>
                    <div className="font-medium text-gray-900">{sheet.name}</div>
                    <div className="text-sm text-gray-600">
                      {sheet.data.length} rows • {sheet.type}
                      {analysisCountForSheet > 0 && (
                        <span className="ml-2 text-purple-600">
                          • Analyzed {analysisCountForSheet}/3 times
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {maxAnalysisReached ? (
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        Max reached
                      </span>
                    ) : isLoading && selectedSheet === sheet.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    ) : (
                      <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Corrections List */}
      <div className="p-4">
        {corrections.length === 0 && !isLoading ? (
          <div className="text-center py-8">
            <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Corrections Found</h4>
            <p className="text-gray-600">
              {selectedSheet ? 'Your data looks good! No AI corrections needed.' : 'Select a sheet to analyze for potential corrections.'}
            </p>
            {appliedCorrections.size > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {appliedCorrections.size} corrections have been applied to your data.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Auto-apply section */}
            {autoApplicableCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-green-900">Auto-applicable Corrections</h5>
                    <p className="text-sm text-green-700">
                      {autoApplicableCount} high-confidence corrections can be applied automatically
                    </p>
                  </div>
                  <button
                    onClick={applyAllCorrections}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Apply All
                  </button>
                </div>
              </div>
            )}

            {/* Individual corrections */}
            <div className="space-y-3">
              {corrections.map((correction, index) => (
                <motion.div
                  key={correction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Row {correction.row + 1}, {correction.column}
                        </span>
                        <span className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          getConfidenceColor(correction.confidence)
                        )}>
                          {Math.round(correction.confidence * 100)}% confidence
                        </span>
                        {correction.autoApplyable && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            Auto-applicable
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-600">Current:</span>
                          <code className="px-2 py-1 bg-red-50 text-red-800 rounded">
                            {String(correction.currentValue)}
                          </code>
                          <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Suggested:</span>
                          <code className="px-2 py-1 bg-green-50 text-green-800 rounded">
                            {String(correction.suggestedValue)}
                          </code>
                        </div>
                        
                        <p className="text-sm text-gray-700">{correction.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => applyCorrection(correction)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Apply correction"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => dismissCorrection(correction.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Dismiss correction"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 