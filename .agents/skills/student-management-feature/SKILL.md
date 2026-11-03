---
name: student-management-feature
description: Implement or improve features in the existing Angular Student Management project while preserving its architecture and conventions.
---

# Student Management Feature Workflow

## Project context

- This is an existing Angular Student Management application.
- Use the Angular version and dependencies defined in the project.
- The established architecture for Students and Classes is:
  Component → Facade → Signal Store → Service → REST API.
- The Academics feature currently uses AcademicService directly from components.
- The application uses TypeScript, Signals, RxJS, Reactive Forms, and json-server.
- Do not assume every feature has the same architecture.

## Before making changes

1. Inspect the relevant component, facade, store, service, model, and routes.
2. Identify the current data flow and existing conventions.
3. Check the Angular version before recommending APIs.
4. Explain which files need to change and why.
5. Ask for clarification if a requested change conflicts with the existing design.

## Implementation rules

- Make incremental changes instead of rewriting entire features.
- Keep components focused on UI and user interaction.
- Follow the architecture already used by the target feature.
- Do not introduce a new state-management pattern without explaining why.
- Preserve existing Reactive Forms unless migration is explicitly requested.
- Keep TypeScript types explicit and avoid unnecessary `any`.
- Handle loading, empty, and error states where appropriate.
- Do not change unrelated files.
- Do not add automated tests unless explicitly requested.

## Response format

When helping implement a feature:

1. Briefly explain the current implementation.
2. List the files to modify.
3. Provide changes one file at a time.
4. Explain important code decisions.
5. Give manual verification steps.
6. Summarize what changed and what remains.
