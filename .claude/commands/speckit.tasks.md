---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
handoffs: 
  - label: Analyze For Consistency
    agent: speckit.analyze
    prompt: Run a project analysis for consistency
    send: true
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list.

2. **Load design documents**: Read from FEATURE_DIR: plan.md (required), spec.md (required), and optional docs.

3. **Execute task generation workflow**: Load documents, extract user stories with priorities, generate tasks organized by user story.

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure.

5. **Report**: Output path to generated tasks.md and summary.

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.
