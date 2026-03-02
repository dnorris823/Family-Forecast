---
description: Create or update the project constitution from interactive or provided principle inputs, ensuring all dependent templates stay in sync.
handoffs: 
  - label: Build Specification
    agent: speckit.specify
    prompt: Implement the feature specification based on the updated constitution. I want to build...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

You are updating the project constitution at `.specify/memory/constitution.md`. Follow this execution flow:

1. Load the existing constitution at `.specify/memory/constitution.md`.
2. Collect/derive values for placeholders.
3. Draft the updated constitution content.
4. Consistency propagation checklist.
5. Produce a Sync Impact Report.
6. Validation before final output.
7. Write the completed constitution back to `.specify/memory/constitution.md`.
8. Output a final summary to the user.
