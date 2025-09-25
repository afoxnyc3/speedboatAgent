#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { initializeSchema, validateSchema } from '../src/lib/weaviate/schema'
import { testConnection } from '../src/lib/weaviate/client'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

async function main() {
  const environment = process.argv[2] || 'development'

  console.log('🚀 Setting up Weaviate schema for RAG system...')
  console.log(`🌍 Environment: ${environment}`)

  try {
    // Test connection first
    console.log('🔌 Testing Weaviate connection...')
    const connected = await testConnection()

    if (!connected) {
      console.error('❌ Failed to connect to Weaviate')
      process.exit(1)
    }

    // Initialize schema
    await initializeSchema()

    // Validate schema was created correctly
    console.log('🔍 Validating schema...')
    const isValid = await validateSchema()

    if (!isValid) {
      console.error('❌ Schema validation failed')
      process.exit(1)
    }

    console.log('\n🎉 Weaviate setup completed successfully!')
    console.log('📝 Ready for document ingestion')
    console.log('💡 Next step: Run `npm run ingest-local ~/rag-data/speedboat`')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

main()