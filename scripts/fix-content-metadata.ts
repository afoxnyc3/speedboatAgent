#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { createWeaviateClient } from '../src/lib/weaviate/client'
import { z } from 'zod'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Configuration
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  batchSize: 50,
  companyRepo: 'https://github.com/company/website', // Update this to actual repo URL
  companyDomain: 'company.com' // Update this to actual domain
}

interface DocumentUpdate {
  id: string
  filepath: string
  currentSource: string
  newSource: string
  newUrl: string
  newPriority: number
}

/**
 * Determines if a filepath belongs to the company website
 */
function isCompanyWebsiteContent(filepath: string): boolean {
  const companyIndicators = [
    'apps/web',
    'apps/studio',
    'packages/ui',
    'packages/config',
    'turbo.json',
    '.sanity'
  ]

  return companyIndicators.some(indicator => filepath.includes(indicator))
}

/**
 * Determines the correct source type for a document
 */
function determineSource(filepath: string): string {
  if (isCompanyWebsiteContent(filepath)) {
    return 'github' // Company website from GitHub
  }

  // RAG agent codebase (shouldn't be in search)
  if (filepath.startsWith('src/') || filepath.startsWith('scripts/') || filepath.startsWith('tests/')) {
    return 'system' // Mark as system files to potentially exclude
  }

  return 'local' // Keep as local if unsure
}

/**
 * Generates the correct URL for a document
 */
function generateUrl(filepath: string, source: string): string {
  if (source === 'github') {
    // For company website content, use GitHub URL structure
    return `${CONFIG.companyRepo}/blob/main/${filepath}`
  }

  if (source === 'system') {
    // For system files, keep local URL but mark differently
    return `system://${filepath}`
  }

  return `local://${filepath}`
}

/**
 * Determines the priority weight for content
 */
function determinePriority(source: string, filepath: string): number {
  if (source === 'github') {
    // Company documentation gets high priority
    if (filepath.includes('.md') || filepath.includes('README')) {
      return 1.5 // Documentation files
    }
    return 1.2 // Code files
  }

  if (source === 'system') {
    return 0.5 // System files get low priority
  }

  return 1.0 // Default priority
}

async function fixContentMetadata() {
  console.log('🔧 Fixing Content Metadata in Weaviate...\n')

  if (CONFIG.dryRun) {
    console.log('🏃 Running in DRY RUN mode - no changes will be made\n')
  }

  const client = createWeaviateClient()
  const updates: DocumentUpdate[] = []

  try {
    // Query all documents with local source
    console.log('📊 Fetching documents with source="local"...')

    let offset = 0
    let hasMore = true
    let totalDocuments = 0

    while (hasMore) {
      const result = await client.graphql
        .get()
        .withClassName('Document')
        .withFields('_additional { id } source filepath url priority')
        .withWhere({
          path: ['source'],
          operator: 'Equal',
          valueText: 'local'
        })
        .withLimit(100)
        .withOffset(offset)
        .do()

      const documents = result.data.Get.Document || []

      if (documents.length === 0) {
        hasMore = false
        break
      }

      totalDocuments += documents.length

      // Process each document
      for (const doc of documents) {
        const filepath = doc.filepath || ''
        const newSource = determineSource(filepath)
        const newUrl = generateUrl(filepath, newSource)
        const newPriority = determinePriority(newSource, filepath)

        // Only update if something changed
        if (newSource !== 'local' || newUrl !== doc.url || newPriority !== doc.priority) {
          updates.push({
            id: doc._additional.id,
            filepath,
            currentSource: doc.source,
            newSource,
            newUrl,
            newPriority
          })
        }
      }

      offset += documents.length

      if (documents.length < 100) {
        hasMore = false
      }
    }

    console.log(`Found ${totalDocuments} documents with source="local"`)
    console.log(`${updates.length} documents need metadata updates\n`)

    // Group updates by new source type
    const updatesBySource: Record<string, DocumentUpdate[]> = {}
    for (const update of updates) {
      if (!updatesBySource[update.newSource]) {
        updatesBySource[update.newSource] = []
      }
      updatesBySource[update.newSource].push(update)
    }

    // Display summary
    console.log('📝 Update Summary:')
    for (const [source, sourceUpdates] of Object.entries(updatesBySource)) {
      console.log(`  ${source}: ${sourceUpdates.length} documents`)
      if (CONFIG.verbose && sourceUpdates.length > 0) {
        console.log('    Sample files:')
        sourceUpdates.slice(0, 3).forEach(update => {
          console.log(`      - ${update.filepath}`)
        })
      }
    }

    if (!CONFIG.dryRun && updates.length > 0) {
      console.log('\n🚀 Applying updates...')

      let successCount = 0
      let errorCount = 0

      // Process in smaller batches to avoid timeouts
      const smallBatchSize = 10 // Smaller batches to avoid overwhelming the API

      for (let i = 0; i < updates.length; i += smallBatchSize) {
        const batch = updates.slice(i, i + smallBatchSize)

        // Process batch with Promise.allSettled to handle failures gracefully
        const results = await Promise.allSettled(
          batch.map(async (update) => {
            try {
              // Update only the metadata fields, not content (to avoid re-vectorization)
              await client.data
                .merger()
                .withId(update.id)
                .withClassName('Document')
                .withProperties({
                  source: update.newSource,
                  url: update.newUrl,
                  priority: update.newPriority
                })
                .do()

              if (CONFIG.verbose) {
                console.log(`  ✓ Updated ${update.filepath}`)
              }

              return { success: true, filepath: update.filepath }
            } catch (error) {
              if (CONFIG.verbose) {
                console.error(`  ✗ Failed to update ${update.filepath}:`, (error as any).message)
              }
              return { success: false, filepath: update.filepath, error }
            }
          })
        )

        // Count successes and failures
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++
          } else {
            errorCount++
          }
        })

        // Progress indicator
        const progress = Math.min(i + smallBatchSize, updates.length)
        console.log(`Progress: ${progress}/${updates.length} (${Math.round(progress / updates.length * 100)}%) - Success: ${successCount}, Failed: ${errorCount}`)

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`\n✅ Updates complete:`)
      console.log(`  Successful: ${successCount}`)
      console.log(`  Failed: ${errorCount}`)

    } else if (CONFIG.dryRun) {
      console.log('\n📋 Dry run complete. Run without --dry-run to apply changes.')

      // Show sample of what would be updated
      console.log('\nSample updates that would be applied:')
      updates.slice(0, 5).forEach(update => {
        console.log(`\n  File: ${update.filepath}`)
        console.log(`    Current: source="${update.currentSource}"`)
        console.log(`    New:     source="${update.newSource}"`)
        console.log(`             url="${update.newUrl}"`)
        console.log(`             priority=${update.newPriority}`)
      })
    }

    // Verify the fix
    if (!CONFIG.dryRun && updates.length > 0) {
      console.log('\n🔍 Verifying fix...')

      const verifyResult = await client.graphql
        .aggregate()
        .withClassName('Document')
        .withGroupBy(['source'])
        .withFields('groupedBy { source } meta { count }')
        .do()

      console.log('\nDocuments by source after fix:')
      const aggregations = verifyResult.data.Aggregate.Document || []
      for (const agg of aggregations) {
        console.log(`  ${agg.groupedBy.source}: ${agg.meta.count}`)
      }
    }

  } catch (error) {
    console.error('❌ Error fixing metadata:', error)
    throw error
  }
}

// Main execution
async function main() {
  console.log('Configuration:')
  console.log(`  Company Repo: ${CONFIG.companyRepo}`)
  console.log(`  Company Domain: ${CONFIG.companyDomain}`)
  console.log(`  Batch Size: ${CONFIG.batchSize}`)
  console.log(`  Dry Run: ${CONFIG.dryRun}`)
  console.log(`  Verbose: ${CONFIG.verbose}`)
  console.log('')

  try {
    await fixContentMetadata()

    console.log('\n✨ Metadata fix process complete!')
    console.log('\n📋 Next steps:')
    console.log('1. Test search queries to verify company content appears correctly')
    console.log('2. Update ingest-local.ts to prevent future miscategorization')
    console.log('3. Consider implementing source validation in ingestion pipeline')

  } catch (error) {
    console.error('Failed to fix metadata:', error)
    process.exit(1)
  }
}

// Show usage if --help
if (process.argv.includes('--help')) {
  console.log('Usage: npx tsx scripts/fix-content-metadata.ts [options]')
  console.log('')
  console.log('Options:')
  console.log('  --dry-run   Show what would be updated without making changes')
  console.log('  --verbose   Show detailed progress information')
  console.log('  --help      Show this help message')
  process.exit(0)
}

main()