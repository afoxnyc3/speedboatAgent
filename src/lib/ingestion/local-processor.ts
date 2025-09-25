import { glob } from 'glob'
import { readFile, stat } from 'fs/promises'
import { join, relative } from 'path'
import { z } from 'zod'

const LocalIngestionConfigSchema = z.object({
  basePath: z.string(),
  includePatterns: z.array(z.string()).default([
    '**/*.{ts,tsx,js,jsx}',
    '**/*.{md,mdx}',
    '**/*.{json,yaml,yml}',
    'README*',
    'CHANGELOG*',
    'docs/**/*'
  ]),
  excludePatterns: z.array(z.string()).default([
    'node_modules/**',
    '.git/**',
    '.next/**',
    'dist/**',
    'build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/.env*'
  ]),
  maxFileSize: z.number().default(500 * 1024), // 500KB to avoid OpenAI token limits
})

export type LocalIngestionConfig = z.infer<typeof LocalIngestionConfigSchema>

export interface ProcessedFile {
  path: string
  relativePath: string
  content: string
  size: number
  language: string
  lastModified: Date
  metadata: {
    isCode: boolean
    isDocumentation: boolean
    fileType: string
  }
}

export class LocalRepositoryProcessor {
  private config: LocalIngestionConfig

  constructor(config: Partial<LocalIngestionConfig>) {
    this.config = LocalIngestionConfigSchema.parse({
      ...config,
      basePath: config.basePath || process.env.LOCAL_REPO_PATH
    })
  }

  async discoverFiles(): Promise<string[]> {
    const allFiles: string[] = []

    for (const pattern of this.config.includePatterns) {
      const files = await glob(pattern, {
        cwd: this.config.basePath,
        ignore: this.config.excludePatterns,
        absolute: true,
        nodir: true
      })
      allFiles.push(...files)
    }

    // Deduplicate files
    return [...new Set(allFiles)]
  }

  async processFile(filePath: string): Promise<ProcessedFile | null> {
    try {
      const stats = await stat(filePath)

      // Skip files that are too large
      if (stats.size > this.config.maxFileSize) {
        console.warn(`Skipping large file: ${filePath} (${stats.size} bytes)`)
        return null
      }

      const content = await readFile(filePath, 'utf-8')
      const relativePath = relative(this.config.basePath, filePath)

      return {
        path: filePath,
        relativePath,
        content,
        size: stats.size,
        language: this.detectLanguage(filePath),
        lastModified: stats.mtime,
        metadata: {
          isCode: this.isCodeFile(filePath),
          isDocumentation: this.isDocumentationFile(filePath),
          fileType: this.getFileType(filePath)
        }
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error)
      return null
    }
  }

  async processRepository(): Promise<ProcessedFile[]> {
    const filePaths = await this.discoverFiles()
    console.log(`Found ${filePaths.length} files to process`)

    const processedFiles: ProcessedFile[] = []

    for (const filePath of filePaths) {
      const processed = await this.processFile(filePath)
      if (processed) {
        processedFiles.push(processed)
      }
    }

    console.log(`Successfully processed ${processedFiles.length} files`)
    return processedFiles
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()

    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'md': 'markdown',
      'mdx': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'shell'
    }

    return languageMap[ext || ''] || 'text'
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.php', '.rb']
    return codeExtensions.some(ext => filePath.endsWith(ext))
  }

  private isDocumentationFile(filePath: string): boolean {
    const docExtensions = ['.md', '.mdx', '.txt']
    const docPatterns = ['/docs/', '/doc/', 'README', 'CHANGELOG', 'CONTRIBUTING']

    return docExtensions.some(ext => filePath.endsWith(ext)) ||
           docPatterns.some(pattern => filePath.includes(pattern))
  }

  private getFileType(filePath: string): string {
    if (this.isDocumentationFile(filePath)) return 'documentation'
    if (this.isCodeFile(filePath)) return 'code'
    if (filePath.endsWith('.json')) return 'config'
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) return 'config'
    return 'text'
  }
}