import weaviate, { WeaviateClient } from 'weaviate-ts-client'
import { z } from 'zod'

const WeaviateConfigSchema = z.object({
  host: z.string().min(1, 'Weaviate host is required'),
  apiKey: z.string().min(1, 'Weaviate API key is required'),
  openaiApiKey: z.string().min(1, 'OpenAI API key is required')
})

export type WeaviateConfig = z.infer<typeof WeaviateConfigSchema>

let client: WeaviateClient | null = null

function parseWeaviateHost(host: string): { scheme: 'http' | 'https'; host: string } {
  const normalizedHost = host.startsWith('http://') || host.startsWith('https://') ? host : `https://${host}`

  try {
    const url = new URL(normalizedHost)
    const scheme = url.protocol.replace(':', '') === 'http' ? 'http' : 'https'

    if (!url.host) {
      throw new Error('Missing host value')
    }

    return {
      scheme: scheme as 'http' | 'https',
      host: url.host
    }
  } catch (error) {
    throw new Error(`Invalid Weaviate host: ${host}`)
  }
}

function resolveWeaviateConfig(config?: Partial<WeaviateConfig>): WeaviateConfig {
  const resolvedConfig = {
    host: config?.host ?? process.env.WEAVIATE_HOST ?? '',
    apiKey: config?.apiKey ?? process.env.WEAVIATE_API_KEY ?? '',
    openaiApiKey: config?.openaiApiKey ?? process.env.OPENAI_API_KEY ?? ''
  }

  const validation = WeaviateConfigSchema.safeParse(resolvedConfig)

  if (!validation.success) {
    const details = validation.error.issues.map(issue => issue.message).join('; ')
    throw new Error(`Invalid Weaviate configuration: ${details}`)
  }

  return validation.data
}

export function createWeaviateClient(config?: Partial<WeaviateConfig>): WeaviateClient {
  if (client) {
    return client
  }

  const validatedConfig = resolveWeaviateConfig(config)
  const { scheme, host } = parseWeaviateHost(validatedConfig.host)

  client = weaviate.client({
    scheme,
    host,
    apiKey: new weaviate.ApiKey(validatedConfig.apiKey),
    headers: {
      'X-OpenAI-Api-Key': validatedConfig.openaiApiKey
    }
  })

  return client
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = createWeaviateClient()
    const result = await client.misc.metaGetter().do()

    if (!result || typeof result !== 'object' || typeof (result as { version?: unknown }).version !== 'string') {
      throw new Error('Unexpected response from Weaviate meta endpoint')
    }

    console.log('Weaviate connection successful:', (result as { version: string }).version)
    return true
  } catch (error) {
    console.error('Weaviate connection failed:', error)
    return false
  }
}

export { client as weaviateClient }
