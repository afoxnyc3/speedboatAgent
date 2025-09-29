# GEMINI.md - AI Agent Onboarding Guide

This document provides a comprehensive overview of the RAG Agent project, designed to be understood by both human developers and AI agents. It covers the project's architecture, development workflow, and key operational procedures.

## 1. Project Overview

The project is an intelligent knowledge assistant (RAG agent) that provides instant, accurate answers from GitHub repositories and web documentation. It uses a hybrid search approach to retrieve relevant information and an LLM to generate answers, with a strong focus on preventing hallucinations.

- **Core Functionality**: Natural language Q&A over a unified set of code and documentation sources.
- **Key Features**: Hybrid search, real-time data synchronization, source attribution, conversational memory, and performance monitoring.

## 2. Technology Stack

The application is built with a modern, production-ready technology stack:

- **Framework**: Next.js 14 (with App Router) and TypeScript.
- **Vector Database**: Weaviate Cloud for hybrid search capabilities.
- **LLM**: OpenAI GPT-4 Turbo.
- **Embedding Model**: `text-embedding-3-large`.
- **Data Processing**:
    - **GitHub**: LlamaIndex for AST-aware code parsing.
    - **Web**: Firecrawl for selective web scraping.
- **Infrastructure**:
    - **Job Queue**: BullMQ for asynchronous task processing.
    - **Caching**: Upstash Redis for embedding and response caching.
- **Monitoring**: Sentry for error tracking and performance monitoring.
- **Testing**: Playwright for E2E tests and Jest for unit/integration tests.
- **Deployment**: Vercel with a full CI/CD pipeline.

## 3. Getting Started

To set up the development environment, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/afoxnyc3/speedboatAgent.git
    cd speedboatAgent
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Create a `.env.local` file by copying `.env.example`. Populate it with the necessary API keys and configuration values (e.g., `OPENAI_API_KEY`, `WEAVIATE_HOST`).

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## 4. Key Scripts

The `package.json` file contains several important scripts for development and maintenance:

-   `npm run dev`: Starts the Next.js development server with Turbopack.
-   `npm run build`: Builds the application for production.
-   `npm run test`: Runs Jest tests in watch mode.
-   `npm run test:ci`: Runs Jest tests with coverage for CI environments.
-   `npm run test:e2e`: Executes the Playwright end-to-end tests.
-   `npm run lint`: Lints the codebase using ESLint.
-   `npm run typecheck`: Runs the TypeScript compiler to check for type errors.
-   `npm run ingest-local`: Ingests a local repository into Weaviate.
-   `npm run setup-weaviate`: Initializes the Weaviate schema.

## 5. Development Workflow

The project follows a standardized development workflow with an emphasis on automation and code quality.

-   **Branching**: All new work should be done on a feature branch, usually branched from `develop` or `main`.
-   **Code Style**: The project uses Prettier for code formatting and ESLint for linting. A pre-commit hook is set up with Husky to automatically format and lint staged files.
-   **Commits**: Commit messages should be clear and descriptive.
-   **Pull Requests**: Submit a pull request to merge changes into the `main` or `develop` branch. The PR template should be filled out.
-   **Continuous Integration**: The CI pipeline, defined in `.github/workflows/ci.yml`, automatically runs linting, type-checking, and tests on every push and pull request. All checks must pass before merging.

## 6. Testing

The project has a multi-layered testing strategy:

-   **Unit & Integration Tests**: Written with Jest and React Testing Library. Run with `npm run test`.
-   **End-to-End (E2E) Tests**: Written with Playwright to simulate user interactions. Run with `npm run test:e2e`.
-   **Load Tests**: Written with k6 to benchmark performance. See the `load:*` scripts in `package.json`.
-   **CI Testing**: The `test:ci` script is executed as part of the CI pipeline.

## 7. Deployment

The application is deployed to Vercel. The deployment process is automated through GitHub Actions.

-   **Production Deployment**: Merging to the `main` branch triggers a production deployment.
-   **Preview Deployments**: Pushes to any other branch (like `develop` or feature branches) trigger a preview deployment.
-   **Environment Variables**: Production environment variables must be configured in the Vercel project settings.
-   **Post-build**: A `postbuild` script runs to warm the cache after a successful build.

## 8. Project Structure

The project follows a standard Next.js App Router structure with some additional directories for organization:

-   `app/`: Contains the pages and API routes of the application.
    -   `app/api/`: Server-side API endpoints.
    -   `app/page.tsx`: The main entry point for the application's UI.
-   `components/`: Shared React components.
-   `lib/`: Core application logic, utilities, and third-party service integrations.
-   `src/`: An alternative source directory, seems to contain some components and libraries. It's recommended to consolidate into either `src` or the root-level directories.
-   `scripts/`: Standalone scripts for various tasks like data ingestion and testing.
-   `tests/`: Contains all tests (unit, integration, E2E, load).
-   `.github/`: GitHub-specific files, including CI/CD workflows.

## 9. Recommendations

This section outlines key recommendations for improving the codebase based on an automated analysis.

### Refactor Memory Provider Integration

**Analysis**: The current memory integration, located in `src/lib/memory/mem0-client.ts`, uses a complex and error-prone method for selecting the memory provider (e.g., Mem0, Redis, mock). The selection logic relies on multiple environment variables (`USE_REDIS_MEMORY`, `MEM0_API_KEY`, etc.), and it silently falls back to a non-functional mock client if the expected configuration (like a `MEM0_API_KEY`) is missing. This makes the system appear broken without providing a clear error, hindering debugging and reliability.

**Recommendation**:

To make the memory integration more robust and maintainable, the following changes are recommended:

1.  **Introduce a Single Configuration Variable**: Replace the multiple boolean flags with a single, explicit environment variable, such as `MEMORY_PROVIDER`. This variable would accept values like `mem0`, `redis`, or `mock`.

    ```env
    # .env.local.example
    MEMORY_PROVIDER=mem0 # Options: mem0, redis, mock
    ```

2.  **Simplify the Client Factory**: Refactor the `getMem0Client` function to use a simple `switch` statement based on the `MEMORY_PROVIDER` variable.

3.  **Implement Fail-Fast Initialization**: Instead of silently falling back to a mock client, the application should throw a configuration error during startup if the selected provider is not configured correctly (e.g., `MEMORY_PROVIDER` is set to `mem0` but `MEM0_API_KEY` is missing). This "fail-fast" approach makes misconfigurations immediately obvious.

This refactoring will significantly improve the clarity, reliability, and debuggability of the memory system.