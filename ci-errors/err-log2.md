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
 ✓ Finished writing to disk in 25ms
 ✓ Compiled successfully in 13.1s
   Skipping validation of types
   Linting ...

Failed to compile.

./src/app/api/chat/route.ts
38:8  Error: Async function 'POST' has too many lines (82). Maximum allowed is 15.  max-lines-per-function
130:1  Error: File has too many lines (219). Maximum allowed is 100.  max-lines
142:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
154:1  Error: Async function 'generateContextualResponse' has too many lines (34). Maximum allowed is 15.  max-lines-per-function
156:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
157:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
161:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
174:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
201:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
228:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
228:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/memory/context/route.ts
17:8  Error: Async function 'POST' has too many lines (23). Maximum allowed is 15.  max-lines-per-function
45:8  Error: Async function 'DELETE' has too many lines (26). Maximum allowed is 15.  max-lines-per-function

./src/components/chat/memory-chat-assistant.tsx
17:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
26:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:16  Error: Function 'MemoryChatAssistant' has too many lines (199). Maximum allowed is 15.  max-lines-per-function
42:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:6  Warning: React Hook useEffect has a missing dependency: 'initializeMemoryContext'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
52:35  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has too many lines (61). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has a complexity of 11. Maximum allowed is 10.  complexity
125:1  Error: File has too many lines (241). Maximum allowed is 100.  max-lines
147:32  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
173:29  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
267:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/__tests__/mem0-client.test.ts
22:24  Error: Arrow function has too many lines (301). Maximum allowed is 15.  max-lines-per-function
26:14  Error: Arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
49:19  Error: Arrow function has too many lines (56). Maximum allowed is 15.  max-lines-per-function
50:44  Error: Async arrow function has too many lines (30). Maximum allowed is 15.  max-lines-per-function
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
15:38  Error: Arrow function has too many lines (166). Maximum allowed is 15.  max-lines-per-function
22:29  Error: Arrow function has too many lines (43). Maximum allowed is 15.  max-lines-per-function
80:34  Error: Arrow function has too many lines (42). Maximum allowed is 15.  max-lines-per-function
82:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
134:34  Error: Arrow function has too many lines (34). Maximum allowed is 15.  max-lines-per-function
136:1  Error: File has too many lines (258). Maximum allowed is 100.  max-lines
178:41  Error: Arrow function has too many lines (23). Maximum allowed is 15.  max-lines-per-function
206:30  Error: Arrow function has too many lines (18). Maximum allowed is 15.  max-lines-per-function
207:55  Error: Async arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function
228:28  Error: Arrow function has too many lines (72). Maximum allowed is 15.  max-lines-per-function
235:33  Error: Arrow function has too many lines (66). Maximum allowed is 15.  max-lines-per-function
287:41  Error: Arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function

./src/lib/memory/mem0-client.ts
45:3  Error: Async method 'add' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
64:3  Error: Async method 'search' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
83:3  Error: Async method 'update' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
118:1  Error: File has too many lines (256). Maximum allowed is 100.  max-lines
118:3  Error: Async method 'getConversationContext' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
148:3  Error: Method 'buildAddPayload' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
189:3  Error: Async method 'makeRequest' has too many lines (29). Maximum allowed is 15.  max-lines-per-function
189:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
234:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
239:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
254:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
260:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
266:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/privacy-compliance.ts
76:3  Error: Method 'detectPII' has too many lines (35). Maximum allowed is 15.  max-lines-per-function
126:1  Error: File has too many lines (216). Maximum allowed is 100.  max-lines
137:3  Error: Async method 'cleanupExpiredMemories' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
138:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
163:3  Error: Method 'generatePrivacyNotice' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
189:3  Error: Method 'validateMemoryContent' has too many lines (20). Maximum allowed is 15.  max-lines-per-function

./src/types/memory.ts
128:1  Error: File has too many lines (172). Maximum allowed is 100.  max-lines

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
Error: Process completed with exit code 1.
0s
0s
0s


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
38:8  Error: Async function 'POST' has too many lines (82). Maximum allowed is 15.  max-lines-per-function
130:1  Error: File has too many lines (219). Maximum allowed is 100.  max-lines
142:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
154:1  Error: Async function 'generateContextualResponse' has too many lines (34). Maximum allowed is 15.  max-lines-per-function
156:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
157:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
161:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
174:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
201:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
228:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
228:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/memory/context/route.ts
17:8  Error: Async function 'POST' has too many lines (23). Maximum allowed is 15.  max-lines-per-function
45:8  Error: Async function 'DELETE' has too many lines (26). Maximum allowed is 15.  max-lines-per-function

./src/components/chat/memory-chat-assistant.tsx
17:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
26:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:16  Error: Function 'MemoryChatAssistant' has too many lines (199). Maximum allowed is 15.  max-lines-per-function
42:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:6  Warning: React Hook useEffect has a missing dependency: 'initializeMemoryContext'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
52:35  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has too many lines (61). Maximum allowed is 15.  max-lines-per-function
74:29  Error: Async arrow function has a complexity of 11. Maximum allowed is 10.  complexity
125:1  Error: File has too many lines (241). Maximum allowed is 100.  max-lines
147:32  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
173:29  Error: Async arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
267:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/__tests__/mem0-client.test.ts
22:24  Error: Arrow function has too many lines (301). Maximum allowed is 15.  max-lines-per-function
26:14  Error: Arrow function has too many lines (20). Maximum allowed is 15.  max-lines-per-function
49:19  Error: Arrow function has too many lines (56). Maximum allowed is 15.  max-lines-per-function
50:44  Error: Async arrow function has too many lines (30). Maximum allowed is 15.  max-lines-per-function
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
15:38  Error: Arrow function has too many lines (166). Maximum allowed is 15.  max-lines-per-function
22:29  Error: Arrow function has too many lines (43). Maximum allowed is 15.  max-lines-per-function
80:34  Error: Arrow function has too many lines (42). Maximum allowed is 15.  max-lines-per-function
82:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
134:34  Error: Arrow function has too many lines (34). Maximum allowed is 15.  max-lines-per-function
136:1  Error: File has too many lines (258). Maximum allowed is 100.  max-lines
178:41  Error: Arrow function has too many lines (23). Maximum allowed is 15.  max-lines-per-function
206:30  Error: Arrow function has too many lines (18). Maximum allowed is 15.  max-lines-per-function
207:55  Error: Async arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function
228:28  Error: Arrow function has too many lines (72). Maximum allowed is 15.  max-lines-per-function
235:33  Error: Arrow function has too many lines (66). Maximum allowed is 15.  max-lines-per-function
287:41  Error: Arrow function has too many lines (16). Maximum allowed is 15.  max-lines-per-function

./src/lib/memory/mem0-client.ts
45:3  Error: Async method 'add' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
64:3  Error: Async method 'search' has too many lines (17). Maximum allowed is 15.  max-lines-per-function
83:3  Error: Async method 'update' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
118:1  Error: File has too many lines (256). Maximum allowed is 100.  max-lines
118:3  Error: Async method 'getConversationContext' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
148:3  Error: Method 'buildAddPayload' has too many lines (18). Maximum allowed is 15.  max-lines-per-function
189:3  Error: Async method 'makeRequest' has too many lines (29). Maximum allowed is 15.  max-lines-per-function
189:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
234:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
239:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
254:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
260:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
266:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/memory/privacy-compliance.ts
76:3  Error: Method 'detectPII' has too many lines (35). Maximum allowed is 15.  max-lines-per-function
126:1  Error: File has too many lines (216). Maximum allowed is 100.  max-lines
137:3  Error: Async method 'cleanupExpiredMemories' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
138:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
163:3  Error: Method 'generatePrivacyNotice' has too many lines (20). Maximum allowed is 15.  max-lines-per-function
189:3  Error: Method 'validateMemoryContent' has too many lines (20). Maximum allowed is 15.  max-lines-per-function

./src/types/memory.ts
128:1  Error: File has too many lines (172). Maximum allowed is 100.  max-lines

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
Error: Process completed with exit code 1.
0s
0s
