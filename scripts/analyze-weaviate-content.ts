#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { createWeaviateClient } from '../src/lib/weaviate/client'
import { z } from 'zod'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ContentAnalysis {
  totalDocuments: number
  bySource: Record<string, number>
  byLanguage: Record<string, number>
  localFilePaths: Set<string>
  samplesBySource: Record<string, any[]>
}

async function analyzeWeaviateContent(): Promise<ContentAnalysis> {
  console.log('🔍 Analyzing Weaviate Content Database...\n')

  const client = createWeaviateClient()
  const analysis: ContentAnalysis = {
    totalDocuments: 0,
    bySource: {},
    byLanguage: {},
    localFilePaths: new Set(),
    samplesBySource: {}
  }

  try {
    // Get total count and sample of documents
    const result = await client.graphql
      .get()
      .withClassName('Document')
      .withFields('source filepath url language priority content')
      .withLimit(1000) // Get a good sample
      .do()

    const documents = result.data.Get.Document || []
    analysis.totalDocuments = documents.length

    // Analyze each document
    for (const doc of documents) {
      // Count by source
      const source = doc.source || 'unknown'
      analysis.bySource[source] = (analysis.bySource[source] || 0) + 1

      // Count by language
      const language = doc.language || 'unknown'
      analysis.byLanguage[language] = (analysis.byLanguage[language] || 0) + 1

      // Track local file paths
      if (source === 'local' && doc.filepath) {
        analysis.localFilePaths.add(doc.filepath)
      }

      // Collect samples by source (first 3 of each)
      if (!analysis.samplesBySource[source]) {
        analysis.samplesBySource[source] = []
      }
      if (analysis.samplesBySource[source].length < 3) {
        analysis.samplesBySource[source].push({
          filepath: doc.filepath,
          url: doc.url,
          language: doc.language,
          priority: doc.priority,
          contentPreview: doc.content ? doc.content.substring(0, 100) + '...' : 'N/A'
        })
      }
    }

    // Display results
    console.log('📊 Content Analysis Results:')
    console.log('============================\n')

    console.log(`Total Documents: ${analysis.totalDocuments}\n`)

    console.log('Documents by Source:')
    for (const [source, count] of Object.entries(analysis.bySource)) {
      const percentage = ((count / analysis.totalDocuments) * 100).toFixed(1)
      console.log(`  ${source}: ${count} (${percentage}%)`)
    }

    console.log('\nDocuments by Language:')
    for (const [language, count] of Object.entries(analysis.byLanguage)) {
      const percentage = ((count / analysis.totalDocuments) * 100).toFixed(1)
      console.log(`  ${language}: ${count} (${percentage}%)`)
    }

    console.log('\n🔍 Local File Path Analysis:')
    console.log(`Total unique local files: ${analysis.localFilePaths.size}`)

    // Identify patterns in local files
    const pathPatterns: Record<string, number> = {}
    for (const path of analysis.localFilePaths) {
      const topLevel = path.split('/')[0]
      pathPatterns[topLevel] = (pathPatterns[topLevel] || 0) + 1
    }

    console.log('\nTop-level directories:')
    for (const [dir, count] of Object.entries(pathPatterns).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${dir}/: ${count} files`)
    }

    console.log('\n📝 Sample Documents by Source:')
    console.log('================================')
    for (const [source, samples] of Object.entries(analysis.samplesBySource)) {
      console.log(`\n${source.toUpperCase()} Source (${analysis.bySource[source]} total):`)
      samples.forEach((sample, i) => {
        console.log(`\n  Sample ${i + 1}:`)
        console.log(`    File: ${sample.filepath || 'N/A'}`)
        console.log(`    URL: ${sample.url || 'N/A'}`)
        console.log(`    Language: ${sample.language || 'N/A'}`)
        console.log(`    Priority: ${sample.priority || 'N/A'}`)
        console.log(`    Content: ${sample.contentPreview}`)
      })
    }

    // Identify company website content
    console.log('\n🎯 Likely Company Website Content:')
    console.log('===================================')
    const companyIndicators = ['apps/web', 'apps/studio', 'packages/ui', 'turbo', 'sanity']
    const companyFiles = Array.from(analysis.localFilePaths).filter(path =>
      companyIndicators.some(indicator => path.includes(indicator))
    )

    console.log(`Found ${companyFiles.length} files that appear to be company website content`)
    if (companyFiles.length > 0) {
      console.log('Sample company files:')
      companyFiles.slice(0, 5).forEach(file => {
        console.log(`  - ${file}`)
      })
    }

    // Identify RAG agent content
    const ragIndicators = ['src/lib', 'src/app', 'scripts/', 'tests/', 'components/']
    const ragFiles = Array.from(analysis.localFilePaths).filter(path =>
      ragIndicators.some(indicator => path.startsWith(indicator))
    )

    console.log(`\nFound ${ragFiles.length} files that appear to be RAG agent codebase`)
    if (ragFiles.length > 0) {
      console.log('Sample RAG files:')
      ragFiles.slice(0, 5).forEach(file => {
        console.log(`  - ${file}`)
      })
    }

    return analysis

  } catch (error) {
    console.error('❌ Error analyzing content:', error)
    throw error
  }
}

// Main execution
async function main() {
  try {
    const analysis = await analyzeWeaviateContent()

    console.log('\n\n🔧 Recommendations:')
    console.log('===================')

    if (analysis.bySource['local'] > 0) {
      const localCount = analysis.bySource['local']
      const percentage = ((localCount / analysis.totalDocuments) * 100).toFixed(1)

      console.log(`\n⚠️  ${localCount} documents (${percentage}%) are marked as 'local' source`)
      console.log('   These need to be re-categorized based on their actual origin:')
      console.log('   - Company website content → source: "github" or "company"')
      console.log('   - RAG agent codebase → should be excluded or marked differently')
      console.log('   - External documentation → source: "web"')
    }

    console.log('\n📋 Next Steps:')
    console.log('1. Create a migration script to fix source metadata')
    console.log('2. Update URLs from "local://" to actual origins')
    console.log('3. Apply proper priority weights based on content type')
    console.log('4. Consider purging RAG agent codebase from search index')

  } catch (error) {
    console.error('Failed to complete analysis:', error)
    process.exit(1)
  }
}

main()