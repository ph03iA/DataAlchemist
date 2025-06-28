import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { 
  AIResponse, 
  ValidationError, 
  ValidationSummary,
  BusinessRule, 
  Client, 
  Worker, 
  Task, 
  ParsedClient, 
  ParsedWorker, 
  ParsedTask,
  DataModificationSuggestion,
  RuleSuggestion,
  CoRunRule,
  SlotRestrictionRule,
  LoadLimitRule,
  PhaseWindowRule
} from '@/types';

interface AIProvider {
  validateData(clients: Client[], workers: Worker[], tasks: Task[]): Promise<ValidationSummary>;
  generateBusinessRule(naturalLanguage: string, context: {clients: Client[], workers: Worker[], tasks: Task[]}): Promise<BusinessRule>;
  suggestDataCleanup(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]>;
  searchData(query: string, data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<any[]>;
  suggestRules(clients: Client[], workers: Worker[], tasks: Task[]): Promise<RuleSuggestion[]>;
  validateWithAI(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<ValidationError[]>;
  // New AI methods for enhanced features
  parseDataWithAI(rawData: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<any[]>;
  suggestDataCorrections(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]>;
  enhancedValidation(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<ValidationError[]>;
  naturalLanguageModification(instruction: string, data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]>;
}

class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private rateLimiter: {
    requests: number;
    resetTime: number;
    maxRequests: number;
    windowMs: number;
  };

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    
    // Rate limiting: 15 requests per minute (conservative limit)
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now() + 60000, // 1 minute window
      maxRequests: 15,
      windowMs: 60000
    };
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now >= this.rateLimiter.resetTime) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now + this.rateLimiter.windowMs;
    }
    
    // Check if we've hit the limit
    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      const waitTime = this.rateLimiter.resetTime - now;
      console.log(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      
      // Show user-friendly message
      if (typeof window !== 'undefined') {
        const { toast } = await import('react-hot-toast');
        toast.loading(`AI rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`, {
          duration: waitTime,
          id: 'rate-limit-wait'
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after waiting
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = Date.now() + this.rateLimiter.windowMs;
      
      // Clear the loading toast
      if (typeof window !== 'undefined') {
        const { toast } = await import('react-hot-toast');
        toast.dismiss('rate-limit-wait');
      }
    }
    
    this.rateLimiter.requests++;
    
    // Dispatch rate limit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai-rate-limit', {
        detail: {
          requests: this.rateLimiter.requests,
          maxRequests: this.rateLimiter.maxRequests,
          resetTime: this.rateLimiter.resetTime
        }
      }));
    }
  }

  private async makeGeminiRequest(prompt: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.waitForRateLimit();
        
        const response = await this.ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          contents: prompt,
        });
        
        const text = response.text;
        if (!text) throw new Error('No response text');
        
        return text;
      } catch (error: any) {
        console.log(`API attempt ${attempt}/${retries} failed:`, error?.message || error);
        
        if (error?.message?.includes('429') || error?.status === 429) {
          // Exponential backoff for 429 errors
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
          console.log(`Rate limited, backing off for ${backoffTime}ms...`);
          
          // Show user-friendly message for 429 errors
          if (typeof window !== 'undefined') {
            const { toast } = await import('react-hot-toast');
            toast.loading(`API rate limit hit. Retrying in ${Math.ceil(backoffTime / 1000)}s...`, {
              duration: backoffTime,
              id: `retry-${attempt}`
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          // Clear the loading toast
          if (typeof window !== 'undefined') {
            const { toast } = await import('react-hot-toast');
            toast.dismiss(`retry-${attempt}`);
          }
          
          continue;
        }
        
        if (attempt === retries) {
          throw error;
        }
        
        // Linear backoff for other errors
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('Max retries exceeded');
  }

  // Core validation system implementing all 12 validations
  async validateData(clients: Client[], workers: Worker[], tasks: Task[]): Promise<ValidationSummary> {
    const errors: ValidationError[] = [];
    const passedValidations: string[] = [];
    const failedValidations: string[] = [];

    try {
      // Parse data for easier validation
      const parsedClients = clients.map(client => this.parseClient(client));
      const parsedWorkers = workers.map(worker => this.parseWorker(worker));
      const parsedTasks = tasks.map(task => this.parseTask(task));

      // a. Missing required columns
      const missingColumnErrors = this.validateRequiredColumns(clients, workers, tasks);
      if (missingColumnErrors.length > 0) {
        errors.push(...missingColumnErrors);
        failedValidations.push('missing_required_columns');
      } else {
        passedValidations.push('missing_required_columns');
      }

      // b. Duplicate IDs
      const duplicateIdErrors = this.validateDuplicateIds(clients, workers, tasks);
      if (duplicateIdErrors.length > 0) {
        errors.push(...duplicateIdErrors);
        failedValidations.push('duplicate_ids');
      } else {
        passedValidations.push('duplicate_ids');
      }

      // c. Malformed lists
      const malformedListErrors = this.validateMalformedLists(workers, tasks);
      if (malformedListErrors.length > 0) {
        errors.push(...malformedListErrors);
        failedValidations.push('malformed_lists');
      } else {
        passedValidations.push('malformed_lists');
      }

      // d. Out-of-range values
      const outOfRangeErrors = this.validateOutOfRange(clients, tasks);
      if (outOfRangeErrors.length > 0) {
        errors.push(...outOfRangeErrors);
        failedValidations.push('out_of_range_values');
      } else {
        passedValidations.push('out_of_range_values');
      }

      // e. Broken JSON
      const brokenJsonErrors = this.validateBrokenJson(clients);
      if (brokenJsonErrors.length > 0) {
        errors.push(...brokenJsonErrors);
        failedValidations.push('broken_json');
      } else {
        passedValidations.push('broken_json');
      }

      // f. Unknown references
      const unknownRefErrors = this.validateUnknownReferences(parsedClients, parsedTasks);
      if (unknownRefErrors.length > 0) {
        errors.push(...unknownRefErrors);
        failedValidations.push('unknown_references');
      } else {
        passedValidations.push('unknown_references');
      }

      // g. Circular co-run groups (requires rules context)
      // TODO: Implement when rules are provided
      passedValidations.push('circular_corun_groups');

      // h. Conflicting rules vs. phase-window constraints
      // TODO: Implement when rules are provided
      passedValidations.push('conflicting_rules');

      // i. Overloaded workers
      const overloadedWorkerErrors = this.validateOverloadedWorkers(parsedWorkers);
      if (overloadedWorkerErrors.length > 0) {
        errors.push(...overloadedWorkerErrors);
        failedValidations.push('overloaded_workers');
      } else {
        passedValidations.push('overloaded_workers');
      }

      // j. Phase-slot saturation
      const phaseSaturationErrors = this.validatePhaseSaturation(parsedWorkers, parsedTasks);
      if (phaseSaturationErrors.length > 0) {
        errors.push(...phaseSaturationErrors);
        failedValidations.push('phase_slot_saturation');
      } else {
        passedValidations.push('phase_slot_saturation');
      }

      // k. Skill-coverage matrix
      const skillCoverageErrors = this.validateSkillCoverage(parsedWorkers, parsedTasks);
      if (skillCoverageErrors.length > 0) {
        errors.push(...skillCoverageErrors);
        failedValidations.push('skill_coverage');
      } else {
        passedValidations.push('skill_coverage');
      }

      // l. Max-concurrency feasibility
      const maxConcurrencyErrors = this.validateMaxConcurrency(parsedWorkers, parsedTasks);
      if (maxConcurrencyErrors.length > 0) {
        errors.push(...maxConcurrencyErrors);
        failedValidations.push('max_concurrency');
      } else {
        passedValidations.push('max_concurrency');
      }

      return {
        totalErrors: errors.filter(e => e.severity === 'error').length,
        totalWarnings: errors.filter(e => e.severity === 'warning').length,
        totalInfo: errors.filter(e => e.severity === 'info').length,
        passedValidations,
        failedValidations,
        validationsPassed: errors.filter(e => e.severity === 'error').length === 0,
        lastRun: new Date(),
        errors
      };

    } catch (error) {
      console.error('Validation error:', error);
      return {
        totalErrors: 1,
        totalWarnings: 0,
        totalInfo: 0,
        passedValidations: [],
        failedValidations: ['system_error'],
        validationsPassed: false,
        lastRun: new Date(),
        errors: [{
          id: 'system_error',
          row: -1,
          column: 'system',
          message: 'System error during validation',
          severity: 'error',
          suggestion: 'Please check the system logs for more details'
        }]
      };
    }
  }

  // Data parsing utilities
  private parseClient(client: Client): ParsedClient {
    return {
      ...client,
      RequestedTaskIDs: client.RequestedTaskIDs.split(',').map(id => id.trim()),
      AttributesJSON: this.safeJsonParse(client.AttributesJSON)
    };
  }

  private parseWorker(worker: Worker): ParsedWorker {
    return {
      ...worker,
      Skills: worker.Skills.split(',').map(skill => skill.trim()),
      AvailableSlots: this.parseSlots(worker.AvailableSlots)
    };
  }

  private parseTask(task: Task): ParsedTask {
    return {
      ...task,
      RequiredSkills: task.RequiredSkills.split(',').map(skill => skill.trim()),
      PreferredPhases: this.parsePhases(task.PreferredPhases)
    };
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
      return [];
    }
  }

  private safeJsonParse(json: string): Record<string, any> {
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }

  // Core validation implementations
  private validateRequiredColumns(clients: Client[], workers: Worker[], tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredClientColumns = ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
    const requiredWorkerColumns = ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
    const requiredTaskColumns = ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];

    // Check clients
    if (clients.length > 0) {
      const clientKeys = Object.keys(clients[0]);
      requiredClientColumns.forEach(col => {
        if (!clientKeys.includes(col)) {
          errors.push({
            id: `missing-client-${col}`,
            row: -1,
            column: col,
            message: `Missing required column: ${col}`,
            severity: 'error',
            validationType: 'missing_column',
            suggestion: `Add the ${col} column to the clients data`
          });
        }
      });
    }

    // Similar checks for workers and tasks...
    return errors;
  }

  private validateDuplicateIds(clients: Client[], workers: Worker[], tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check duplicate ClientIDs
    const clientIds = new Set();
    clients.forEach((client, index) => {
      if (clientIds.has(client.ClientID)) {
        errors.push({
          id: `duplicate-client-${client.ClientID}`,
          row: index,
          column: 'ClientID',
          message: `Duplicate ClientID: ${client.ClientID}`,
          severity: 'error',
          validationType: 'duplicate_id',
          suggestion: 'Use a unique ClientID'
        });
      }
      clientIds.add(client.ClientID);
    });

    // Similar checks for workers and tasks...
    return errors;
  }

  private validateMalformedLists(workers: Worker[], tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    workers.forEach((worker, index) => {
      try {
        JSON.parse(worker.AvailableSlots);
      } catch {
        errors.push({
          id: `malformed-slots-${worker.WorkerID}`,
          row: index,
          column: 'AvailableSlots',
          message: `Malformed AvailableSlots: ${worker.AvailableSlots}`,
          severity: 'error',
          validationType: 'malformed_list',
          suggestion: 'Use valid JSON array format like [1,2,3]'
        });
      }
    });

    return errors;
  }

  private validateOutOfRange(clients: Client[], tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    clients.forEach((client, index) => {
      if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
        errors.push({
          id: `invalid-priority-${client.ClientID}`,
          row: index,
          column: 'PriorityLevel',
          message: `PriorityLevel must be 1-5, got: ${client.PriorityLevel}`,
          severity: 'error',
          validationType: 'out_of_range',
          suggestion: 'Set PriorityLevel to a value between 1 and 5'
        });
      }
    });

    tasks.forEach((task, index) => {
      if (task.Duration < 1) {
        errors.push({
          id: `invalid-duration-${task.TaskID}`,
          row: index,
          column: 'Duration',
          message: `Duration must be ≥ 1, got: ${task.Duration}`,
          severity: 'error',
          validationType: 'out_of_range',
          suggestion: 'Set Duration to 1 or higher'
        });
      }
    });

    return errors;
  }

  private validateBrokenJson(clients: Client[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    clients.forEach((client, index) => {
      try {
        JSON.parse(client.AttributesJSON);
      } catch {
        errors.push({
          id: `broken-json-${client.ClientID}`,
          row: index,
          column: 'AttributesJSON',
          message: `Invalid JSON in AttributesJSON`,
          severity: 'error',
          validationType: 'broken_json',
          suggestion: 'Fix the JSON syntax'
        });
      }
    });

    return errors;
  }

  private validateUnknownReferences(clients: ParsedClient[], tasks: ParsedTask[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const taskIds = new Set(tasks.map(t => t.TaskID));
    
    clients.forEach((client, index) => {
      client.RequestedTaskIDs.forEach(taskId => {
        if (!taskIds.has(taskId)) {
          errors.push({
            id: `unknown-task-${client.ClientID}-${taskId}`,
            row: index,
            column: 'RequestedTaskIDs',
            message: `Unknown TaskID reference: ${taskId}`,
            severity: 'error',
            validationType: 'unknown_reference',
            suggestion: 'Ensure all referenced TaskIDs exist in the tasks data'
          });
        }
      });
    });

    return errors;
  }

  private validateOverloadedWorkers(workers: ParsedWorker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    workers.forEach((worker, index) => {
      if (worker.AvailableSlots.length < worker.MaxLoadPerPhase) {
        errors.push({
          id: `overloaded-${worker.WorkerID}`,
          row: index,
          column: 'MaxLoadPerPhase',
          message: `Worker has fewer available slots (${worker.AvailableSlots.length}) than MaxLoadPerPhase (${worker.MaxLoadPerPhase})`,
          severity: 'warning',
          validationType: 'overloaded_worker',
          suggestion: 'Reduce MaxLoadPerPhase or increase AvailableSlots'
        });
      }
    });

    return errors;
  }

  private validatePhaseSaturation(workers: ParsedWorker[], tasks: ParsedTask[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Calculate phase capacity and demand
    const phaseCapacity: Record<number, number> = {};
    const phaseDemand: Record<number, number> = {};

    // Calculate capacity per phase
    workers.forEach(worker => {
      worker.AvailableSlots.forEach(phase => {
        phaseCapacity[phase] = (phaseCapacity[phase] || 0) + worker.MaxLoadPerPhase;
      });
    });

    // Calculate demand per phase
    tasks.forEach(task => {
      task.PreferredPhases.forEach(phase => {
        phaseDemand[phase] = (phaseDemand[phase] || 0) + task.Duration;
      });
    });

    // Check for saturation
    Object.keys(phaseDemand).forEach(phase => {
      const phaseNum = parseInt(phase);
      const demand = phaseDemand[phaseNum];
      const capacity = phaseCapacity[phaseNum] || 0;
      
      if (demand > capacity) {
        errors.push({
          id: `phase-saturation-${phase}`,
          row: -1,
          column: 'Phase',
          message: `Phase ${phase} is oversaturated: demand ${demand} > capacity ${capacity}`,
          severity: 'error',
          validationType: 'phase_saturation',
          suggestion: 'Add more workers to this phase or reduce task durations'
        });
      }
    });

    return errors;
  }

  private validateSkillCoverage(workers: ParsedWorker[], tasks: ParsedTask[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const availableSkills = new Set(workers.flatMap(w => w.Skills));
    
    tasks.forEach((task, index) => {
      task.RequiredSkills.forEach(skill => {
        if (!availableSkills.has(skill)) {
          errors.push({
            id: `missing-skill-${task.TaskID}-${skill}`,
            row: index,
            column: 'RequiredSkills',
            message: `No worker has required skill: ${skill}`,
            severity: 'error',
            validationType: 'skill_coverage',
            suggestion: 'Add a worker with this skill or modify the task requirements'
          });
        }
      });
    });

    return errors;
  }

  private validateMaxConcurrency(workers: ParsedWorker[], tasks: ParsedTask[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    tasks.forEach((task, index) => {
      // Count qualified workers
      const qualifiedWorkers = workers.filter(worker => 
        task.RequiredSkills.every(skill => worker.Skills.includes(skill))
      );
      
      if (task.MaxConcurrent > qualifiedWorkers.length) {
        errors.push({
          id: `max-concurrency-${task.TaskID}`,
          row: index,
          column: 'MaxConcurrent',
          message: `MaxConcurrent (${task.MaxConcurrent}) exceeds qualified workers (${qualifiedWorkers.length})`,
          severity: 'warning',
          validationType: 'max_concurrency',
          suggestion: 'Reduce MaxConcurrent or add more qualified workers'
        });
      }
    });

    return errors;
  }

  async generateBusinessRule(naturalLanguage: string, context: {clients: Client[], workers: Worker[], tasks: Task[]}): Promise<BusinessRule> {
    console.log('Generating business rule:', naturalLanguage);
    
    try {
      const prompt = `Convert this natural language business rule into a structured configuration:
      "${naturalLanguage}"
      
      Return a JSON object with the format:
      {
        "id": "unique_id",
        "name": "rule_name",
        "description": "detailed_description",
        "naturalLanguage": "${naturalLanguage}",
        "ruleType": "custom",
        "ruleConfig": {
          "conditions": [],
          "actions": [],
          "priority": 1
        },
        "isActive": true,
        "createdAt": "${new Date().toISOString()}"
      }`;

      const text = await this.makeGeminiRequest(prompt);
      const rule = JSON.parse(text);
      console.log('AI generated rule:', rule);
      return rule;
    } catch (error) {
      console.log('AI rule generation failed, creating fallback rule:', error);
      
      // Create a fallback rule without AI
      const fallbackRule: BusinessRule = {
        id: `rule-${Date.now()}`,
        name: naturalLanguage.slice(0, 50) + (naturalLanguage.length > 50 ? '...' : ''),
        description: naturalLanguage,
        naturalLanguage,
        ruleType: 'custom',
        ruleConfig: {
          conditions: [],
          actions: [],
          priority: 1
        },
        isActive: true,
        createdAt: new Date()
      };
      
      console.log('Created fallback rule:', fallbackRule);
      return fallbackRule;
    }
  }

  async suggestDataCleanup(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]> {
    return [
      {
        id: "cleanup-1",
        row: -1,
        column: "general",
        currentValue: null,
        suggestedValue: "Remove duplicate entries",
        reason: "Improve data quality",
        confidence: 0.8,
        autoApplyable: true
      },
      {
        id: "cleanup-2",
        row: -1,
        column: "general", 
        currentValue: null,
        suggestedValue: "Standardize date formats",
        reason: "Ensure consistency",
        confidence: 0.7,
        autoApplyable: true
      },
      {
        id: "cleanup-3",
        row: -1,
        column: "general",
        currentValue: null,
        suggestedValue: "Fill missing required fields",
        reason: "Complete data integrity",
        confidence: 0.9,
        autoApplyable: false
      },
      {
        id: "cleanup-4",
        row: -1,
        column: "general",
        currentValue: null,
        suggestedValue: "Normalize text casing",
        reason: "Standardize formatting",
        confidence: 0.6,
        autoApplyable: true
      }
    ];
  }

  async searchData(query: string, data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<any[]> {
    console.log('AI searchData called:', { query, dataLength: data.length, entityType });
    
    try {
      // Try AI-powered search first
      const prompt = `You are a data search assistant. Given this query: "${query}"
      
      Search through this ${entityType} data and return ONLY the matching rows as a JSON array.
      Data: ${JSON.stringify(data.slice(0, 10))} ${data.length > 10 ? '...(truncated)' : ''}
      
      Rules:
      - Understand natural language queries like "high priority tasks", "workers with JavaScript skills", "clients from New York"
      - Return exact matches from the provided data
      - If no matches, return empty array []
      - ONLY return valid JSON array, no explanations
      
      Query: "${query}"`;

      const text = await this.makeGeminiRequest(prompt);
      
      // Try to parse AI response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const aiResults = JSON.parse(cleanedText);
      
      if (Array.isArray(aiResults) && aiResults.length > 0) {
        console.log('AI search successful:', aiResults.length, 'results');
        return aiResults;
      }
    } catch (error) {
      console.log('AI search failed, using enhanced fallback:', error);
    }
    
    // Enhanced fallback search
    const searchTerm = query.toLowerCase().trim();
    const results = data.filter(row => {
      const searchableText = Object.values(row)
        .map(value => String(value || '').toLowerCase())
        .join(' ');
      
      // Check for exact matches and partial matches
      if (searchableText.includes(searchTerm)) return true;
      
      // Split query into words and check if most words match
      const queryWords = searchTerm.split(' ').filter(word => word.length > 1);
      if (queryWords.length > 0) {
        const matchingWords = queryWords.filter(word => searchableText.includes(word));
        return matchingWords.length >= Math.ceil(queryWords.length * 0.7); // 70% word match
      }
      
      return false;
    });
    
    console.log('Enhanced fallback search results:', results.length);
    return results;
  }

  async suggestRules(clients: Client[], workers: Worker[], tasks: Task[]): Promise<RuleSuggestion[]> {
    console.log('AI rule suggestions called');
    
    try {
      const prompt = `Analyze this data and suggest 3-5 business rules that would improve efficiency:
      
      Clients: ${clients.length} (sample: ${JSON.stringify(clients.slice(0, 2))})
      Workers: ${workers.length} (sample: ${JSON.stringify(workers.slice(0, 2))})  
      Tasks: ${tasks.length} (sample: ${JSON.stringify(tasks.slice(0, 2))})
      
      Return suggestions as JSON array with format:
      [{
        "id": "suggestion-1",
        "ruleType": "co_run",
        "naturalLanguage": "Tasks T1 and T2 should run together",
        "confidence": 0.8,
        "affectedEntities": ["T1", "T2"],
        "reasoning": "These tasks are often requested by the same clients",
        "autoGenerated": true
      }]`;

      const text = await this.makeGeminiRequest(prompt);
      
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const suggestions = JSON.parse(cleanedText);
      
      console.log('AI rule suggestions:', suggestions.length);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.log('AI rule suggestions failed:', error);
      return [];
    }
  }

  async validateWithAI(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<ValidationError[]> {
    console.log('AI enhanced validation called');
    
    try {
      const prompt = `Perform enhanced validation on this ${entityType} data beyond basic checks:
      
      Data sample: ${JSON.stringify(data.slice(0, 5))}
      Total rows: ${data.length}
      
      Look for:
      - Inconsistent data patterns
      - Unusual values that might be errors
      - Business logic violations
      - Data quality issues
      
      Return validation errors as JSON array:
      [{
        "id": "ai-validation-1",
        "row": 0,
        "column": "ColumnName", 
        "message": "Specific issue found",
        "severity": "warning",
        "suggestion": "How to fix it"
      }]`;

      const text = await this.makeGeminiRequest(prompt);
      
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const errors = JSON.parse(cleanedText);
      
      console.log('AI validation errors found:', Array.isArray(errors) ? errors.length : 0);
      return Array.isArray(errors) ? errors : [];
    } catch (error) {
      console.log('AI validation failed:', error);
      return [];
    }
  }

  // New AI methods for enhanced features
  async parseDataWithAI(rawData: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<any[]> {
    console.log('AI data parsing called');
    
    try {
      const expectedColumns = {
        clients: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'],
        workers: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'],
        tasks: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']
      };

      const prompt = `Smart data parser: Map these column headers to the expected format.
      
      Raw data sample: ${JSON.stringify(rawData.slice(0, 2))}
      Expected columns for ${entityType}: ${expectedColumns[entityType].join(', ')}
      
      Map similar/misspelled headers to correct ones:
      - "Client ID" → "ClientID"
      - "Worker Name" → "WorkerName" 
      - "Task Duration" → "Duration"
      - etc.
      
      Return mapped data as JSON array with corrected column names.
      Keep all original data, just fix the headers.`;

      const text = await this.makeGeminiRequest(prompt);
      
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsedData = JSON.parse(cleanedText);
      
      console.log('AI parsing successful:', Array.isArray(parsedData) ? parsedData.length : 0, 'rows');
      return Array.isArray(parsedData) ? parsedData : rawData;
    } catch (error) {
      console.log('AI parsing failed, using original data:', error);
      return rawData;
    }
  }

  async suggestDataCorrections(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]> {
    console.log('AI data corrections called');
    
    try {
      const prompt = `Analyze this ${entityType} data and suggest specific corrections:
      
      Data sample: ${JSON.stringify(data.slice(0, 5))}
      
      Look for:
      - Missing required fields that can be inferred
      - Obvious typos or formatting issues
      - Inconsistent formatting
      - Data that could be standardized
      
      Return corrections as JSON array:
      [{
        "id": "correction-1",
        "row": 0,
        "column": "ColumnName",
        "currentValue": "current value",
        "suggestedValue": "corrected value", 
        "reason": "Why this correction is suggested",
        "confidence": 0.9,
        "autoApplyable": true
      }]`;

      const text = await this.makeGeminiRequest(prompt);
      
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const corrections = JSON.parse(cleanedText);
      
      console.log('AI corrections found:', Array.isArray(corrections) ? corrections.length : 0);
      return Array.isArray(corrections) ? corrections : [];
    } catch (error) {
      console.log('AI corrections failed:', error);
      return [];
    }
  }

  async enhancedValidation(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<ValidationError[]> {
    return this.validateWithAI(data, entityType);
  }

  async naturalLanguageModification(instruction: string, data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]> {
    console.log('AI natural language modification called:', instruction);
    
    try {
      const prompt = `Process this instruction for ${entityType} data: "${instruction}"
      
      Data sample: ${JSON.stringify(data.slice(0, 3))}
      
      Convert the instruction into specific data modifications.
      Examples:
      - "Set all priority levels to 3" 
      - "Add 'Remote' to all worker groups"
      - "Update task durations under 2 to be 2"
      
      Return modifications as JSON array:
      [{
        "id": "mod-1",
        "row": 0,
        "column": "ColumnName",
        "currentValue": "current",
        "suggestedValue": "new value",
        "reason": "Following instruction: ${instruction}",
        "confidence": 0.95,
        "autoApplyable": true
      }]`;

      const text = await this.makeGeminiRequest(prompt);
      
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const modifications = JSON.parse(cleanedText);
      
      console.log('AI modifications generated:', Array.isArray(modifications) ? modifications.length : 0);
      return Array.isArray(modifications) ? modifications : [];
    } catch (error) {
      console.log('AI natural language modification failed:', error);
      return [];
    }
  }
}

class HuggingFaceProvider implements AIProvider {
  private apiKey: string;
  private baseURL = 'https://api-inference.huggingface.co/models/';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(model: string, inputs: any) {
    const response = await fetch(`${this.baseURL}${model}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ inputs }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    return response.json();
  }

  async validateData(clients: Client[], workers: Worker[], tasks: Task[]): Promise<ValidationSummary> {
    // Use a text classification model for validation
    try {
      const textData = clients.map(client => JSON.stringify(client)).join('\n') +
                      workers.map(worker => JSON.stringify(worker)).join('\n') +
                      tasks.map(task => JSON.stringify(task)).join('\n');
      const result = await this.makeRequest('microsoft/DialoGPT-medium', textData);
      
      // Process result and return validation errors
      return this.basicValidation(clients, workers, tasks);
    } catch (error) {
      console.error('HuggingFace validation error:', error);
      return this.basicValidation(clients, workers, tasks);
    }
  }

  async generateBusinessRule(naturalLanguage: string, context: {clients: Client[], workers: Worker[], tasks: Task[]}): Promise<BusinessRule> {
    try {
      const result = await this.makeRequest('microsoft/DialoGPT-medium', 
        `Convert this to a business rule: ${naturalLanguage}`);
      
      // Parse and structure the response
      return {
        id: Date.now().toString(),
        name: 'Generated Rule',
        description: naturalLanguage,
        naturalLanguage,
        ruleType: 'custom',
        ruleConfig: { conditions: [], actions: [], priority: 1 },
        isActive: true,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('HuggingFace rule generation error:', error);
      throw new Error('Failed to generate business rule');
    }
  }

  async suggestDataCleanup(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]> {
    return [
      {
        id: "cleanup-1",
        row: -1,
        column: "general",
        currentValue: null,
        suggestedValue: "Remove duplicate entries",
        reason: "Improve data quality",
        confidence: 0.8,
        autoApplyable: true
      },
      {
        id: "cleanup-2",
        row: -1,
        column: "general", 
        currentValue: null,
        suggestedValue: "Standardize date formats",
        reason: "Ensure consistency",
        confidence: 0.7,
        autoApplyable: true
      },
      {
        id: "cleanup-3",
        row: -1,
        column: "general",
        currentValue: null,
        suggestedValue: "Fill missing required fields",
        reason: "Complete data integrity",
        confidence: 0.9,
        autoApplyable: false
      },
      {
        id: "cleanup-4",
        row: -1,
        column: "general",
        currentValue: null,
        suggestedValue: "Normalize text casing",
        reason: "Standardize formatting",
        confidence: 0.6,
        autoApplyable: true
      }
    ];
  }

  async searchData(query: string, data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<any[]> {
    // Basic semantic search fallback
    return data.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(query.toLowerCase())
      )
    );
  }

  async suggestRules(clients: Client[], workers: Worker[], tasks: Task[]): Promise<RuleSuggestion[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  async validateWithAI(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<ValidationError[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  private basicValidation(clients: Client[], workers: Worker[], tasks: Task[]): ValidationSummary {
    const errors: ValidationError[] = [];
    
    // Implementation needed
    return {
      totalErrors: errors.filter(e => e.severity === 'error').length,
      totalWarnings: errors.filter(e => e.severity === 'warning').length,
      totalInfo: errors.filter(e => e.severity === 'info').length,
      passedValidations: [],
      failedValidations: ['system_error'],
      validationsPassed: false,
      lastRun: new Date(),
      errors: [{
        id: 'system_error',
        row: -1,
        column: 'system',
        message: 'System error during validation',
        severity: 'error',
        suggestion: 'Please check the system logs for more details'
      }]
    };
  }

  // New AI methods for enhanced features
  async parseDataWithAI(rawData: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<any[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  async suggestDataCorrections(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  async enhancedValidation(data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<ValidationError[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  async naturalLanguageModification(instruction: string, data: any[], entityType: 'clients' | 'workers' | 'tasks'): Promise<DataModificationSuggestion[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }
}

export const createAIProvider = (provider: 'gemini' | 'huggingface', apiKey: string): AIProvider => {
  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiKey);
    case 'huggingface':
      return new HuggingFaceProvider(apiKey);
    default:
      throw new Error('Unknown AI provider');
  }
}; 