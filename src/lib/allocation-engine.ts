import { BusinessRule, Client, Worker, Task, Priority } from '@/types';

export interface AllocationResult {
  taskId: string;
  taskName: string;
  assignedWorkerIds: string[];
  assignedWorkerNames: string[];
  clientId: string;
  clientName: string;
  phase: number;
  priority: number;
  reasoning: string;
  confidence: number;
}

export interface AllocationSummary {
  totalTasks: number;
  assignedTasks: number;
  unassignedTasks: number;
  workerUtilization: Record<string, number>;
  phaseDistribution: Record<number, number>;
  priorityDistribution: Record<number, number>;
  executedRules: string[];
  warnings: string[];
  allocations: AllocationResult[];
}

export class AllocationEngine {
  private clients: Client[];
  private workers: Worker[];
  private tasks: Task[];
  private rules: BusinessRule[];
  private priorities: Priority[];

  constructor(
    clients: Client[], 
    workers: Worker[], 
    tasks: Task[], 
    rules: BusinessRule[], 
    priorities: Priority[]
  ) {
    this.clients = clients;
    this.workers = workers;
    this.tasks = tasks;
    this.rules = rules.filter(rule => rule.isActive);
    this.priorities = priorities;
  }

  public async executeAllocation(): Promise<AllocationSummary> {
    const allocations: AllocationResult[] = [];
    const executedRules: string[] = [];
    const warnings: string[] = [];
    const workerUtilization: Record<string, number> = {};
    const phaseDistribution: Record<number, number> = {};
    const priorityDistribution: Record<number, number> = {};

    // Initialize worker utilization tracking
    this.workers.forEach(worker => {
      workerUtilization[worker.WorkerID] = 0;
    });

    // Get all client-requested tasks with their priorities
    const taskQueue = this.buildTaskQueue();

    // Process each task for allocation
    for (const taskInfo of taskQueue) {
      const allocation = await this.allocateTask(taskInfo);
      
      if (allocation) {
        allocations.push(allocation);
        
        // Update utilization tracking
        allocation.assignedWorkerIds.forEach(workerId => {
          workerUtilization[workerId] += taskInfo.task.Duration;
        });

        // Track phase distribution
        phaseDistribution[allocation.phase] = (phaseDistribution[allocation.phase] || 0) + 1;
        
        // Track priority distribution
        priorityDistribution[allocation.priority] = (priorityDistribution[allocation.priority] || 0) + 1;
      } else {
        warnings.push(`Could not allocate task: ${taskInfo.task.TaskName}`);
      }
    }

    // Identify which rules were actually used
    this.rules.forEach(rule => {
      if (this.wasRuleExecuted(rule, allocations)) {
        executedRules.push(rule.name);
      }
    });

    return {
      totalTasks: taskQueue.length,
      assignedTasks: allocations.length,
      unassignedTasks: taskQueue.length - allocations.length,
      workerUtilization,
      phaseDistribution,
      priorityDistribution,
      executedRules,
      warnings,
      allocations
    };
  }

  private buildTaskQueue(): Array<{task: Task, client: Client, priority: number}> {
    const taskQueue: Array<{task: Task, client: Client, priority: number}> = [];

    this.clients.forEach(client => {
      const requestedTaskIds = client.RequestedTaskIDs.split(',').map(id => id.trim());
      
      requestedTaskIds.forEach(taskId => {
        const task = this.tasks.find(t => t.TaskID === taskId);
        if (task) {
          taskQueue.push({
            task,
            client,
            priority: client.PriorityLevel
          });
        }
      });
    });

    // Sort by priority and apply priority weights
    return taskQueue.sort((a, b) => {
      const priorityWeight = this.getPriorityWeight();
      return (b.priority * priorityWeight) - (a.priority * priorityWeight);
    });
  }

  private async allocateTask(taskInfo: {task: Task, client: Client, priority: number}): Promise<AllocationResult | null> {
    const { task, client, priority } = taskInfo;
    
    // Find eligible workers for this task
    const eligibleWorkers = this.findEligibleWorkers(task);
    
    if (eligibleWorkers.length === 0) {
      return null;
    }

    // Apply business rules to select best workers and phase
    const selectedWorkers = this.applyBusinessRules(task, client, eligibleWorkers);
    const selectedPhase = this.selectOptimalPhase(task, selectedWorkers);
    
    if (selectedWorkers.length === 0) {
      return null;
    }

    // Generate reasoning based on applied rules
    const reasoning = this.generateAllocationReasoning(task, client, selectedWorkers, selectedPhase);

    return {
      taskId: task.TaskID,
      taskName: task.TaskName,
      assignedWorkerIds: selectedWorkers.map(w => w.WorkerID),
      assignedWorkerNames: selectedWorkers.map(w => w.WorkerName),
      clientId: client.ClientID,
      clientName: client.ClientName,
      phase: selectedPhase,
      priority,
      reasoning,
      confidence: this.calculateConfidence(task, selectedWorkers, selectedPhase)
    };
  }

  private findEligibleWorkers(task: Task): Worker[] {
    const requiredSkills = task.RequiredSkills.split(',').map(skill => skill.trim());
    
    return this.workers.filter(worker => {
      const workerSkills = worker.Skills.split(',').map(skill => skill.trim());
      
      // Check if worker has all required skills
      const hasAllSkills = requiredSkills.every(skill => 
        workerSkills.some(ws => ws.toLowerCase() === skill.toLowerCase())
      );
      
      // Check if worker has available slots
      const availableSlots = this.parseSlots(worker.AvailableSlots);
      const hasAvailableSlots = availableSlots.length > 0;
      
      return hasAllSkills && hasAvailableSlots;
    });
  }

  private applyBusinessRules(task: Task, client: Client, eligibleWorkers: Worker[]): Worker[] {
    let selectedWorkers = [...eligibleWorkers];

    // Apply each active business rule
    this.rules.forEach(rule => {
      selectedWorkers = this.applySpecificRule(rule, task, client, selectedWorkers);
    });

    // Ensure we don't exceed MaxConcurrent
    const maxConcurrent = Math.min(task.MaxConcurrent, selectedWorkers.length);
    selectedWorkers = selectedWorkers.slice(0, maxConcurrent);

    return selectedWorkers;
  }

  private applySpecificRule(rule: BusinessRule, task: Task, client: Client, workers: Worker[]): Worker[] {
    const ruleText = rule.naturalLanguage.toLowerCase();
    
    // Rule: Prioritize senior/experienced workers
    if (ruleText.includes('senior') || ruleText.includes('experienced') || ruleText.includes('expert')) {
      return workers.sort((a, b) => Number(b.QualificationLevel) - Number(a.QualificationLevel));
    }
    
    // Rule: Assign based on qualification level
    if (ruleText.includes('qualification') || ruleText.includes('level')) {
      return workers.sort((a, b) => Number(b.QualificationLevel) - Number(a.QualificationLevel));
    }
    
    // Rule: Balance workload
    if (ruleText.includes('balance') || ruleText.includes('distribute') || ruleText.includes('evenly')) {
      return workers.sort((a, b) => {
        const aUtilization = this.getCurrentUtilization(a.WorkerID);
        const bUtilization = this.getCurrentUtilization(b.WorkerID);
        return aUtilization - bUtilization;
      });
    }
    
    // Rule: Minimize cost
    if (ruleText.includes('cost') || ruleText.includes('budget') || ruleText.includes('cheap')) {
      // Prefer workers with lower qualification levels (assuming they cost less)
      return workers.sort((a, b) => Number(a.QualificationLevel) - Number(b.QualificationLevel));
    }
    
    // Rule: Prioritize high-priority clients
    if (ruleText.includes('high priority') || ruleText.includes('urgent')) {
      if (client.PriorityLevel >= 4) {
        // For high priority clients, prefer senior workers
        return workers.sort((a, b) => Number(b.QualificationLevel) - Number(a.QualificationLevel));
      }
    }
    
    // Rule: Match worker group preferences
    if (ruleText.includes('group') || ruleText.includes('team')) {
      // Try to assign workers from the same group when possible
      const groups = workers.reduce((acc, worker) => {
        acc[worker.WorkerGroup] = acc[worker.WorkerGroup] || [];
        acc[worker.WorkerGroup].push(worker);
        return acc;
      }, {} as Record<string, Worker[]>);
      
      // Find the largest group
      const largestGroup = Object.values(groups).reduce((largest, current) => 
        current.length > largest.length ? current : largest, []
      );
      
      return largestGroup.length > 1 ? largestGroup : workers;
    }

    return workers;
  }

  private selectOptimalPhase(task: Task, workers: Worker[]): number {
    const preferredPhases = this.parsePhases(task.PreferredPhases);
    
    if (preferredPhases.length === 0) {
      return 1; // Default phase
    }

    // Find phase where most workers are available
    const phaseScores: Record<number, number> = {};
    
    preferredPhases.forEach(phase => {
      phaseScores[phase] = workers.filter(worker => {
        const availableSlots = this.parseSlots(worker.AvailableSlots);
        return availableSlots.includes(phase);
      }).length;
    });

    // Return phase with highest worker availability
    return Object.entries(phaseScores).reduce((best, [phase, score]) => 
      score > phaseScores[best] ? parseInt(phase) : best, preferredPhases[0]
    );
  }

  private generateAllocationReasoning(task: Task, client: Client, workers: Worker[], phase: number): string {
    const reasons: string[] = [];
    
    reasons.push(`Assigned ${workers.length} worker(s) with required skills: ${task.RequiredSkills}`);
    
    if (client.PriorityLevel >= 4) {
      reasons.push(`High priority client (Level ${client.PriorityLevel}) - assigned senior workers`);
    }
    
    if (workers.length > 1) {
      reasons.push(`Team allocation for better collaboration`);
    }
    
    const avgQualification = workers.reduce((sum, w) => sum + Number(w.QualificationLevel), 0) / workers.length;
    if (avgQualification >= 8) {
      reasons.push(`Senior workers selected for complex task`);
    } else if (avgQualification <= 5) {
      reasons.push(`Junior workers selected for cost optimization`);
    }
    
    reasons.push(`Scheduled for Phase ${phase} based on availability and preferences`);
    
    return reasons.join('. ') + '.';
  }

  private calculateConfidence(task: Task, workers: Worker[], phase: number): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if all workers have required skills
    const requiredSkills = task.RequiredSkills.split(',').map(s => s.trim());
    const skillCoverage = workers.every(worker => {
      const workerSkills = worker.Skills.split(',').map(s => s.trim());
      return requiredSkills.every(skill => 
        workerSkills.some(ws => ws.toLowerCase() === skill.toLowerCase())
      );
    });
    
    if (skillCoverage) confidence += 0.3;
    
    // Higher confidence if workers are available in selected phase
    const phaseAvailability = workers.every(worker => {
      const availableSlots = this.parseSlots(worker.AvailableSlots);
      return availableSlots.includes(phase);
    });
    
    if (phaseAvailability) confidence += 0.2;
    
    // Higher confidence if not overloading workers
    const notOverloaded = workers.every(worker => {
      const currentUtilization = this.getCurrentUtilization(worker.WorkerID);
      return currentUtilization + task.Duration <= worker.MaxLoadPerPhase;
    });
    
    if (notOverloaded) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private getPriorityWeight(): number {
    const speedPriority = this.priorities.find(p => p.name.toLowerCase().includes('speed'));
    return speedPriority ? speedPriority.weight : 0.5;
  }

  private getCurrentUtilization(workerId: string): number {

    return 0;
  }

  private wasRuleExecuted(rule: BusinessRule, allocations: AllocationResult[]): boolean {
    // Check if the rule's logic influenced any allocations
    const ruleText = rule.naturalLanguage.toLowerCase();
    
    return allocations.some(allocation => 
      allocation.reasoning.toLowerCase().includes(ruleText.split(' ')[0]) ||
      allocation.reasoning.toLowerCase().includes('senior') && ruleText.includes('senior') ||
      allocation.reasoning.toLowerCase().includes('balance') && ruleText.includes('balance') ||
      allocation.reasoning.toLowerCase().includes('cost') && ruleText.includes('cost')
    );
  }

  private parseSlots(slots: string): number[] {
    try {
      return JSON.parse(slots);
    } catch {
      return [];
    }
  }

  private parsePhases(phases: string): number[] {
    try {
      if (phases.includes('-')) {
        const [start, end] = phases.split('-').map(n => parseInt(n.trim()));
        return Array.from({length: end - start + 1}, (_, i) => start + i);
      }
      return JSON.parse(phases);
    } catch {
      return [1]; // Default to phase 1
    }
  }
} 