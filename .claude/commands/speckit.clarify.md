---
description: Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec.
handoffs: 
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Goal: Detect and reduce ambiguity or missing decision points in the active feature specification and record the clarifications directly in the spec file.

Note: This clarification workflow is expected to run (and be completed) BEFORE invoking `/speckit.plan`.

Execution steps:

1. Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly` from repo root **once**. Parse minimal JSON payload fields: `FEATURE_DIR`, `FEATURE_SPEC`.

2. Load the current spec file. Perform a structured ambiguity & coverage scan.

3. Generate (internally) a prioritized queue of candidate clarification questions (maximum 5).

4. Sequential questioning loop (interactive): Present EXACTLY ONE question at a time.

5. Integration after EACH accepted answer (incremental update approach).

6. Validation (performed after EACH write plus final pass).

7. Write the updated spec back to `FEATURE_SPEC`.

8. Report completion.

Context for prioritization: $ARGUMENTS
