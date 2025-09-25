import weaviate, { WeaviateClient } from 'weaviate-ts-client'
import { z } from 'zod'

const WeaviateConfigSchema = z.object({
  host: z.string().url(),
  apiKey: z.string(),
  openaiApiKey: z.string()
})

export type WeaviateConfig = z.infer<typeof WeaviateConfigSchema>

let client: WeaviateClient | null = null

export function createWeaviateClient(config?: Partial<WeaviateConfig>): WeaviateClient {
  const validatedConfig = WeaviateConfigSchema.parse({
    host: config?.host || process.env.WEAVIATE_HOST,
    apiKey: config?.apiKey || process.env.WEAVIATE_API_KEY,
    openaiApiKey: config?.openaiApiKey || process.env.OPENAI_API_KEY
  })

  if (!client) {
    client = weaviate.client({
      scheme: 'https',
      host: validatedConfig.host.replace('https://', ''),
      apiKey: new weaviate.ApiKey(validatedConfig.apiKey),
      headers: {
        'X-OpenAI-Api-Key': validatedConfig.openaiApiKey
      }
    })
  }

  return client
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = createWeaviateClient()
    const result = await client.misc.metaGetter().do()
    console.log('Weaviate connection successful:', result.version)
    return true
  } catch (error) {
    console.error('Weaviate connection failed:', error)
    return false
  }
}

export { client as weaviateClient }