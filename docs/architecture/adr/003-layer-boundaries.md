# ADR-003: Clean Architecture Layer Boundaries

**Status**: Accepted  
**Date**: 2025-01-15  
**Context**: Establishing dependency rules and layer separation for maintainable, testable code

---

## Decision

Adopt **Clean Architecture** with four distinct layers, enforcing strict dependency rules where inner layers never depend on outer layers.

---

## Layers (Inside to Outside)

### 1. Domain Layer (Innermost)

**Purpose**: Pure business logic and entity definitions

**Contains**:
- Entity interfaces (Node, Edge, LoomTree, Agent, etc.)
- Value objects (ContentHash, Path, SourceRole)
- Domain errors and validation rules
- No external dependencies — pure TypeScript

**Depends On**: Nothing

**Example Concerns**:
- "What makes a valid Node?"
- "How is a content hash computed?"
- "What are the rules for Edge connections?"

---

### 2. Application Layer (Use Cases)

**Purpose**: Orchestrate domain operations to fulfill user intentions

**Contains**:
- Use case interactors (GenerateContinuation, Fork, Navigate, etc.)
- Repository interfaces (abstract contracts, not implementations)
- Service interfaces (LLM provider abstraction, media storage abstraction)
- Application-specific DTOs

**Depends On**: Domain only

**Example Concerns**:
- "How do we generate a continuation?" (orchestration)
- "What steps happen when a user forks?"
- "What data does each operation need and return?"

---

### 3. Infrastructure Layer

**Purpose**: Concrete implementations of interfaces defined in Application layer

**Contains**:
- WatermelonDB repository implementations
- LLM provider adapters (OpenRouter, LM Studio)
- File system operations for media storage
- Platform-specific utilities

**Depends On**: Domain, Application

**Example Concerns**:
- "How do we actually save a Node to WatermelonDB?"
- "How do we call the OpenRouter API?"
- "Where do we store image files?"

---

### 4. Interface Layer (Outermost)

**Purpose**: React Native UI and platform integration

**Contains**:
- React components (screens, widgets)
- Navigation configuration
- State management (connecting UI to use cases)
- Platform-specific UI (share sheet, text-to-speech controls, etc.)

**Depends On**: All inner layers (but only through defined interfaces)

**Example Concerns**:
- "How does the Loom Tree viewer render?"
- "How does a button press trigger a use case?"
- "How do we display loading and error states?"

---

## Dependency Rule

**Dependencies point inward only.**

- Domain knows nothing about persistence, UI, or external services
- Application defines interfaces; Infrastructure implements them
- UI calls use cases; use cases don't know about UI
- Infrastructure is injected, never imported directly by Application

This is enforced through:
- Directory structure (separate folders per layer)
- Import restrictions (can be linted)
- Interface-based design (depend on abstractions)

---

## Rationale

### Why Clean Architecture?

- **Testability** — Domain and Application layers are pure logic, easily unit tested without mocks
- **Flexibility** — Swap WatermelonDB for another DB by implementing new repository
- **Maintainability** — Changes to UI don't ripple into business logic
- **Onboarding** — Clear boundaries help new contributors understand where code belongs

### Why Not Simpler Patterns?

For a mobile app, we could get away with less structure. However:

- Loom Trees have complex domain logic (hash chains, provenance, hypergraph traversal)
- Multiple LLM providers need clean abstraction
- Multimodal content requires careful separation
- The app will grow — investing in structure now pays off

---

## Directory Structure

As built:

```
src/
├── domain/            # Layer 1: entities/, value-objects/ (pure TypeScript)
├── application/       # Layer 2: use-cases/, repositories/ (interfaces),
│                      #          services/ (context, llm, open-loom, provenance, security)
├── infrastructure/    # Layer 3: persistence/watermelon/, llm/ (OpenRouter, LM Studio),
│                      #          security/, bootstrap/, logging/
├── interface/         # Layer 4: components/, composition/ (DI), hooks/, services/, ui/
└── app/               # expo-router routes (part of the Interface layer)
```

---

## Consequences

### Positive
- Business logic is isolated and testable
- LLM providers can be added/swapped without touching core logic
- UI changes don't affect domain rules
- Clear mental model for where code belongs

### Negative
- More files and indirection than a simple approach
- Interfaces add boilerplate
- Requires discipline to maintain boundaries

### Enforcement
- `eslint-plugin-boundaries` (`eslint.config.mjs`) fails `npm run lint` on any import that points outward: domain imports only domain; application imports domain and application; infrastructure adds application; interface (including `src/app/`) may import all layers
- Code review should verify layer boundaries the linter can't see (e.g. infrastructure leaking through application types)

---

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design concepts](https://martinfowler.com/bliki/DomainDrivenDesign.html)