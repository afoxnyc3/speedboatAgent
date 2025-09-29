import type { WeaviateClient } from 'weaviate-ts-client'

declare module 'weaviate-ts-client' {
  export interface WeaviateClient {
    misc: {
      metaGetter: () => { do: () => Promise<any> }
    }
  }
}

const mockMetaDo = jest.fn<Promise<any>, []>()
const mockMetaGetter = jest.fn(() => ({ do: mockMetaDo }))
const mockClient: Partial<WeaviateClient> = {
  misc: {
    metaGetter: mockMetaGetter
  }
} as WeaviateClient

const mockClientFactory = jest.fn(() => mockClient)
const mockApiKey = jest.fn(function ApiKey(this: any, key: string) {
  this.key = key
})

jest.mock('weaviate-ts-client', () => ({
  __esModule: true,
  default: {
    client: mockClientFactory,
    ApiKey: mockApiKey
  }
}))

describe('Weaviate client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.WEAVIATE_HOST = 'demo.weaviate.network'
    process.env.WEAVIATE_API_KEY = 'test-api-key'
    process.env.OPENAI_API_KEY = 'openai-key'
    mockMetaDo.mockResolvedValue({ version: '1.0.0' })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('creates a client with normalized host configuration', async () => {
    await jest.isolateModulesAsync(async () => {
      const { createWeaviateClient } = await import('../client')
      const client = createWeaviateClient()

      expect(client).toBe(mockClient)
      expect(mockClientFactory).toHaveBeenCalledTimes(1)

      const config = mockClientFactory.mock.calls[0][0]
      expect(config.scheme).toBe('https')
      expect(config.host).toBe('demo.weaviate.network')
      expect(mockApiKey).toHaveBeenCalledWith('test-api-key')
    })
  })

  it('throws a descriptive error when configuration is missing', async () => {
    process.env.WEAVIATE_HOST = ''

    await jest.isolateModulesAsync(async () => {
      const { createWeaviateClient } = await import('../client')

      expect(() => createWeaviateClient()).toThrow(
        'Invalid Weaviate configuration: Weaviate host is required'
      )
    })
  })

  it('validates meta endpoint responses in testConnection', async () => {
    await jest.isolateModulesAsync(async () => {
      const { testConnection } = await import('../client')

      const result = await testConnection()
      expect(result).toBe(true)
      expect(mockMetaDo).toHaveBeenCalledTimes(1)
    })
  })

  it('returns false when the meta endpoint returns invalid payloads', async () => {
    mockMetaDo.mockResolvedValueOnce(null)

    await jest.isolateModulesAsync(async () => {
      const { testConnection } = await import('../client')
      const result = await testConnection()

      expect(result).toBe(false)
    })
  })

  it('returns false when the client throws an error', async () => {
    mockMetaDo.mockRejectedValueOnce(new Error('network error'))

    await jest.isolateModulesAsync(async () => {
      const { testConnection } = await import('../client')
      const result = await testConnection()

      expect(result).toBe(false)
    })
  })
})
