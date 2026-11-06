# Project Instructions

## Project context

- This is an existing Angular Student Management application.
- Use the Angular version and dependencies defined in package.json.
- The project uses TypeScript, RxJS, Signals, Reactive Forms, and json-server.
- Students and Classes use:
  Component → Facade → Signal Store → Service → REST API.
- Academics currently uses AcademicService directly from components.
- Do not assume every feature follows the same architecture.

## Coding rules

- Inspect existing code before proposing changes.
- Follow the conventions of the target feature.
- Prefer incremental changes over full rewrites.
- Do not introduce new libraries without explaining the reason.
- Do not migrate Reactive Forms or state management unless requested.
- Avoid changing unrelated files.
- Keep types explicit and avoid unnecessary `any`.

## Assistance style

- Explain the implementation in Vietnamese.
- Give step-by-step instructions.
- Identify the files that need to change.
- Explain important code decisions.
- Include manual verification steps.
- Do not add automated tests unless requested.
