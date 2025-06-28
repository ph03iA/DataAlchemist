'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  SparklesIcon, 
  XMarkIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { DataModificationSuggestion } from '@/types';
import { createAIProvider } from '@/lib/ai-provider';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface AISearchProps {
  onSearch: (query: string, filters?: any) => Promise<any[]>;
  onDataModification?: (modifications: DataModificationSuggestion[]) => void;
  activeSheetData?: any[];
  activeSheetType?: 'clients' | 'workers' | 'tasks';
  placeholder?: string;
}

export function AISearch({ 
  onSearch, 
  onDataModification,
  activeSheetData = [],
  activeSheetType,
  placeholder = "Search your data..." 
}: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [modifications, setModifications] = useState<DataModificationSuggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mode, setMode] = useState<'search' | 'modify'>('search');

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setResults([]);
    setModifications([]);
    
    try {
      if (mode === 'search') {
        const searchResults = await onSearch(query);
        setResults(searchResults);
        setShowResults(true);
        toast.success(`Found ${searchResults.length} results`);
      } else if (mode === 'modify' && activeSheetType && onDataModification) {
        // AI-powered data modification
        const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || 'AIzaSyCVhx0OqlKD7VxQqPxsLyTCFndgXcZN-So';
        if (!apiKey) {
          throw new Error('No API key available');
        }
        
        const aiProvider = createAIProvider('gemini', apiKey);
        const modificationSuggestions = await aiProvider.naturalLanguageModification(
          query, 
          activeSheetData, 
          activeSheetType
        );
        
        setModifications(modificationSuggestions);
        setShowResults(true);
        toast.success(`Generated ${modificationSuggestions.length} modification suggestions`);
      }
    } catch (error) {
      console.error('AI operation error:', error);
      toast.error(mode === 'search' ? 'Search failed' : 'Modification analysis failed');
      setResults([]);
      setModifications([]);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  }, [query, onSearch, onDataModification, activeSheetData, activeSheetType, mode, isSearching]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setModifications([]);
    setShowResults(false);
  };

  const applyModification = (modification: DataModificationSuggestion) => {
    if (onDataModification) {
      onDataModification([modification]);
      setModifications(prev => prev.filter(m => m.id !== modification.id));
      toast.success('Modification applied');
    }
  };

  const applyAllModifications = () => {
    if (onDataModification && modifications.length > 0) {
      onDataModification(modifications);
      setModifications([]);
      toast.success('All modifications applied');
    }
  };

  const dismissModification = (modificationId: string) => {
    setModifications(prev => prev.filter(m => m.id !== modificationId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">AI Assistant</h3>
              <p className="text-sm text-slate-600">Smart data discovery and modification</p>
            </div>
          </div>
          
          {/* Mode Selector */}
          <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
            <button
              onClick={() => setMode('search')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2',
                mode === 'search'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              )}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span>Search</span>
            </button>
            <button
              onClick={() => setMode('modify')}
              disabled={!activeSheetType}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2',
                mode === 'modify'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80',
                !activeSheetType && 'opacity-50 cursor-not-allowed'
              )}
            >
              <PencilIcon className="h-4 w-4" />
              <span>Modify</span>
            </button>
          </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/40">
          <p className="text-slate-600 text-sm mb-4">
            {mode === 'search' ? (
              <>✨ Search your data using natural language. Ask questions like <span className="font-semibold">"Show me high-priority tasks"</span> or <span className="font-semibold">"Find workers with Python skills"</span>.</>
            ) : (
              <>🔧 Describe modifications to apply to your data. Try <span className="font-semibold">"Set all priority levels to 3"</span> or <span className="font-semibold">"Add 'Remote' to worker groups"</span>.</>
            )}
          </p>

          {/* Search Input */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="w-full pl-12 pr-12 py-4 border-2 border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm transition-all duration-200 text-black placeholder-gray-400"
                disabled={isSearching}
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
              
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className={cn(
                'px-8 py-4 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg',
                query.trim() && !isSearching
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              )}
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : mode === 'search' ? (
                <MagnifyingGlassIcon className="h-5 w-5" />
              ) : (
                <PencilIcon className="h-5 w-5" />
              )}
              <span>{mode === 'search' ? 'Search' : 'Analyze'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-slate-900">
                  {mode === 'search' ? '🔍 Search Results' : '🔧 Modification Suggestions'} ({mode === 'search' ? results.length : modifications.length})
                </h4>
                <button
                  onClick={() => setShowResults(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {results.length === 0 ? (
                <div className="text-center py-8">
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h5 className="text-lg font-medium text-gray-900 mb-2">No results found</h5>
                  <p className="text-gray-600">
                    Try rephrasing your search or use different keywords.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {results.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="space-y-2">
                        {Object.entries(result)
                          .filter(([key]) => key !== 'id')
                          .slice(0, 4)
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="font-medium text-gray-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="text-gray-900 text-right">
                                {String(value) || 'N/A'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Search Tips */}
              {results.length === 0 && mode === 'search' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h6 className="text-sm font-medium text-blue-900 mb-1">Search Tips:</h6>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use natural language: "Find urgent tasks"</li>
                    <li>• Be specific: "Workers with JavaScript skills"</li>
                    <li>• Try different keywords if no results</li>
                    <li>• Ask questions: "Which clients need follow-up?"</li>
                  </ul>
                </div>
              )}

              {/* Modification Suggestions */}
              {modifications.length > 0 && mode === 'modify' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Modification Suggestions ({modifications.length})
                    </h4>
                    <button
                      onClick={applyAllModifications}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Apply All
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {modifications.map((modification, index) => (
                      <motion.div
                        key={modification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 border border-purple-200 rounded-lg bg-purple-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-purple-900 mb-1">
                              Row {modification.row + 1}, {modification.column}
                            </div>
                            <div className="text-sm text-purple-800 mb-2">
                              {modification.reason}
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <code className="px-2 py-1 bg-red-100 text-red-800 rounded">
                                {String(modification.currentValue)}
                              </code>
                              <span>→</span>
                              <code className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                {String(modification.suggestedValue)}
                              </code>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-3">
                            <button
                              onClick={() => applyModification(modification)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                              title="Apply"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => dismissModification(modification.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Dismiss"
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

              {/* Modification Tips */}
              {modifications.length === 0 && mode === 'modify' && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <h6 className="text-sm font-medium text-purple-900 mb-1">Modification Tips:</h6>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• "Set all priority levels to 3"</li>
                    <li>• "Add 'Remote' to all worker groups"</li>
                    <li>• "Update task durations under 2 to be 2"</li>
                    <li>• "Change client names to Title Case"</li>
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 