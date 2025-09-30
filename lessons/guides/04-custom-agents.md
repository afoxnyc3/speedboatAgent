# Custom Agents Guide

> **Creating specialized agents for different development tasks**

## What Are Custom Agents?

Custom agents are specialized AI assistants with:
- **Domain Expertise**: Specific knowledge areas
- **Tool Access**: Limited to what they need
- **Proactive Behavior**: Act without explicit requests
- **Consistent Patterns**: Reproducible approaches

## Why Use Custom Agents?

**Without Agents**: General-purpose AI handles everything
- Inconsistent approaches
- Broad tool access (security risk)
- Requires explicit instruction every time

**With Agents**: Specialized experts for specific tasks
- Domain-specific best practices
- Appropriate tool restrictions
- Proactive assistance when patterns match
- Better code quality through specialization

## Agent Anatomy

```markdown
# Agent Name

## Description
[Clear specialization statement]

## Capabilities
- [Specific capability 1 with techniques]
- [Specific capability 2 with techniques]
- [Specific capability 3 with techniques]

## When to Use
[Explicit scenarios]

## When NOT to Use
[Out-of-scope scenarios]

## Tools Available
- [Tool 1]: [Justification]
- [Tool 2]: [Justification]

## Approach
[How agent thinks about problems]

## Examples
[Concrete usage scenarios]
```

## Essential Agents from SpeedboatAgent

### 1. ai-engineer

**Specialization**: RAG systems, LLM integration, vector databases

**Capabilities**:
- Production-ready LLM applications
- Advanced RAG systems with hybrid search
- Vector database schema design
- Agent orchestration

**When to Use**:
```
- Implementing semantic search
- Building chatbots with context
- Designing vector database schemas
- Optimizing RAG pipelines
```

**Approach**:
- Start with data flow mapping
- Choose appropriate embeddings model
- Design schema for hybrid search
- Implement with error handling
- Benchmark and optimize

---

### 2. tdd-orchestrator

**Specialization**: Test-driven development, quality gates

**Capabilities**:
- Red-Green-Refactor discipline
- Multi-agent workflow coordination
- Test-first development enforcement
- Comprehensive test coverage

**When to Use**:
```
- Implementing new features (always!)
- Refactoring existing code
- Building critical business logic
```

**Approach**:
- Write failing test first (RED)
- Implement minimal code to pass (GREEN)
- Refactor for quality (REFACTOR)
- Repeat for next requirement

**Key Distinction**: Enforces TDD discipline, not just writes tests

---

### 3. performance-optimizer

**Specialization**: Performance analysis and optimization

**Capabilities**:
- Frontend performance (Core Web Vitals)
- Backend optimization (response times)
- Bundle size reduction
- Cache strategy design
- Database query optimization

**When to Use**:
```
- Response times > target
- High API costs
- Poor user experience metrics
- Slow builds/deploys
```

**Approach**:
1. Measure current performance
2. Identify bottlenecks
3. Propose optimizations
4. Implement improvements
5. Validate with benchmarks

---

### 4. frontend-developer

**Specialization**: React, Next.js, modern frontend

**Capabilities**:
- React 19 components
- Next.js 15 App Router
- Responsive layouts
- Client-side state management
- Accessibility (WCAG compliance)

**When to Use**:
```
- Building UI components
- Implementing responsive design
- State management decisions
- Accessibility improvements
```

**Key Features**:
- Masters modern React patterns (Suspense, Server Components)
- Performance-focused (code splitting, lazy loading)
- Accessibility-first approach

---

### 5. typescript-pro

**Specialization**: Advanced TypeScript patterns

**Capabilities**:
- Advanced types and generics
- Strict type safety
- Type inference optimization
- Enterprise-grade patterns

**When to Use**:
```
- Complex type systems
- Generic utility types
- Type-safe API clients
- Eliminating 'any' types
```

**Approach**:
- Start with strictest settings
- Use branded types for IDs
- Leverage discriminated unions
- Create reusable type utilities

---

## Building Domain-Specific Agents

### Example: database-architect

```markdown
# database-architect

## Description
PostgreSQL and database design specialist focusing on schema design, query optimization, and data integrity.

## Capabilities
- **Schema Design**: Normalization, indexing strategies, partitioning
- **Query Optimization**: EXPLAIN analysis, index recommendations, query rewriting
- **Data Integrity**: Constraints, triggers, transaction design
- **Migration Strategy**: Zero-downtime migrations, rollback procedures

## When to Use
- Designing new database schemas
- Optimizing slow queries
- Planning database migrations
- Resolving data integrity issues
- Scaling database performance

## When NOT to Use
- Frontend/UI work
- API design (use api-architect instead)
- Deployment issues (use devops-specialist instead)

## Tools Available
- Read: Examine existing schema and queries
- Write: Create migration files
- Edit: Modify schema definitions
- Bash: Run psql commands, EXPLAIN queries
- Grep: Search for query patterns

## Approach
1. Analyze current schema and identify issues
2. Design optimal schema with proper normalization
3. Create indexes based on query patterns
4. Implement constraints for data integrity
5. Test migrations with rollback procedures
6. Benchmark performance improvements

## Examples

### Example 1: Slow Query Optimization
**Input**: "Users query taking 5 seconds"
**Approach**:
1. Run EXPLAIN ANALYZE to identify bottleneck
2. Check for missing indexes
3. Analyze query structure (N+1, cartesian joins)
4. Propose index additions or query rewrite
5. Validate performance improvement

**Output**: Query optimized to < 100ms with proper indexing

### Example 2: Zero-Downtime Migration
**Input**: "Add user_type column to users table"
**Approach**:
1. Add column as nullable
2. Backfill data in batches
3. Add NOT NULL constraint
4. Update application code
5. Test rollback procedure

**Output**: Migration plan with rollback safety
```

### Example: api-architect

```markdown
# api-architect

## Description
REST API and GraphQL design specialist focusing on API contracts, versioning, and documentation.

## Capabilities
- **API Design**: RESTful principles, GraphQL schemas, API versioning
- **Documentation**: OpenAPI/Swagger, GraphQL introspection
- **Validation**: Request/response schemas with Zod/Joi
- **Error Handling**: Consistent error responses, retry strategies
- **Performance**: Pagination, caching headers, rate limiting

## When to Use
- Designing new API endpoints
- Refactoring existing APIs
- API versioning strategy
- OpenAPI documentation
- API performance optimization

## Tools Available
- Read: Examine existing endpoints
- Write: Create new endpoint files
- Edit: Modify API routes
- Bash: Test endpoints with curl

## Approach
1. Define API contract (OpenAPI spec)
2. Implement with proper validation
3. Add comprehensive error handling
4. Document with examples
5. Test with realistic data
6. Version appropriately

## Examples

### Example 1: Design Search API
**Input**: "Need search endpoint for products"
**Approach**:
1. Define search parameters (query, filters, pagination)
2. Design response format (items, metadata, pagination)
3. Implement with Zod validation
4. Add OpenAPI documentation
5. Test with various edge cases

**Output**:
```typescript
GET /api/products/search?q=laptop&category=electronics&page=1&limit=20
Response: {
  data: Product[],
  meta: { total, page, pages, hasMore }
}
```
```

## Agent Design Patterns

### Pattern 1: The Specialist

**Characteristic**: Deep expertise in narrow domain
**Example**: `database-architect`, `security-auditor`
**Use When**: Need expert-level knowledge

```markdown
Capabilities:
- [Deep technical capability in specific area]
- [Advanced techniques others wouldn't know]
- [Nuanced trade-off understanding]
```

### Pattern 2: The Orchestrator

**Characteristic**: Coordinates other agents/systems
**Example**: `tdd-orchestrator`, `release-manager`
**Use When**: Complex multi-step workflows

```markdown
Approach:
- Analyze overall workflow
- Break into sub-tasks
- Delegate to specialized agents if needed
- Coordinate execution
- Verify completion
```

### Pattern 3: The Enforcer

**Characteristic**: Ensures standards/practices followed
**Example**: `tdd-orchestrator`, `code-reviewer`
**Use When**: Need consistent quality/process

```markdown
Approach:
- Check against standards
- Identify violations
- Suggest corrections
- Validate fixes
- Enforce policy
```

### Pattern 4: The Optimizer

**Characteristic**: Improves existing systems
**Example**: `performance-optimizer`, `cost-optimizer`
**Use When**: System works but needs improvement

```markdown
Approach:
1. Measure current state
2. Identify bottlenecks
3. Propose improvements
4. Implement optimizations
5. Validate improvements
6. Document savings
```

## Tool Access Guidelines

### Full Toolkit (All tools)
**Use For**: General-purpose agents, orchestrators
**Examples**: `ai-engineer`, `full-stack-developer`

### Read-Only (Read, Grep, Glob)
**Use For**: Analyzers, reviewers
**Examples**: `code-reviewer`, `security-auditor`

### Limited Write (Read, Write, Edit specific paths)
**Use For**: Domain-specific implementers
**Examples**: `database-architect` (only `/migrations/**`)

### Command-Only (Bash with restrictions)
**Use For**: Operators, testers
**Examples**: `deployment-manager` (only deploy commands)

## Proactive Usage

### What Is Proactive Usage?

Agent automatically activates when pattern matches, without explicit request.

```markdown
## When to Use
Use PROACTIVELY when:
- [Pattern 1 that triggers agent]
- [Pattern 2 that triggers agent]
```

### Example: frontend-developer

```markdown
Use PROACTIVELY when:
- Creating UI components
- Implementing responsive layouts
- Handling client-side state

Example:
User: "Create a product card component"
→ Frontend-developer agent activates automatically
→ Creates React component with accessibility
→ Adds responsive CSS
→ Includes TypeScript types
```

## Testing Your Agents

### Test Scenarios

Create test cases for each capability:

```markdown
## Test Cases

### Capability: Query Optimization
Input: Slow query with missing index
Expected: Identifies missing index, proposes solution
Validation: Query performance improves by 10x

### Capability: Schema Design
Input: Denormalized data structure
Expected: Proposes normalized schema with rationale
Validation: Schema meets 3NF with appropriate indexes
```

## Common Pitfalls

### ❌ Over-Specialized
**Problem**: Agent too narrow (only handles one specific case)
**Solution**: Broaden scope to cover related scenarios

### ❌ Under-Specialized
**Problem**: Agent overlaps with general-purpose assistant
**Solution**: Focus on unique expertise/approach

### ❌ Wrong Tool Access
**Problem**: Agent has tools it doesn't need
**Solution**: Restrict to minimum required tools

### ❌ No Proactive Trigger
**Problem**: Agent never activates automatically
**Solution**: Add clear "Use PROACTIVELY when" section

## Agent Library by Project Type

### RAG/AI Projects
- `ai-engineer` - LLM integration
- `rag-optimizer` - Query/retrieval optimization
- `vector-db-specialist` - Weaviate/Pinecone expert

### Web Applications
- `frontend-developer` - React/Next.js
- `api-architect` - REST/GraphQL design
- `performance-optimizer` - Core Web Vitals

### Data Engineering
- `database-architect` - Schema design
- `pipeline-engineer` - ETL workflows
- `data-quality-specialist` - Validation/testing

### DevOps/Infrastructure
- `deployment-manager` - CI/CD pipelines
- `infrastructure-architect` - Cloud resources
- `security-auditor` - Security scanning

## Evolution Strategy

### Start Simple
```markdown
Agent v1.0:
- 3-5 clear capabilities
- Basic approach documented
- Common scenarios only
```

### Add Depth
```markdown
Agent v2.0:
- Advanced techniques added
- Edge cases covered
- Proactive triggers refined
```

### Specialize Further
```markdown
Agent v3.0:
- Split into sub-agents if too broad
- Add domain-specific patterns
- Optimize for common use cases
```

## Success Metrics

✅ **Usage Frequency**: Agent used weekly
✅ **Quality Improvement**: Code quality measurably better
✅ **Consistency**: Same patterns across uses
✅ **Proactive Activation**: Activates without explicit call
✅ **Time Savings**: Faster than manual implementation

---

*Last Updated: 2025-09-30*
*Based on: SpeedboatAgent custom agents*