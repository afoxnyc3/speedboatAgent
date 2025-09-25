# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Week 2: Intelligence Layer planning and issue creation
- Documentation reorganization with progress.md separation

### Changed
- CLAUDE.md focused only on AI instructions (removed progress tracking)
- todo.md refocused on Week 2 tasks only
- roadmap.md simplified with links to progress.md

### Fixed
- None yet

### Removed
- Progress tracking from CLAUDE.md (moved to progress.md)

## [0.1.0] - 2025-09-25

**Milestone: Week 1 Foundation Complete**

### Added
- **Core Infrastructure**: Weaviate Cloud setup with 11-property Document schema
- **Vector Search**: Hybrid search configuration (75% vector, 25% keyword)
- **Embeddings**: OpenAI text-embedding-3-large integration (1024 dimensions)
- **Local Ingestion**: Stealth mode repository processing pipeline
- **Data Processing**: 477 files indexed from Chelsea Piers Speedboat repository
- **Development Tools**: NPM scripts for testing, setup, and ingestion
- **Project Structure**: Complete src/ directory architecture
- **Documentation**: Comprehensive project specification and technical reference

### Technical Achievements
- **LocalRepositoryProcessor**: File discovery and metadata extraction
- **WeaviateClient**: Connection management and schema initialization
- **Ingestion Pipeline**: Batch processing with error handling and logging
- **File Support**: TypeScript, JavaScript, Markdown, JSON, YAML processing
- **Smart Filtering**: Exclusion of node_modules, tests, large files (>500KB)

### Infrastructure
- **Claude Code Agents**: 4 specialized agents for RAG development
- **Slash Commands**: 6 custom commands for workflow automation
- **Environment Configuration**: Complete .env.local setup
- **Error Handling**: Comprehensive logging and graceful degradation

### Metrics Achieved
- Files Indexed: 477 (exceeded target of 200+)
- Processing Success Rate: 95%+
- Production Impact: Zero (stealth mode)
- File Types: Code (450), Documentation (4), Configuration (23)

### Strategic Value
- **Stealth Operation**: Zero production impact maintained
- **Team Privacy**: No webhooks or API calls to live systems
- **Data Foundation**: Rich content base for Week 2 search implementation
- **Development Velocity**: Tooling and agents accelerate subsequent phases

## Template
<!--
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features
-->