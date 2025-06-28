'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AdjustmentsHorizontalIcon, 
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Priority } from '@/types';
import { cn } from '@/utils/cn';

interface PriorityControlsProps {
  priorities: Priority[];
  onPriorityUpdate: (priorities: Priority[]) => void;
}

export function PriorityControls({ priorities, onPriorityUpdate }: PriorityControlsProps) {
  const [localPriorities, setLocalPriorities] = useState(priorities);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    setLocalPriorities(priorities);
  }, [priorities]);

  const handleWeightChange = (id: string, newWeight: number) => {
    const updated = localPriorities.map(priority =>
      priority.id === id ? { ...priority, weight: newWeight } : priority
    );
    
    // Normalize weights to sum to 1
    const totalWeight = updated.reduce((sum, p) => sum + p.weight, 0);
    const normalized = updated.map(p => ({
      ...p,
      weight: totalWeight > 0 ? p.weight / totalWeight : 1 / updated.length
    }));
    
    setLocalPriorities(normalized);
    onPriorityUpdate(normalized);
  };

  const applyPreset = (preset: 'balanced' | 'cost-focused' | 'speed-focused' | 'quality-focused') => {
    let newWeights: Record<string, number> = {};
    
    switch (preset) {
      case 'balanced':
        newWeights = { '1': 0.33, '2': 0.33, '3': 0.34 };
        break;
      case 'cost-focused':
        newWeights = { '1': 0.6, '2': 0.2, '3': 0.2 };
        break;
      case 'speed-focused':
        newWeights = { '1': 0.2, '2': 0.6, '3': 0.2 };
        break;
      case 'quality-focused':
        newWeights = { '1': 0.2, '2': 0.2, '3': 0.6 };
        break;
    }

    const updated = localPriorities.map(priority => ({
      ...priority,
      weight: newWeights[priority.id] || priority.weight
    }));

    setLocalPriorities(updated);
    onPriorityUpdate(updated);
  };

  const getPriorityIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('cost')) return CurrencyDollarIcon;
    if (lowerName.includes('speed') || lowerName.includes('time')) return ClockIcon;
    if (lowerName.includes('quality')) return SparklesIcon;
    return ChartBarIcon;
  };

  const getPriorityColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('cost')) return 'text-green-600 bg-green-100';
    if (lowerName.includes('speed') || lowerName.includes('time')) return 'text-blue-600 bg-blue-100';
    if (lowerName.includes('quality')) return 'text-purple-600 bg-purple-100';
    return 'text-gray-600 bg-gray-100';
  };

  const presets = [
    { id: 'balanced', name: 'Balanced', description: 'Equal priority across all factors' },
    { id: 'cost-focused', name: 'Cost Focused', description: 'Minimize operational costs' },
    { id: 'speed-focused', name: 'Speed Focused', description: 'Complete tasks quickly' },
    { id: 'quality-focused', name: 'Quality Focused', description: 'Ensure highest quality results' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Priority Controls</h3>
          </div>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Presets
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Adjust how the system should balance different priorities when allocating resources.
        </p>

        {/* Presets */}
        {showPresets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-blue-50 rounded-lg"
          >
            <h5 className="text-sm font-medium text-blue-900 mb-2">Quick Presets:</h5>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id as any)}
                  className="text-left p-2 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                >
                  <div className="text-sm font-medium text-blue-900">{preset.name}</div>
                  <div className="text-xs text-blue-700">{preset.description}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4">
        <div className="space-y-6">
          {localPriorities.map((priority) => {
            const IconComponent = getPriorityIcon(priority.name);
            const colorClass = getPriorityColor(priority.name);
            
            return (
              <motion.div
                key={priority.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn('p-2 rounded-lg', colorClass)}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{priority.name}</h4>
                      <p className="text-sm text-gray-600">{priority.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {Math.round(priority.weight * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Weight</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500 w-8">0%</span>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={priority.weight}
                        onChange={(e) => handleWeightChange(priority.id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${priority.weight * 100}%, #e5e7eb ${priority.weight * 100}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-10">100%</span>
                  </div>

                  {/* Visual weight bar */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${priority.weight * 100}%` }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        'h-full rounded-full',
                        priority.name.toLowerCase().includes('cost') ? 'bg-green-500' :
                        priority.name.toLowerCase().includes('speed') ? 'bg-blue-500' :
                        priority.name.toLowerCase().includes('quality') ? 'bg-purple-500' :
                        'bg-gray-500'
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Current Allocation Strategy</h5>
          <div className="space-y-2">
            {localPriorities
              .sort((a, b) => b.weight - a.weight)
              .map((priority, index) => (
                <div key={priority.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {priority.name}
                  </span>
                  <span className="font-medium text-gray-900">
                    {Math.round(priority.weight * 100)}%
                  </span>
                </div>
              ))}
          </div>
          
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Strategy:</strong> The system will {
                localPriorities.find(p => p.weight === Math.max(...localPriorities.map(pr => pr.weight)))?.name.toLowerCase()
              } while balancing other factors according to their weights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 