# Test Validation Errors

## Expected Validation Errors in Sample Files

### 📋 Clients.csv Errors
| Row | Column | Error Type | Issue |
|-----|--------|------------|-------|
| 3 | ClientName | CRITICAL | Empty required field |
| 4 | PriorityLevel | CRITICAL | Value "8" outside valid range (1-5) |
| 2 | RequestedTaskIDs | CRITICAL | References non-existent TaskID "T999" |
| 5 | RequestedTaskIDs | CRITICAL | References non-existent TaskIDs "T006,T007" |
| 5 | AttributesJSON | CRITICAL | Invalid JSON format "invalid_json_here" |
| 7 | ClientID | CRITICAL | Duplicate ClientID "C001" |

### 👷 Workers.csv Errors  
| Row | Column | Error Type | Issue |
|-----|--------|------------|-------|
| 3 | WorkerName | CRITICAL | Empty required field |
| 4 | MaxLoadPerPhase | CRITICAL | Value "0" below minimum (≥1) |
| 5 | AvailableSlots | CRITICAL | Invalid format "invalid_slots_format" |
| 5 | QualificationLevel | WARNING | Value "15" outside range (1-10) |
| 8 | MaxLoadPerPhase | CRITICAL | Negative value "-1" |
| 9 | WorkerID | CRITICAL | Duplicate WorkerID "W001" |
| 6 | QualificationLevel | INFO | Non-standard level "Expert" |

### 📝 Tasks.csv Errors
| Row | Column | Error Type | Issue |
|-----|--------|------------|-------|
| 2 | TaskName | CRITICAL | Empty required field |
| 2 | Duration | CRITICAL | Value "0" below minimum (≥1) |
| 7 | Duration | CRITICAL | Negative value "-2" |
| 4 | MaxConcurrent | CRITICAL | Negative value "-1" |
| 5 | RequiredSkills | CRITICAL | References unknown skill "UnknownSkill" |
| 4 | RequiredSkills | CRITICAL | References unknown skill "NoRequiredSkills" |
| 8 | PreferredPhases | CRITICAL | Invalid format "invalid_phase_format" |
| 9 | TaskID | CRITICAL | Duplicate TaskID "T001" |

## Cross-Reference Validation Errors
| Type | Issue |
|------|-------|
| Client-Task | C002 requests T999 (doesn't exist) |
| Client-Task | C005 requests T006,T007 (don't exist) |
| Task-Worker | T005 requires "UnknownSkill" (no worker has it) |
| Task-Worker | T004 requires "NoRequiredSkills" (no worker has it) |

## Testing Instructions

1. **Upload files in sequence**: Clients → Workers → Tasks
2. **Check for step-by-step guidance** during upload
3. **Click Continue** after all files uploaded
4. **Look for colored dots** in grid cells with errors:
   - 🔴 Red = Critical errors
   - 🟡 Yellow = Warnings  
   - 🔵 Blue = Info/suggestions
5. **Hover over dots** to see error tooltips
6. **Click cells** to edit and fix issues
7. **Verify validation panel** shows error counts and details

## Expected Totals
- **Critical Errors**: ~18 errors
- **Warnings**: ~2 warnings
- **Info/Suggestions**: ~1 info items
- **Total Issues**: ~21 validation issues 