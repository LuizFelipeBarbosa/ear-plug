# Project-Wide Optimization & Refactoring Prompt for Claude Code

## Instructions

You are tasked with performing a comprehensive optimization and refactoring of this entire codebase. Your goal is to improve efficiency, speed, maintainability, and code quality across all files and modules.

**Execute this task using subagents to parallelize work and maximize efficiency.**

---

## Phase 1: Analysis & Planning

### 1.1 Initial Codebase Assessment

First, perform a complete analysis of the project structure:

```
1. Map the entire project directory tree
2. Identify all programming languages and frameworks used
3. Locate configuration files (package.json, requirements.txt, Cargo.toml, etc.)
4. Identify the entry points and critical paths
5. Document the current architecture and module dependencies
```

Create a file `OPTIMIZATION_PLAN.md` documenting:
- Project overview and tech stack
- List of all files to be analyzed
- Initial observations on code smells and inefficiencies
- Prioritized list of optimization targets

### 1.2 Spawn Analysis Subagents

Spawn the following subagents to analyze different aspects in parallel:

**Subagent 1 - Performance Profiler:**
```
Analyze the codebase for performance bottlenecks:
- Identify O(n²) or worse algorithmic complexity
- Find unnecessary loops, redundant iterations
- Locate blocking operations that could be async
- Identify memory leaks or excessive memory allocation
- Find N+1 query problems in database operations
- Locate missing indexes or inefficient queries
- Identify unnecessary re-renders (for frontend)
- Find unoptimized images, assets, or static files
Report findings in: analysis/performance-report.md
```

**Subagent 2 - Code Quality Auditor:**
```
Audit code quality and maintainability:
- Identify code duplication (DRY violations)
- Find functions/methods exceeding 50 lines
- Locate deeply nested conditionals (>3 levels)
- Identify missing or outdated type definitions
- Find inconsistent naming conventions
- Locate dead code and unused imports/variables
- Identify missing error handling
- Find hardcoded values that should be constants/config
Report findings in: analysis/quality-report.md
```

**Subagent 3 - Architecture Reviewer:**
```
Review architectural patterns and structure:
- Identify circular dependencies
- Find SOLID principle violations
- Locate tightly coupled modules
- Identify missing abstractions
- Find inappropriate module boundaries
- Locate god classes/modules with too many responsibilities
- Identify missing dependency injection opportunities
- Find inconsistent patterns across similar modules
Report findings in: analysis/architecture-report.md
```

**Subagent 4 - Dependency Analyzer:**
```
Analyze project dependencies:
- Identify outdated packages with security vulnerabilities
- Find unused dependencies
- Locate duplicate dependencies (different versions)
- Identify heavy dependencies that could be replaced
- Find missing peer dependencies
- Locate dependencies that could be dev-only
- Identify opportunities for tree-shaking
Report findings in: analysis/dependency-report.md
```

---

## Phase 2: Optimization Execution

After analysis is complete, spawn execution subagents for each category:

### 2.1 Performance Optimization Subagent

```
Execute performance optimizations:

ALGORITHMS & DATA STRUCTURES:
- Replace inefficient algorithms with optimal alternatives
- Use appropriate data structures (Map/Set vs Array where applicable)
- Implement caching for expensive computations
- Add memoization to pure functions called repeatedly

ASYNC & CONCURRENCY:
- Convert blocking operations to async/await
- Implement parallel processing where applicable
- Add proper batching for bulk operations
- Implement connection pooling for databases

DATABASE & QUERIES:
- Optimize slow queries with proper indexes
- Implement query batching to eliminate N+1 problems
- Add database connection pooling
- Implement query result caching where appropriate

FRONTEND SPECIFIC (if applicable):
- Implement code splitting and lazy loading
- Add virtualization for long lists
- Optimize re-renders with proper memoization
- Implement proper image optimization

Document all changes in: changes/performance-changes.md
```

### 2.2 Code Quality Refactoring Subagent

```
Execute code quality improvements:

DUPLICATION REMOVAL:
- Extract repeated code into shared utility functions
- Create reusable components/modules
- Implement shared validation logic
- Create common error handling patterns

FUNCTION DECOMPOSITION:
- Break down large functions into smaller, focused units
- Extract complex conditionals into well-named functions
- Implement early returns to reduce nesting
- Apply the single responsibility principle

TYPE SAFETY:
- Add/update TypeScript types or type hints
- Create interfaces for shared data structures
- Add proper generics where applicable
- Implement strict null checks

CLEANUP:
- Remove all dead code and unused imports
- Convert hardcoded values to named constants
- Standardize naming conventions throughout
- Add proper error handling where missing

Document all changes in: changes/quality-changes.md
```

### 2.3 Architecture Improvement Subagent

```
Execute architectural improvements:

DEPENDENCY MANAGEMENT:
- Resolve all circular dependencies
- Implement dependency injection where beneficial
- Create proper module boundaries
- Establish clear public APIs for modules

PATTERN CONSISTENCY:
- Standardize similar patterns across the codebase
- Implement consistent error handling strategy
- Create shared base classes/interfaces where appropriate
- Establish consistent file/folder naming conventions

ABSTRACTION LAYERS:
- Extract business logic from infrastructure code
- Create repository patterns for data access
- Implement service layers where appropriate
- Add facade patterns for complex subsystems

Document all changes in: changes/architecture-changes.md
```

### 2.4 Dependency Optimization Subagent

```
Execute dependency optimizations:

UPDATES & SECURITY:
- Update packages with known vulnerabilities
- Update outdated packages (with careful testing notes)
- Document any breaking changes from updates

CLEANUP:
- Remove unused dependencies
- Move dev-only dependencies appropriately
- Consolidate duplicate dependencies
- Replace heavy dependencies with lighter alternatives where possible

BUNDLE OPTIMIZATION:
- Configure tree-shaking properly
- Set up proper externals for builds
- Implement dynamic imports for large dependencies

Document all changes in: changes/dependency-changes.md
```

---

## Phase 3: Testing & Validation

### 3.1 Spawn Testing Subagent

```
Validate all optimizations:

FUNCTIONALITY TESTING:
- Run existing test suite and ensure all tests pass
- Manually test critical user flows
- Verify no regressions in functionality

PERFORMANCE VALIDATION:
- Benchmark before/after for critical operations
- Measure bundle size changes
- Test memory usage improvements
- Document performance gains with metrics

TYPE CHECKING:
- Run type checker and resolve any new errors
- Ensure no new TypeScript/type errors introduced

LINTING:
- Run linter on all modified files
- Fix any new linting errors
- Ensure consistent code style

Document results in: validation/test-results.md
```

---

## Phase 4: Documentation & Summary

### 4.1 Generate Final Documentation

Create comprehensive documentation of all changes:

**OPTIMIZATION_SUMMARY.md should include:**
```markdown
# Optimization Summary

## Overview
- Total files modified: X
- Total lines changed: +X / -X
- Estimated performance improvement: X%

## Performance Improvements
| Area | Before | After | Improvement |
| ---- | ------ | ----- | ----------- |
| ...  | ...    | ...   | ...         |

## Code Quality Metrics
- Duplicated code reduced by: X%
- Average function length reduced to: X lines
- Type coverage increased to: X%

## Breaking Changes
- List any API changes
- List any configuration changes
- Migration steps if needed

## Files Modified
- Categorized list of all modified files

## Recommendations for Future
- Additional optimizations to consider
- Technical debt remaining
- Suggested monitoring/alerting
```

---

## Execution Guidelines

### Subagent Coordination Rules:

1. **Parallelization**: Run all Phase 1 analysis subagents simultaneously
2. **Dependencies**: Phase 2 subagents can run in parallel BUT coordinate on shared files
3. **File Locking**: If two subagents need the same file, the architecture subagent takes priority
4. **Checkpoints**: After each phase, validate changes before proceeding
5. **Rollback Strategy**: Keep track of all changes to enable rollback if needed

### Safety Rules:

1. **Never delete files** without explicit confirmation - move to `deprecated/` folder instead
2. **Preserve all existing tests** - only add, never remove tests
3. **Maintain backwards compatibility** unless explicitly approved for breaking changes
4. **Create backups** before modifying any configuration files
5. **Comment complex optimizations** explaining why they improve performance

### Quality Gates:

Before completing, ensure:
- [ ] All existing tests pass
- [ ] No new linting errors
- [ ] No new type errors
- [ ] Performance benchmarks show improvement
- [ ] All changes are documented
- [ ] No functionality regressions

---

## Begin Execution

Start by creating the `analysis/` and `changes/` and `validation/` directories, then spawn the Phase 1 subagents. Report back with the analysis results before proceeding to Phase 2.

Execute now.