---
name: angular-project-guide
description: Understand and analyze the Angular Student Management System project. Use when asked to inspect project architecture, explain code structure, trace data flows, or propose changes that must follow existing project conventions.
---

# Angular Project Guide

## 1. Project Context

This is an Angular Student Management System.

The project uses:
- Angular and TypeScript
- Angular Signals
- RxJS
- Reactive Forms
- json-server as a mock REST API

## 2. Architecture

Follow the existing architecture:

Component → Facade → Store → Service

Responsibilities:
- Component: UI and user interactions.
- Facade: interface between components and state management.
- Store: application state and business-related state operations.
- Service: HTTP communication with the backend.

## 3. Working Rules

Before proposing code changes:

1. Inspect the relevant project files.
2. Understand the existing implementation.
3. Trace dependencies between Component, Facade, Store, and Service.
4. Reuse existing patterns where appropriate.
5. Do not assume a file or method exists without checking.

## 4. Constraints

- Do not rewrite the entire project.
- Do not change the established architecture without explaining why.
- Avoid unrelated refactoring.
- Do not modify files unless explicitly requested.
- Prefer step-by-step explanations suitable for a beginner.

## 5. Expected Output

When analyzing the project:

1. Explain the current implementation.
2. Identify relevant files.
3. Describe the data flow.
4. Point out potential issues.
5. Propose improvements with reasons.

When proposing code changes, specify:
- File path
- What needs to change
- Why it needs to change
- How to verify it manually
