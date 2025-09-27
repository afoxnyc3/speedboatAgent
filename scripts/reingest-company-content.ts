#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { LocalRepositoryProcessor } from '../src/lib/ingestion/local-processor'
import { createWeaviateClient, testConnection } from '../src/lib/weaviate/client'
import { z } from 'zod'

// Load environment variables
dotenv.config({ path: '.env.local' })

const ConfigSchema = z.object({
  localRepoPath: z.string(),
  source: z.string().default('company'),
  baseUrl: z.string().default('https://github.com/company/website'),
  priority: z.number().default(1.5),
  dryRun: z.boolean().default(false),
  verbose: z.boolean().default(false),
  deleteOld: z.boolean().default(false)
})

/**
 * Re-ingests company content with proper metadata
 */
async function reingestCompanyContent() {
  const args = process.argv.slice(2)
  const localRepoPath = args[0] || process.env.COMPANY_REPO_PATH

  if (!localRepoPath) {
    console.error('Usage: npm run reingest-company <local-repo-path> [--dry-run] [--verbose] [--delete-old]')
    console.error('Or set COMPANY_REPO_PATH environment variable')
    process.exit(1)
  }

  const config = ConfigSchema.parse({
    localRepoPath,
    source: 'company',
    baseUrl: process.env.COMPANY_GITHUB_URL || 'https://github.com/company/website',
    priority: 1.5,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    deleteOld: args.includes('--delete-old')
  })

  console.log('🚀 Re-ingesting Company Content with Proper Metadata...')
  console.log(`📁 Repository path: ${config.localRepoPath}`)
  console.log(`🏷️  Source: ${config.source}`)
  console.log(`🔗 Base URL: ${config.baseUrl}`)
  console.log(`⚡ Priority: ${config.priority}`)
  console.log('')

  if (config.dryRun) {
    console.log('🏃 Running in DRY RUN mode - no changes will be made\n')
  }

  try {
    // Test Weaviate connection
    console.log('🔌 Testing Weaviate connection...')
    const connected = await testConnection()

    if (!connected) {
      console.error('❌ Failed to connect to Weaviate. Check your configuration.')
      process.exit(1)
    }
    console.log('✅ Connected to Weaviate\n')

    const client = createWeaviateClient()

    // Step 1: Delete old miscategorized content if requested
    if (config.deleteOld && !config.dryRun) {
      console.log('🗑️  Deleting old miscategorized content...')

      // Get IDs of documents to delete
      const toDelete = await client.graphql
        .get()
        .withClassName('Document')
        .withFields('_additional { id } filepath')
        .withWhere({
          path: ['source'],
          operator: 'Equal',
          valueText: 'local'
        })
        .withLimit(1000)
        .do()

      const documents = toDelete.data.Get.Document || []
      const companyDocs = documents.filter((doc: any) => {
        const filepath = doc.filepath || ''
        return filepath.includes('apps/') || filepath.includes('packages/') || filepath.includes('turbo')
      })

      console.log(`Found ${companyDocs.length} company documents to delete`)

      if (companyDocs.length > 0) {
        // Delete in batches
        const batchSize = 20
        for (let i = 0; i < companyDocs.length; i += batchSize) {
          const batch = companyDocs.slice(i, i + batchSize)

          await Promise.allSettled(
            batch.map((doc: any) =>
              client.data.deleter()
                .withClassName('Document')
                .withId(doc._additional.id)
                .do()
            )
          )

          console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companyDocs.length / batchSize)}`)
        }

        console.log('✅ Old content deleted\n')
      }
    }

    // Step 2: Process the repository
    console.log('📚 Processing repository files...')
    const processor = new LocalRepositoryProcessor({
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.json', '.yaml', '.yml'],
      ignorePaths: [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.next',
        '.turbo',
        'coverage',
        '.vercel'
      ],
      maxFileSize: 1024 * 1024, // 1MB
    })

    const files = await processor.processRepository(config.localRepoPath)
    console.log(`Found ${files.length} files to process`)

    // Filter to only company website files
    const companyFiles = files.filter(file => {
      const path = file.relativePath
      return path.includes('apps/') || path.includes('packages/') || path.includes('turbo')
    })

    console.log(`Filtered to ${companyFiles.length} company website files\n`)

    if (config.verbose) {
      console.log('Files to ingest:')
      companyFiles.slice(0, 10).forEach(file => {
        console.log(`  - ${file.relativePath}`)
      })
      if (companyFiles.length > 10) {
        console.log(`  ... and ${companyFiles.length - 10} more`)
      }
      console.log('')
    }

    // Step 3: Ingest with proper metadata
    if (!config.dryRun) {
      console.log('🚀 Starting ingestion with corrected metadata...')

      let successCount = 0
      let errorCount = 0
      const batchSize = 10

      for (let i = 0; i < companyFiles.length; i += batchSize) {
        const batch = companyFiles.slice(i, i + batchSize)

        const results = await Promise.allSettled(
          batch.map(async (file) => {
            try {
              // Generate proper URL based on filepath
              const url = `${config.baseUrl}/blob/main/${file.relativePath}`

              const document = {
                content: file.content,
                source: config.source,
                filepath: file.relativePath,
                url: url,
                lastModified: file.lastModified.toISOString(),
                priority: config.priority,
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

              return { success: true }
            } catch (error) {
              if (config.verbose) {
                console.error(`Failed to ingest ${file.relativePath}:`, (error as any).message)
              }
              return { success: false, error }
            }
          })
        )

        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++
          } else {
            errorCount++
          }
        })

        const progress = Math.min(i + batchSize, companyFiles.length)
        console.log(`Progress: ${progress}/${companyFiles.length} (${Math.round(progress / companyFiles.length * 100)}%) - Success: ${successCount}, Failed: ${errorCount}`)
      }

      console.log(`\n✅ Ingestion complete:`)
      console.log(`  Successful: ${successCount}`)
      console.log(`  Failed: ${errorCount}`)

      // Step 4: Verify the results
      console.log('\n🔍 Verifying ingestion...')

      const verifyResult = await client.graphql
        .aggregate()
        .withClassName('Document')
        .withGroupBy(['source'])
        .withFields('groupedBy { source } meta { count }')
        .do()

      console.log('\nDocuments by source:')
      const aggregations = verifyResult.data.Aggregate.Document || []
      for (const agg of aggregations) {
        console.log(`  ${agg.groupedBy.source}: ${agg.meta.count}`)
      }

      // Test a search query
      console.log('\n🔍 Testing search...')
      const testSearch = await client.graphql
        .get()
        .withClassName('Document')
        .withFields('filepath url source priority')
        .withWhere({
          path: ['source'],
          operator: 'Equal',
          valueText: config.source
        })
        .withLimit(3)
        .do()

      const testResults = testSearch.data.Get.Document || []
      console.log(`\nSample ${config.source} documents:`)
      testResults.forEach((doc: any) => {
        console.log(`  - ${doc.filepath}`)
        console.log(`    URL: ${doc.url}`)
        console.log(`    Priority: ${doc.priority}`)
      })
    }

  } catch (error) {
    console.error('❌ Error during re-ingestion:', error)
    process.exit(1)
  }
}

// Main execution
async function main() {
  console.log('Company Content Re-ingestion Tool')
  console.log('==================================\n')

  await reingestCompanyContent()

  console.log('\n✨ Re-ingestion process complete!')
  console.log('\n📋 Next steps:')
  console.log('1. Test search queries to verify company content appears correctly')
  console.log('2. Check that source filtering works properly')
  console.log('3. Verify authority weighting is applied correctly')
}

// Show usage if --help
if (process.argv.includes('--help')) {
  console.log('Usage: npx tsx scripts/reingest-company-content.ts <repo-path> [options]')
  console.log('')
  console.log('Options:')
  console.log('  --dry-run     Show what would be ingested without making changes')
  console.log('  --verbose     Show detailed progress information')
  console.log('  --delete-old  Delete old miscategorized content first')
  console.log('  --help        Show this help message')
  console.log('')
  console.log('Environment variables:')
  console.log('  COMPANY_REPO_PATH   Path to company repository (alternative to argument)')
  console.log('  COMPANY_GITHUB_URL  GitHub URL for the repository')
  process.exit(0)
}

main()