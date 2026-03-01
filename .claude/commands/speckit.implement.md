---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list.

2. **Check checklists status** (if FEATURE_DIR/checklists/ exists).

3. Load and analyze the implementation context.

4. **Project Setup Verification**.

5. Parse tasks.md structure and extract task phases, dependencies, and details.

6. Execute implementation following the task plan phase-by-phase.

7. Implementation execution rules: Setup first, Tests before code, Core development, Integration work, Polish and validation.

8. Progress tracking and error handling: Report progress after each completed task, halt on non-parallel failures, mark completed tasks as [X] in tasks file.

9. Completion validation: Verify all required tasks are completed, check implementation matches spec, validate tests pass.

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `/speckit.tasks` first.
