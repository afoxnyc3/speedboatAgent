Run npm run build
  npm run build
  shell: /usr/bin/bash -e {0}

> typescript-next-starter@0.1.0 build
> next build --turbopack

⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry

   ▲ Next.js 15.5.3 (Turbopack)

   Creating an optimized production build ...
 ✓ Finished writing to disk in 30ms
 ✓ Compiled successfully in 12.8s
   Skipping validation of types
   Linting ...

Failed to compile.

./src/app/api/chat/route.ts
11:3  Error: 'ChatRequest' is defined but never used.  @typescript-eslint/no-unused-vars
39:8  Error: Async function 'POST' has too many lines (82). Maximum allowed is 15.  max-lines-per-function
130:1  Error: File has too many lines (220). Maximum allowed is 100.  max-lines
143:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
155:1  Error: Async function 'generateContextualResponse' has too many lines (34). Maximum allowed is 15.  max-lines-per-function
157:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
158:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
162:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
175:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
202:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
229:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
229:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/memory/context/route.ts
17:8  Error: Async function 'POST' has too many lines (23). Maximum allowed is 15.  max-lines-per-function
20:40  Error: 'userId' is assigned a value but never used.  @typescript-eslint/no-unused-vars
45:8  Error: Async function 'DELETE' has too many lines (26). Maximum allowed is 15.  max-lines-per-function

./src/components/chat/memory-chat-assistant.tsx
11:42  Error: 'UserId' is defined but never used.  @typescript-eslint/no-unused-vars
17:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
26:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:16  Error: Function 'MemoryChatAssistant' has too many lines (199). Maximum allowed is 15.  max-lines-per-function
42:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:6  Warning: React Hook useEffect has a missing dependency: 'initializeMemoryContext'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
52:35  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has too many lines (61). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has a complexity of 11. Maximum allowed is 10.  complexity
90:9  Error: Expected property shorthand.  object-shorthand
125:1  Error: File has too many lines (241). Maximum allowed is 100.  max-lines
147:32  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
173:29  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
267:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/__tests__/mem0-client.test.ts
22:24  Error: Arrow function has too many lines (301). Maximum allowed is 15.  max-lines-per-function
26:14  Error: Arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
49:19  Error: Arrow function has too many lines (56). Maximum allowed is 15.  max-lines-per-function
50:44  Error: Async arrow function has too many lines (30). Maximum allowed is 15.  max-lines-per-function
78:13  Error: Unnecessarily quoted property 'Authorization' found.  quote-props
117:22  Error: Arrow function has too many lines (50). Maximum allowed is 15.  max-lines-per-function
118:47  Error: Async arrow function has too many lines (31). Maximum allowed is 15.  max-lines-per-function
125:1  Error: File has too many lines (314). Maximum allowed is 100.  max-lines
154:46  Error: Async arrow function has too many lines (17). Maximum allowed is 15.  max-lines-per-function
176:38  Error: Arrow function has too many lines (59). Maximum allowed is 15.  max-lines-per-function
177:69  Error: Async arrow function has too many lines (38). Maximum allowed is 15.  max-lines-per-function
220:57  Error: Async arrow function has too many lines (19). Maximum allowed is 15.  max-lines-per-function
244:23  Error: Arrow function has too many lines (26). Maximum allowed is 15.  max-lines-per-function
278:30  Error: Arrow function has too many lines (34). Maximum allowed is 15.  max-lines-per-function
334:9  Error: A `require()` style import is forbidden.  @typescript-eslint/no-require-imports
339:32  Error: Arrow function has too many lines (38). Maximum allowed is 15.  max-lines-per-function
340:44  Error: Async arrow function has too many lines (36). Maximum allowed is 15.  max-lines-per-function

./src/lib/memory/__tests__/privacy-compliance.test.ts
15:38  Error: Arrow function has too many lines (167). Maximum allowed is 15.  max-lines-per-function
22:29  Error: Arrow function has too many lines (44). Maximum allowed is 15.  max-lines-per-function
79:34  Error: Arrow function has too many lines (42). Maximum allowed is 15.  max-lines-per-function
81:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
133:34  Error: Arrow function has too many lines (34). Maximum allowed is 15.  max-lines-per-function
134:1  Error: File has too many lines (259). Maximum allowed is 100.  max-lines
177:41  Error: Arrow function has too many lines (23). Maximum allowed is 15.  max-lines-per-function
205:30  Error: Arrow function has too many lines (18). Maximum allowed is 15.  max-lines-per-function
206:55  Error: Async arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function
227:28  Error: Arrow function has too many lines (72). Maximum allowed is 15.  max-lines-per-function
234:33  Error: Arrow function has too many lines (66). Maximum allowed is 15.  max-lines-per-function
286:41  Error: Arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function

./src/lib/memory/mem0-client.ts
19:3  Error: 'UserId' is defined but never used.  @typescript-eslint/no-unused-vars
20:3  Error: 'RunId' is defined but never used.  @typescript-eslint/no-unused-vars
21:3  Error: 'AgentId' is defined but never used.  @typescript-eslint/no-unused-vars
48:3  Error: Async method 'add' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
67:3  Error: Async method 'search' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
86:3  Error: Async method 'update' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
117:1  Error: File has too many lines (259). Maximum allowed is 100.  max-lines
121:3  Error: Async method 'getConversationContext' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
151:3  Error: Method 'buildAddPayload' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
192:3  Error: Async method 'makeRequest' has too many lines (29). Maximum allowed is 15.  max-lines-per-function
192:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
197:9  Error: Unnecessarily quoted property 'Authorization' found.  quote-props
237:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
242:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
257:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
263:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
269:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/privacy-compliance.ts
8:3  Error: 'MemoryConfig' is defined but never used.  @typescript-eslint/no-unused-vars
77:3  Error: Method 'detectPII' has too many lines (35). Maximum allowed is 15.  max-lines-per-function
125:1  Error: File has too many lines (218). Maximum allowed is 100.  max-lines
138:3  Error: Async method 'cleanupExpiredMemories' has too many lines (21). Maximum allowed is 15.  max-lines-per-function
139:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
143:11  Error: 'now' is assigned a value but never used.  @typescript-eslint/no-unused-vars
165:3  Error: Method 'generatePrivacyNotice' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
191:3  Error: Method 'validateMemoryContent' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
191:42  Error: 'category' is defined but never used. Allowed unused args must match /^_/u.  @typescript-eslint/no-unused-vars

./src/types/memory.ts
128:1  Error: File has too many lines (172). Maximum allowed is 100.  max-lines

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
Error: Process completed with exit code 1.
0s
0s
0s

---

Run npm run test:ci
  npm run test:ci
  shell: /usr/bin/bash -e {0}

> typescript-next-starter@0.1.0 test:ci
> jest --ci --coverage

PASS src/types/__tests__/types.test.ts
FAIL src/lib/memory/__tests__/mem0-client.test.ts
  ● Mem0Client › add › should successfully add memories

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      68 |       const result = await client.add(messages, options);
      69 |
    > 70 |       expect(result.success).toBe(true);
         |                              ^
      71 |       expect(result.memoryId).toBe('mem_123');
      72 |       expect(result.operationType).toBe('add');
      73 |       expect(fetch).toHaveBeenCalledWith(

      at Object.toBe (src/lib/memory/__tests__/mem0-client.test.ts:70:30)

  ● Mem0Client › add › should handle add operation failures

    expect(received).toBe(expected) // Object.is equality

    Expected: "NETWORK_ERROR"
    Received: "TIMEOUT"

       99 |
      100 |       expect(result.success).toBe(false);
    > 101 |       expect(result.error?.code).toBe('NETWORK_ERROR');
          |                                  ^
      102 |       expect(result.error?.message).toBe('Network error');
      103 |     });
      104 |

      at Object.toBe (src/lib/memory/__tests__/mem0-client.test.ts:101:34)

  ● Mem0Client › search › should successfully search memories

    TypeError: AbortSignal.timeout is not a function

      198 |         'Content-Type': 'application/json',
      199 |       },
    > 200 |       signal: AbortSignal.timeout(this.config.timeout!),
          |                           ^
      201 |     };
      202 |
      203 |     if (data && method !== 'GET') {

      at Mem0Client.timeout [as makeRequest] (src/lib/memory/mem0-client.ts:200:27)
      at Mem0Client.makeRequest [as search] (src/lib/memory/mem0-client.ts:72:33)
      at Object.search (src/lib/memory/__tests__/mem0-client.test.ts:146:35)

  ● Mem0Client › search › should handle empty search results

    TypeError: AbortSignal.timeout is not a function

      198 |         'Content-Type': 'application/json',
      199 |       },
    > 200 |       signal: AbortSignal.timeout(this.config.timeout!),
          |                           ^
      201 |     };
      202 |
      203 |     if (data && method !== 'GET') {

      at Mem0Client.timeout [as makeRequest] (src/lib/memory/mem0-client.ts:200:27)
      at Mem0Client.makeRequest [as search] (src/lib/memory/mem0-client.ts:72:33)
      at Object.search (src/lib/memory/__tests__/mem0-client.test.ts:169:35)

  ● Mem0Client › getConversationContext › should return conversation context with relevant memories

    TypeError: AbortSignal.timeout is not a function

      198 |         'Content-Type': 'application/json',
      199 |       },
    > 200 |       signal: AbortSignal.timeout(this.config.timeout!),
          |                           ^
      201 |     };
      202 |
      203 |     if (data && method !== 'GET') {

      at Mem0Client.timeout [as makeRequest] (src/lib/memory/mem0-client.ts:200:27)
      at Mem0Client.makeRequest [as search] (src/lib/memory/mem0-client.ts:72:33)
      at Mem0Client.search [as getConversationContext] (src/lib/memory/mem0-client.ts:131:37)
      at Object.getConversationContext (src/lib/memory/__tests__/mem0-client.test.ts:209:36)

  ● Mem0Client › getConversationContext › should determine conversation stage correctly

    TypeError: AbortSignal.timeout is not a function

      198 |         'Content-Type': 'application/json',
      199 |       },
    > 200 |       signal: AbortSignal.timeout(this.config.timeout!),
          |                           ^
      201 |     };
      202 |
      203 |     if (data && method !== 'GET') {

      at Mem0Client.timeout [as makeRequest] (src/lib/memory/mem0-client.ts:200:27)
      at Mem0Client.makeRequest [as search] (src/lib/memory/mem0-client.ts:72:33)
      at Mem0Client.search [as getConversationContext] (src/lib/memory/mem0-client.ts:131:37)
      at Object.getConversationContext (src/lib/memory/__tests__/mem0-client.test.ts:235:36)

  ● Mem0Client › cleanup › should successfully cleanup old memories

    TypeError: AbortSignal.timeout is not a function

      198 |         'Content-Type': 'application/json',
      199 |       },
    > 200 |       signal: AbortSignal.timeout(this.config.timeout!),
          |                           ^
      201 |     };
      202 |
      203 |     if (data && method !== 'GET') {

      at Mem0Client.timeout [as makeRequest] (src/lib/memory/mem0-client.ts:200:27)
      at Mem0Client.makeRequest [as cleanup] (src/lib/memory/mem0-client.ts:146:33)
      at Object.cleanup (src/lib/memory/__tests__/mem0-client.test.ts:253:35)

  ● Mem0Client › cleanup › should handle cleanup with dry run

    TypeError: AbortSignal.timeout is not a function

      198 |         'Content-Type': 'application/json',
      199 |       },
    > 200 |       signal: AbortSignal.timeout(this.config.timeout!),
          |                           ^
      201 |     };
      202 |
      203 |     if (data && method !== 'GET') {

      at Mem0Client.timeout [as makeRequest] (src/lib/memory/mem0-client.ts:200:27)
      at Mem0Client.makeRequest [as cleanup] (src/lib/memory/mem0-client.ts:146:33)
      at Object.cleanup (src/lib/memory/__tests__/mem0-client.test.ts:269:35)

  ● Mem0Client › error handling › should handle API key validation errors

    expect(received).toBe(expected) // Object.is equality

    Expected: "API_KEY_INVALID"
    Received: "TIMEOUT"

      287 |
      288 |       expect(result.success).toBe(false);
    > 289 |       expect(result.error?.code).toBe('API_KEY_INVALID');
          |                                  ^
      290 |     });
      291 |
      292 |     it('should handle rate limiting', async () => {

      at Object.toBe (src/lib/memory/__tests__/mem0-client.test.ts:289:34)

  ● Mem0Client › error handling › should handle rate limiting

    expect(received).toBe(expected) // Object.is equality

    Expected: "RATE_LIMITED"
    Received: "TIMEOUT"

      300 |
      301 |       expect(result.success).toBe(false);
    > 302 |       expect(result.error?.code).toBe('RATE_LIMITED');
          |                                  ^
      303 |       expect(result.error?.retryable).toBe(false);
      304 |     });
      305 |

      at Object.toBe (src/lib/memory/__tests__/mem0-client.test.ts:302:34)

  ● Mem0Client › error handling › should retry on retryable errors

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      314 |       const result = await client.add([{ role: 'user', content: 'retry test' }], {});
      315 |
    > 316 |       expect(result.success).toBe(true);
          |                              ^
      317 |       expect(fetch).toHaveBeenCalledTimes(2);
      318 |     });
      319 |   });

      at Object.toBe (src/lib/memory/__tests__/mem0-client.test.ts:316:30)

  ● Mem0Client › payload building › should build correct add payload

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: Any<String>, ObjectContaining {"body": StringContaining "\"user_id\":\"user_payload\""}

    Number of calls: 0

      359 |       await client.add(messages, options);
      360 |
    > 361 |       expect(fetch).toHaveBeenCalledWith(
          |                     ^
      362 |         expect.any(String),
      363 |         expect.objectContaining({
      364 |           body: expect.stringContaining('"user_id":"user_payload"'),

      at Object.toHaveBeenCalledWith (src/lib/memory/__tests__/mem0-client.test.ts:361:21)

FAIL src/lib/memory/__tests__/privacy-compliance.test.ts
  ● PrivacyComplianceManager › PII Detection › should handle multiple PII types

    expect(received).toContain(expected) // indexOf

    Expected value: "phone"
    Received array: ["email"]

      63 |       expect(result.hasPII).toBe(true);
      64 |       expect(result.detectedTypes).toContain('email');
    > 65 |       expect(result.detectedTypes).toContain('phone');
         |                                    ^
      66 |       expect(result.confidence).toBeGreaterThan(1.0);
      67 |     });
      68 |

      at Object.toContain (src/lib/memory/__tests__/privacy-compliance.test.ts:65:36)

  ● PrivacyComplianceManager › Content Validation › should sanitize and accept PII when sanitization is enabled

    expect(received).toBe(expected) // Object.is equality

    Expected: "Contact me at [EMAIL_REDACTED]"
    Received: "Contact me at test@example.com"

      171 |
      172 |       expect(result.isValid).toBe(true);
    > 173 |       expect(result.sanitizedContent).toBe('Contact me at [EMAIL_REDACTED]');
          |                                       ^
      174 |     });
      175 |   });
      176 |

      at Object.toBe (src/lib/memory/__tests__/privacy-compliance.test.ts:173:39)

  ● PrivacyComplianceManager › Memory Cleanup › should simulate cleanup of expired memories

    expect(received).toBe(expected) // Object.is equality

    Expected: 15
    Received: 60

      214 |       );
      215 |
    > 216 |       expect(deletedCount).toBe(15); // 15 from one cleanup call
          |                            ^
      217 |       expect(mockMemoryClient.cleanup).toHaveBeenCalledWith({
      218 |         userId: 'user_123',
      219 |         sessionId: undefined,

      at Object.toBe (src/lib/memory/__tests__/privacy-compliance.test.ts:216:28)

PASS tests/unit/api/search-simple.test.ts
PASS tests/unit/example.test.ts
-----------------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                                           
-----------------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------
All files                    |   18.94 |    10.78 |   13.64 |   20.02 |                                                                             
 app                         |       0 |      100 |       0 |       0 |                                                                             
  layout.tsx                 |       0 |      100 |       0 |       0 | 5-25                                                                        
  page.tsx                   |       0 |      100 |       0 |       0 | 4                                                                           
 app/about                   |       0 |      100 |       0 |       0 |                                                                             
  page.tsx                   |       0 |      100 |       0 |       0 | 4                                                                           
 app/api/chat                |       0 |        0 |       0 |       0 |                                                                             
  route.ts                   |       0 |        0 |       0 |       0 | 29-212                                                                      
 app/api/ingest/web          |       0 |        0 |       0 |       0 |                                                                             
  route.ts                   |       0 |        0 |       0 |       0 | 13-319                                                                      
 app/api/search              |       0 |        0 |       0 |       0 |                                                                             
  route.ts                   |       0 |        0 |       0 |       0 | 23-79                                                                       
 app/demo                    |       0 |      100 |       0 |       0 |                                                                             
  page.tsx                   |       0 |      100 |       0 |       0 | 5-51                                                                        
 app/privacy                 |       0 |      100 |       0 |       0 |                                                                             
  page.tsx                   |       0 |      100 |       0 |       0 | 2                                                                           
 components/ai-elements      |       0 |        0 |       0 |       0 |                                                                             
  actions.tsx                |       0 |        0 |       0 |       0 | 15-64                                                                       
  artifact.tsx               |       0 |        0 |       0 |       0 | 16-146                                                                      
  branch.tsx                 |       0 |        0 |       0 |       0 | 19-201                                                                      
  chain-of-thought.tsx       |       0 |        0 |       0 |       0 | 25-223                                                                      
  code-block.tsx             |       0 |        0 |       0 |       0 | 18-135                                                                      
  context.tsx                |       0 |        0 |       0 |       0 | 15-396                                                                      
  conversation.tsx           |       0 |        0 |       0 |       0 | 12-77                                                                       
  image.tsx                  |       0 |      100 |       0 |       0 | 9-15                                                                        
  inline-citation.tsx        |       0 |        0 |       0 |       0 | 28-278                                                                      
  loader.tsx                 |       0 |        0 |       0 |       0 | 86-87                                                                       
  message.tsx                |       0 |        0 |       0 |       0 | 15-76                                                                       
  open-in-chat.tsx           |       0 |        0 |       0 |       0 | 18-303                                                                      
  prompt-input.tsx           |       0 |        0 |       0 |       0 | 59-690                                                                      
  reasoning.tsx              |       0 |        0 |       0 |       0 | 22-177                                                                      
  response.tsx               |       0 |      100 |       0 |       0 | 9-22                                                                        
  sources.tsx                |       0 |        0 |       0 |       0 | 14-63                                                                       
  suggestion.tsx             |       0 |        0 |       0 |       0 | 13-44                                                                       
  task.tsx                   |       0 |        0 |       0 |       0 | 14-83                                                                       
  tool.tsx                   |       0 |        0 |       0 |       0 | 24-134                                                                      
  web-preview.tsx            |       0 |        0 |       0 |       0 | 28-231                                                                      
 components/chat             |       0 |        0 |       0 |       0 |                                                                             
  ChatInterface.tsx          |       0 |        0 |       0 |       0 | 38-225                                                                      
  CodeBlock.tsx              |       0 |        0 |       0 |       0 | 22-30                                                                       
  SourceViewer.tsx           |       0 |        0 |       0 |       0 | 32-100                                                                      
  StreamingText.tsx          |       0 |        0 |       0 |       0 | 17-38                                                                       
  chat-assistant.tsx         |       0 |        0 |       0 |       0 | 9-57                                                                        
  mockData.ts                |       0 |      100 |     100 |       0 | 7-91                                                                        
 components/ui               |       0 |        0 |       0 |       0 |                                                                             
  avatar.tsx                 |       0 |        0 |       0 |       0 |                                                                             
  badge.tsx                  |       0 |        0 |       0 |       0 | 7-35                                                                        
  button.tsx                 |       0 |        0 |       0 |       0 | 7-48                                                                        
  card.tsx                   |       0 |        0 |       0 |       0 |                                                                             
  carousel.tsx               |       0 |        0 |       0 |       0 | 33-212                                                                      
  collapsible.tsx            |       0 |        0 |       0 |       0 |                                                                             
  dropdown-menu.tsx          |       0 |        0 |       0 |       0 | 91-127                                                                      
  hover-card.tsx             |       0 |        0 |       0 |       0 |                                                                             
  input.tsx                  |       0 |        0 |       0 |       0 |                                                                             
  progress.tsx               |       0 |        0 |       0 |       0 |                                                                             
  scroll-area.tsx            |       0 |        0 |       0 |       0 | 13                                                                          
  select.tsx                 |       0 |        0 |       0 |       0 | 59-106                                                                      
  textarea.tsx               |       0 |        0 |       0 |       0 |                                                                             
  tooltip.tsx                |       0 |        0 |       0 |       0 |                                                                             
 lib                         |       0 |      100 |       0 |       0 |                                                                             
  utils.ts                   |       0 |      100 |       0 |       0 | 5                                                                           
 src/app/api/chat            |       0 |        0 |       0 |       0 |                                                                             
  route.ts                   |       0 |        0 |       0 |       0 | 25-279                                                                      
 src/app/api/memory/context  |       0 |        0 |       0 |       0 |                                                                             
  route.ts                   |       0 |        0 |       0 |       0 | 11-64                                                                       
 src/components/chat         |       0 |        0 |       0 |       0 |                                                                             
  memory-chat-assistant.tsx  |       0 |        0 |       0 |       0 | 35-283                                                                      
 src/lib/cache               |       0 |        0 |       0 |       0 |                                                                             
  redis-cache.ts             |       0 |        0 |       0 |       0 | 9-132                                                                       
 src/lib/ingestion           |       0 |        0 |       0 |       0 |                                                                             
  deduplication.ts           |       0 |        0 |       0 |       0 | 23-524                                                                      
  local-processor.ts         |       0 |        0 |       0 |       0 | 6-164                                                                       
  web-crawler.ts             |       0 |        0 |       0 |       0 | 31-431                                                                      
 src/lib/ingestion/__tests__ |       0 |        0 |       0 |       0 |                                                                             
  web-crawler.test.ts        |       0 |        0 |       0 |       0 | 10-331                                                                      
 src/lib/memory              |   63.37 |    53.24 |   68.18 |   65.58 |                                                                             
  mem0-client.ts             |   45.34 |     32.6 |   57.69 |   48.64 | 56,74-117,133,148,203-221,249,258-276,298-300                               
  privacy-compliance.ts      |   98.59 |    89.65 |     100 |   98.48 | 79                                                                          
  privacy.ts                 |       0 |        0 |       0 |       0 | 7-54                                                                        
 src/lib/search              |       0 |        0 |       0 |       0 |                                                                             
  error-handler.ts           |       0 |        0 |       0 |       0 | 17-182                                                                      
  hybrid-search.ts           |       0 |        0 |       0 |       0 | 39-133                                                                      
  query-classifier.ts        |       0 |        0 |       0 |       0 | 23-372                                                                      
  search-orchestrator.ts     |       0 |        0 |       0 |       0 | 43-120                                                                      
  search-utils.ts            |       0 |        0 |       0 |       0 | 23-174                                                                      
  search-validation.ts       |       0 |        0 |       0 |       0 | 23-120                                                                      
 src/lib/weaviate            |       0 |        0 |       0 |       0 |                                                                             
  client.ts                  |       0 |        0 |       0 |       0 | 4-43                                                                        
  schema.ts                  |       0 |        0 |       0 |       0 | 4-130                                                                       
 src/types                   |    54.1 |    41.71 |   49.26 |   78.26 |                                                                             
  api.ts                     |   42.25 |        0 |       0 |   76.92 | 439,443,446,449,452,455,462,472,483                                         
  chat.ts                    |   49.27 |        0 |   16.66 |   78.37 | 418,421,425,428,431,434,437,440                                             
  index.ts                   |   44.18 |        0 |       0 |   61.66 | 423,426,429,432,435,439-440,445-446,451-452,457-458,464-470,475-478,487,491 
  memory.ts                  |   43.58 |      100 |       0 |     100 |                                                                             
  query-classification.ts    |      50 |      100 |     100 |     100 |                                                                             
  rag.ts                     |   44.23 |        0 |       0 |   88.46 | 495,498,501                                                                 
  search.ts                  |    54.9 |        0 |      25 |   81.48 | 323,326,329,333,336                                                         
  utils.ts                   |   62.29 |    56.66 |   82.89 |   79.36 | 51,115-117,121-130,178,230-247,251-255,297-305,309-314,344-352,371-379,532  
-----------------------------|---------|----------|---------|---------|-----------------------------------------------------------------------------

Test Suites: 2 failed, 3 passed, 5 total
Tests:       15 failed, 81 passed, 96 total
Snapshots:   0 total
Time:        5.556 s
Ran all test suites.
Error: Process completed with exit code 1.
0s
0s
0s


---

Run npm run lint
  npm run lint
  shell: /usr/bin/bash -e {0}

> typescript-next-starter@0.1.0 lint
> next lint

`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .

Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry


./src/app/api/chat/route.ts
11:3  Error: 'ChatRequest' is defined but never used.  @typescript-eslint/no-unused-vars
39:8  Error: Async function 'POST' has too many lines (82). Maximum allowed is 15.  max-lines-per-function
130:1  Error: File has too many lines (220). Maximum allowed is 100.  max-lines
143:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
155:1  Error: Async function 'generateContextualResponse' has too many lines (34). Maximum allowed is 15.  max-lines-per-function
157:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
158:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
162:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
175:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
202:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
229:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
229:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/memory/context/route.ts
17:8  Error: Async function 'POST' has too many lines (23). Maximum allowed is 15.  max-lines-per-function
20:40  Error: 'userId' is assigned a value but never used.  @typescript-eslint/no-unused-vars
45:8  Error: Async function 'DELETE' has too many lines (26). Maximum allowed is 15.  max-lines-per-function

./src/components/chat/memory-chat-assistant.tsx
11:42  Error: 'UserId' is defined but never used.  @typescript-eslint/no-unused-vars
17:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
26:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:16  Error: Function 'MemoryChatAssistant' has too many lines (199). Maximum allowed is 15.  max-lines-per-function
42:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:6  Warning: React Hook useEffect has a missing dependency: 'initializeMemoryContext'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
52:35  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has too many lines (61). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has a complexity of 11. Maximum allowed is 10.  complexity
90:9  Error: Expected property shorthand.  object-shorthand
125:1  Error: File has too many lines (241). Maximum allowed is 100.  max-lines
147:32  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
173:29  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
267:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/__tests__/mem0-client.test.ts
22:24  Error: Arrow function has too many lines (301). Maximum allowed is 15.  max-lines-per-function
26:14  Error: Arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
49:19  Error: Arrow function has too many lines (56). Maximum allowed is 15.  max-lines-per-function
50:44  Error: Async arrow function has too many lines (30). Maximum allowed is 15.  max-lines-per-function
78:13  Error: Unnecessarily quoted property 'Authorization' found.  quote-props
117:22  Error: Arrow function has too many lines (50). Maximum allowed is 15.  max-lines-per-function
118:47  Error: Async arrow function has too many lines (31). Maximum allowed is 15.  max-lines-per-function
125:1  Error: File has too many lines (314). Maximum allowed is 100.  max-lines
154:46  Error: Async arrow function has too many lines (17). Maximum allowed is 15.  max-lines-per-function
176:38  Error: Arrow function has too many lines (59). Maximum allowed is 15.  max-lines-per-function
177:69  Error: Async arrow function has too many lines (38). Maximum allowed is 15.  max-lines-per-function
220:57  Error: Async arrow function has too many lines (19). Maximum allowed is 15.  max-lines-per-function
244:23  Error: Arrow function has too many lines (26). Maximum allowed is 15.  max-lines-per-function
278:30  Error: Arrow function has too many lines (34). Maximum allowed is 15.  max-lines-per-function
334:9  Error: A `require()` style import is forbidden.  @typescript-eslint/no-require-imports
339:32  Error: Arrow function has too many lines (38). Maximum allowed is 15.  max-lines-per-function
340:44  Error: Async arrow function has too many lines (36). Maximum allowed is 15.  max-lines-per-function

./src/lib/memory/__tests__/privacy-compliance.test.ts
15:38  Error: Arrow function has too many lines (167). Maximum allowed is 15.  max-lines-per-function
22:29  Error: Arrow function has too many lines (44). Maximum allowed is 15.  max-lines-per-function
79:34  Error: Arrow function has too many lines (42). Maximum allowed is 15.  max-lines-per-function
81:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
133:34  Error: Arrow function has too many lines (34). Maximum allowed is 15.  max-lines-per-function
134:1  Error: File has too many lines (259). Maximum allowed is 100.  max-lines
177:41  Error: Arrow function has too many lines (23). Maximum allowed is 15.  max-lines-per-function
205:30  Error: Arrow function has too many lines (18). Maximum allowed is 15.  max-lines-per-function
206:55  Error: Async arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function
227:28  Error: Arrow function has too many lines (72). Maximum allowed is 15.  max-lines-per-function
234:33  Error: Arrow function has too many lines (66). Maximum allowed is 15.  max-lines-per-function
286:41  Error: Arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function

./src/lib/memory/mem0-client.ts
19:3  Error: 'UserId' is defined but never used.  @typescript-eslint/no-unused-vars
20:3  Error: 'RunId' is defined but never used.  @typescript-eslint/no-unused-vars
21:3  Error: 'AgentId' is defined but never used.  @typescript-eslint/no-unused-vars
48:3  Error: Async method 'add' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
67:3  Error: Async method 'search' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
86:3  Error: Async method 'update' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
117:1  Error: File has too many lines (259). Maximum allowed is 100.  max-lines
121:3  Error: Async method 'getConversationContext' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
151:3  Error: Method 'buildAddPayload' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
192:3  Error: Async method 'makeRequest' has too many lines (29). Maximum allowed is 15.  max-lines-per-function
192:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
197:9  Error: Unnecessarily quoted property 'Authorization' found.  quote-props
237:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
242:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
257:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
263:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
269:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/privacy-compliance.ts
8:3  Error: 'MemoryConfig' is defined but never used.  @typescript-eslint/no-unused-vars
77:3  Error: Method 'detectPII' has too many lines (35). Maximum allowed is 15.  max-lines-per-function
125:1  Error: File has too many lines (218). Maximum allowed is 100.  max-lines
138:3  Error: Async method 'cleanupExpiredMemories' has too many lines (21). Maximum allowed is 15.  max-lines-per-function
139:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
143:11  Error: 'now' is assigned a value but never used.  @typescript-eslint/no-unused-vars
165:3  Error: Method 'generatePrivacyNotice' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
191:3  Error: Method 'validateMemoryContent' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
191:42  Error: 'category' is defined but never used. Allowed unused args must match /^_/u.  @typescript-eslint/no-unused-vars

./src/types/memory.ts
128:1  Error: File has too many lines (172). Maximum allowed is 100.  max-lines

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
Error: Process completed with exit code 1.

