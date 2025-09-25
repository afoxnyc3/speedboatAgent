import { createWeaviateClient } from './client'
import weaviate from 'weaviate-ts-client'

export const DOCUMENT_CLASS = 'Document'

export const documentSchema = {
  class: DOCUMENT_CLASS,
  description: 'RAG document storage with hybrid search capabilities',
  properties: [
    {
      name: 'content',
      dataType: ['text'],
      description: 'The main content of the document'
    },
    {
      name: 'source',
      dataType: ['string'],
      description: 'Source type: github, web, local'
    },
    {
      name: 'filepath',
      dataType: ['string'],
      description: 'Relative file path within repository'
    },
    {
      name: 'url',
      dataType: ['string'],
      description: 'URL or identifier for the document'
    },
    {
      name: 'lastModified',
      dataType: ['date'],
      description: 'Last modification timestamp'
    },
    {
      name: 'priority',
      dataType: ['number'],
      description: 'Priority weighting (1.2x for github, 0.8x for web)'
    },
    {
      name: 'language',
      dataType: ['string'],
      description: 'Programming language or content type'
    },
    {
      name: 'isCode',
      dataType: ['boolean'],
      description: 'Whether this is a code file'
    },
    {
      name: 'isDocumentation',
      dataType: ['boolean'],
      description: 'Whether this is documentation'
    },
    {
      name: 'fileType',
      dataType: ['string'],
      description: 'File type category: code, documentation, config, text'
    },
    {
      name: 'size',
      dataType: ['int'],
      description: 'File size in bytes'
    }
  ],
  vectorizer: 'text2vec-openai',
  moduleConfig: {
    'text2vec-openai': {
      model: 'text-embedding-3-large',
      dimensions: 1024
    },
    'reranker-transformers': {
      model: 'cross-encoder-ms-marco-MiniLM-L-6-v2'
    }
  }
}

export async function initializeSchema(): Promise<void> {
  const client = createWeaviateClient()

  try {
    // Check if schema already exists
    const existingSchema = await client.schema.getter().do()
    const classExists = existingSchema.classes?.some(
      (cls: any) => cls.class === DOCUMENT_CLASS
    )

    if (classExists) {
      console.log('✅ Document class already exists')
      return
    }

    // Create the Document class
    console.log('🔧 Creating Document class schema...')
    await client.schema.classCreator().withClass(documentSchema).do()

    console.log('✅ Document class created successfully')
    console.log('📊 Schema configured with:')
    console.log('  - OpenAI text-embedding-3-large (1024 dimensions)')
    console.log('  - Hybrid search (75% vector, 25% keyword)')
    console.log('  - Cross-encoder reranking')

  } catch (error) {
    console.error('❌ Schema creation failed:', error)
    throw error
  }
}

export async function validateSchema(): Promise<boolean> {
  const client = createWeaviateClient()

  try {
    const schema = await client.schema.getter().do()
    const documentClass = schema.classes?.find(
      (cls: any) => cls.class === DOCUMENT_CLASS
    )

    if (!documentClass) {
      console.log('❌ Document class not found')
      return false
    }

    console.log('✅ Document class validated')
    console.log(`📊 Properties: ${documentClass.properties?.length || 0}`)
    console.log(`🔧 Vectorizer: ${documentClass.vectorizer}`)
    return true

  } catch (error) {
    console.error('❌ Schema validation failed:', error)
    return false
  }
}