---
description: Create or update the feature specification from a natural language feature description.
handoffs: 
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with...
  - label: Clarify Spec Requirements
    agent: speckit.clarify
    prompt: Clarify specification requirements
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

The text the user typed after `/speckit.specify` in the triggering message **is** the feature description.

Given that feature description, do this:

1. **Generate a concise short name** (2-4 words) for the branch.

2. **Check for existing branches before creating new one** using git commands.

3. Load `.specify/templates/spec-template.md` to understand required sections.

4. Follow the execution flow: parse description, extract concepts, fill template, validate.

5. Write the specification to SPEC_FILE.

6. **Specification Quality Validation**: Run checklist validation after writing.

7. Report completion with branch name, spec file path, checklist results.
