#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { LocalRepositoryProcessor } from '../src/lib/ingestion/local-processor'
import { createWeaviateClient, testConnection } from '../src/lib/weaviate/client'
import { z } from 'zod'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const ConfigSchema = z.object({
  localRepoPath: z.string(),
  dryRun: z.boolean().default(false),
  maxFiles: z.number().optional(),
  verbose: z.boolean().default(false)
})

async function main() {
  const args = process.argv.slice(2)
  const localRepoPath = args[0] || process.env.LOCAL_REPO_PATH

  if (!localRepoPath) {
    console.error('Usage: npm run ingest-local <local-repo-path> [--dry-run] [--verbose]')
    console.error('Or set LOCAL_REPO_PATH environment variable')
    process.exit(1)
  }

  const config = ConfigSchema.parse({
    localRepoPath,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    maxFiles: args.includes('--max-files') ?
      parseInt(args[args.indexOf('--max-files') + 1]) : undefined
  })

  console.log('🚀 Starting local repository ingestion...')
  console.log(`📁 Repository path: ${config.localRepoPath}`)

  if (config.dryRun) {
    console.log('🧪 DRY RUN MODE - No data will be written to Weaviate')
  }

  try {
    // Test Weaviate connection
    console.log('🔌 Testing Weaviate connection...')
    const connected = await testConnection()

    if (!connected) {
      console.error('❌ Failed to connect to Weaviate. Check your configuration.')
      process.exit(1)
    }

    console.log('✅ Weaviate connection successful')

    // Initialize processor
    const processor = new LocalRepositoryProcessor({
      basePath: config.localRepoPath
    })

    // Process files
    console.log('📊 Discovering files...')
    const files = await processor.processRepository()

    if (config.maxFiles && files.length > config.maxFiles) {
      console.log(`📝 Limiting to first ${config.maxFiles} files`)
      files.splice(config.maxFiles)
    }

    console.log(`\n📈 Processing Summary:`)
    console.log(`Total files: ${files.length}`)

    const stats = {
      code: files.filter(f => f.metadata.isCode).length,
      docs: files.filter(f => f.metadata.isDocumentation).length,
      config: files.filter(f => f.metadata.fileType === 'config').length,
      other: files.filter(f => !f.metadata.isCode && !f.metadata.isDocumentation && f.metadata.fileType !== 'config').length
    }

    console.log(`  Code files: ${stats.code}`)
    console.log(`  Documentation: ${stats.docs}`)
    console.log(`  Configuration: ${stats.config}`)
    console.log(`  Other: ${stats.other}`)

    if (config.verbose) {
      console.log('\n📋 File breakdown:')
      files.forEach(file => {
        console.log(`  ${file.relativePath} (${file.language}, ${file.size} bytes)`)
      })
    }

    if (!config.dryRun) {
      console.log('\n🚀 Starting Weaviate ingestion...')

      const client = createWeaviateClient()
      let successCount = 0
      let errorCount = 0

      for (const file of files) {
        try {
          const document = {
            content: file.content,
            source: 'local',
            filepath: file.relativePath,
            url: `local://${file.relativePath}`,
            lastModified: file.lastModified.toISOString(),
            priority: 1.2, // GitHub source priority
            language: file.language,
            isCode: file.metadata.isCode,
            isDocumentation: file.metadata.isDocumentation,
            fileType: file.metadata.fileType,
            size: file.size
          }

          await client.data.creator()
            .withClassName('Document')
            .withProperties(document)
            .do()

          successCount++

          if (config.verbose || successCount % 50 === 0) {
            console.log(`  ✅ Ingested: ${file.relativePath} (${successCount}/${files.length})`)
          }

        } catch (error) {
          errorCount++
          console.error(`  ❌ Failed: ${file.relativePath}`, error)
        }
      }

      console.log(`\n📊 Ingestion Summary:`)
      console.log(`  ✅ Success: ${successCount}`)
      console.log(`  ❌ Errors: ${errorCount}`)
      console.log(`  📈 Success rate: ${((successCount / files.length) * 100).toFixed(1)}%`)
    }

    console.log('\n✅ Local ingestion completed successfully!')

  } catch (error) {
    console.error('❌ Error during ingestion:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}