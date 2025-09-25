#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { testConnection } from '../src/lib/weaviate/client'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('🔌 Testing Weaviate connection...')

  try {
    const isConnected = await testConnection()

    if (isConnected) {
      console.log('✅ Weaviate connection successful!')
      console.log('🚀 Ready to start ingesting data!')
    } else {
      console.log('❌ Weaviate connection failed')
      console.log('Check your API keys and cluster URL')
    }
  } catch (error) {
    console.error('❌ Connection error:', error)
  }
}

main()