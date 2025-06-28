'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  LightBulbIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { BusinessRule, RuleSuggestion, Client, Worker, Task } from '@/types';
import { createAIProvider } from '@/lib/ai-provider';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface RulesCreatorProps {
  rules: BusinessRule[];
  onRuleCreate: (naturalLanguage: string) => void;
  onRuleUpdate: (id: string, updates: Partial<BusinessRule>) => void;
  onRuleDelete: (id: string) => void;
  isProcessing: boolean;
  // New props for AI suggestions
  clients?: Client[];
  workers?: Worker[];
  tasks?: Task[];
}

export function RulesCreator({ 
  rules, 
  onRuleCreate, 
  onRuleUpdate, 
  onRuleDelete, 
  isProcessing,
  clients = [],
  workers = [],
  tasks = []
}: RulesCreatorProps) {
  const [newRuleText, setNewRuleText] = useState('');
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<RuleSuggestion[]>([]);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);

  const handleCreateRule = async () => {
    if (!newRuleText.trim()) return;
    
    await onRuleCreate(newRuleText);
    setNewRuleText('');
  };

  const handleEditRule = (rule: BusinessRule) => {
    setEditingRule(rule.id);
    setEditText(rule.naturalLanguage);
  };

  const handleSaveEdit = async () => {
    if (!editingRule || !editText.trim()) return;
    
    // Generate new rule config from updated text
    await onRuleCreate(editText);
    onRuleDelete(editingRule);
    setEditingRule(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setEditText('');
  };

  const toggleRuleActive = (id: string, isActive: boolean) => {
    onRuleUpdate(id, { isActive });
  };

  const getAiSuggestions = async () => {
    if (clients.length === 0 && workers.length === 0 && tasks.length === 0) {
      toast.error('No data available for AI suggestions');
      return;
    }

    setIsLoadingAiSuggestions(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || 'AIzaSyCVhx0OqlKD7VxQqPxsLyTCFndgXcZN-So';
      if (!apiKey) {
        throw new Error('No API key available');
      }
      
      const aiProvider = createAIProvider('gemini', apiKey);
      const suggestions = await aiProvider.suggestRules(clients, workers, tasks);
      
      setAiSuggestions(suggestions);
      toast.success(`Found ${suggestions.length} AI rule suggestions`);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      toast.error('Failed to get AI rule suggestions');
      setAiSuggestions([]);
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  };

  const ruleSuggestions = [
    "Assign tasks to workers based on their skill level and availability",
    "Prioritize high-value clients for urgent tasks",
    "Balance workload evenly across all available workers",
    "Complete tasks with approaching deadlines first",
    "Match client preferences with worker specializations",
    "Minimize travel time between client locations",
    "Ensure quality by assigning senior workers to complex tasks",
    "Keep project costs under the specified budget limit"
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Cog6ToothIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Business Rules</h3>
          </div>
          <div className="text-sm text-gray-600">
            {rules.filter(r => r.isActive).length} active • {rules.length} total
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Create business rules in plain English. Our AI will convert them into proper configurations.
        </p>

        {/* Rule Creation */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <div className="flex-1">
              <textarea
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="Describe your business rule in plain English..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2}
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={handleCreateRule}
              disabled={!newRuleText.trim() || isProcessing}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                'flex items-center space-x-2',
                newRuleText.trim() && !isProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              <span>Create</span>
            </button>
          </div>

          {/* Suggestions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <LightBulbIcon className="h-4 w-4" />
              <span>Show suggestions</span>
            </button>
            
            <button
              onClick={getAiSuggestions}
              disabled={isLoadingAiSuggestions || (clients.length === 0 && workers.length === 0 && tasks.length === 0)}
              className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
            >
              {isLoadingAiSuggestions ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              ) : (
                <LightBulbIcon className="h-4 w-4" />
              )}
              <span>Get AI suggestions</span>
            </button>
          </div>

          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Manual Suggestions */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Common Rule Templates:</h5>
                  <div className="space-y-1">
                    {ruleSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setNewRuleText(suggestion)}
                        className="block w-full text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-purple-900 mb-2">AI-Generated Suggestions:</h5>
                    <div className="space-y-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.id}
                          className="bg-white rounded p-3 border border-purple-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-purple-900 mb-1">
                                {suggestion.naturalLanguage}
                              </div>
                              <div className="text-xs text-purple-700 mb-2">
                                {suggestion.reasoning}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                  {Math.round(suggestion.confidence * 100)}% confidence
                                </span>
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                  {suggestion.ruleType}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setNewRuleText(suggestion.naturalLanguage)}
                              className="ml-3 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Rules List */}
      <div className="p-4">
        {rules.length === 0 ? (
          <div className="text-center py-8">
            <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Rules Created</h4>
            <p className="text-gray-600">
              Create your first business rule to guide data processing and allocation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'border rounded-lg p-4 transition-all',
                  rule.isActive 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingRule === rule.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            <CheckIcon className="h-4 w-4" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h5 className="font-medium text-gray-900">{rule.name}</h5>
                          <span className={cn(
                            'inline-block px-2 py-1 text-xs font-medium rounded',
                            rule.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          )}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{rule.naturalLanguage}</p>
                        <p className="text-xs text-gray-500">
                          Created: {rule.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => toggleRuleActive(rule.id, !rule.isActive)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        rule.isActive 
                          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                      title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit rule"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onRuleDelete(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete rule"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 