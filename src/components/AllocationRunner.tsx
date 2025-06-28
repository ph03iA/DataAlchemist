'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon, 
  StopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { BusinessRule, Client, Worker, Task, Priority, DataSheet } from '@/types';
import { AllocationEngine, AllocationSummary, AllocationResult } from '@/lib/allocation-engine';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface AllocationRunnerProps {
  dataSheets: DataSheet[];
  businessRules: BusinessRule[];
  priorities: Priority[];
}

export function AllocationRunner({ dataSheets, businessRules, priorities }: AllocationRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [allocationResults, setAllocationResults] = useState<AllocationSummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const canRunAllocation = () => {
    const hasClients = dataSheets.some(sheet => sheet.type === 'clients' && sheet.data.length > 0);
    const hasWorkers = dataSheets.some(sheet => sheet.type === 'workers' && sheet.data.length > 0);
    const hasTasks = dataSheets.some(sheet => sheet.type === 'tasks' && sheet.data.length > 0);
    const hasActiveRules = businessRules.some(rule => rule.isActive);
    
    return hasClients && hasWorkers && hasTasks && hasActiveRules;
  };

  const runAllocation = async () => {
    if (!canRunAllocation()) {
      toast.error('Need clients, workers, tasks, and at least one active rule to run allocation');
      return;
    }

    setIsRunning(true);
    try {
      // Extract data by type
      const clients = dataSheets.filter(sheet => sheet.type === 'clients').flatMap(sheet => sheet.data) as unknown as Client[];
      const workers = dataSheets.filter(sheet => sheet.type === 'workers').flatMap(sheet => sheet.data) as unknown as Worker[];
      const tasks = dataSheets.filter(sheet => sheet.type === 'tasks').flatMap(sheet => sheet.data) as unknown as Task[];

      // Create and run allocation engine
      const engine = new AllocationEngine(clients, workers, tasks, businessRules, priorities);
      const results = await engine.executeAllocation();
      
      setAllocationResults(results);
      toast.success(`Allocation complete! Assigned ${results.assignedTasks}/${results.totalTasks} tasks`);
    } catch (error) {
      console.error('Allocation failed:', error);
      toast.error('Allocation failed. Please check your data and rules.');
    } finally {
      setIsRunning(false);
    }
  };

  const resetAllocation = () => {
    setAllocationResults(null);
    setShowDetails(false);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 50) return 'text-green-600 bg-green-100';
    if (utilization <= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const renderAllocationCard = (allocation: AllocationResult) => (
    <div key={allocation.taskId} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{allocation.taskName}</h4>
          <p className="text-sm text-gray-600">Client: {allocation.clientName}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded',
            allocation.priority >= 4 ? 'bg-red-100 text-red-700' :
            allocation.priority >= 3 ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          )}>
            Priority {allocation.priority}
          </span>
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded',
            allocation.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
            allocation.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            {Math.round(allocation.confidence * 100)}% confidence
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <UsersIcon className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-gray-700">
            Workers: {allocation.assignedWorkerNames.join(', ')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-4 w-4 text-purple-500" />
          <span className="text-sm text-gray-700">Phase: {allocation.phase}</span>
        </div>
      </div>
      
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">{allocation.reasoning}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Rule Execution Engine</h3>
          </div>
          
          {allocationResults && (
            <button
              onClick={resetAllocation}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Reset
            </button>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Execute your business rules to perform actual resource allocation and task assignment.
        </p>

        {!allocationResults ? (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">Ready to Execute:</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    dataSheets.some(s => s.type === 'clients' && s.data.length > 0) ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span>Clients Data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    dataSheets.some(s => s.type === 'workers' && s.data.length > 0) ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span>Workers Data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    dataSheets.some(s => s.type === 'tasks' && s.data.length > 0) ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span>Tasks Data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    businessRules.some(r => r.isActive) ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span>Active Rules</span>
                </div>
              </div>
            </div>

            <button
              onClick={runAllocation}
              disabled={!canRunAllocation() || isRunning}
              className={cn(
                'w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors',
                canRunAllocation() && !isRunning
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Running Allocation...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5" />
                  <span>Execute Business Rules</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Allocation Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-800">{allocationResults.assignedTasks}</div>
                <div className="text-sm text-green-600">Tasks Assigned</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-800">{allocationResults.unassignedTasks}</div>
                <div className="text-sm text-red-600">Unassigned</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{allocationResults.executedRules.length}</div>
                <div className="text-sm text-blue-600">Rules Applied</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-800">
                  {Math.round((allocationResults.assignedTasks / allocationResults.totalTasks) * 100)}%
                </div>
                <div className="text-sm text-purple-600">Success Rate</div>
              </div>
            </div>

            {/* Executed Rules */}
            {allocationResults.executedRules.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-medium text-green-900 mb-2">Successfully Applied Rules:</h5>
                <div className="space-y-1">
                  {allocationResults.executedRules.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {allocationResults.warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h5 className="font-medium text-yellow-900 mb-2">Warnings:</h5>
                <div className="space-y-1">
                  {allocationResults.warnings.map((warning, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worker Utilization */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Worker Utilization:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(allocationResults.workerUtilization).map(([workerId, utilization]) => (
                  <div key={workerId} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="text-sm font-medium text-gray-700">{workerId}</span>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded',
                      getUtilizationColor(utilization)
                    )}>
                      {utilization}h
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ChartBarIcon className="h-4 w-4" />
              <span>{showDetails ? 'Hide' : 'Show'} Allocation Details</span>
            </button>

            {/* Detailed Allocations */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <h5 className="font-medium text-gray-900">Task Allocations:</h5>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {allocationResults.allocations.map(renderAllocationCard)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
} 