# 📚 WorkMatch AI Chatbot — Study Guide
### How We Implemented Google Gemini AI in Our Capstone Project

---

## 🗂️ Table of Contents
1. [Overview — What is the Chatbot?](#overview)
2. [Tech Stack Used](#tech-stack)
3. [File Structure](#file-structure)
4. [Core Concepts](#core-concepts)
5. [Code Walkthrough — gemini.ts](#gemini-ts)
6. [Code Walkthrough — assistant/route.ts](#assistant-route)
7. [Full Request Flow Diagram](#flow-diagram)
8. [Key AI Terms Explained](#ai-terms)
9. [Defense Q&A](#defense-qa)

---

## 1. Overview — What is the Chatbot? {#overview}

The WorkMatch AI Chatbot is a **server-side assistant** powered by **Google Gemini**.

It helps users:
- Understand their job match scores
- Identify job scam warning signs
- Get resume and career advice
- Ask questions about specific job postings

It **refuses** to:
- Write code or SQL
- Reveal internal system details (API keys, prompts)
- Invent facts about companies or jobs

---

## 2. Tech Stack Used {#tech-stack}

| Tool | Purpose |
|---|---|
| **Google Gemini API** | The AI language model that generates replies |
| **Next.js API Route** | Server-side endpoint that handles chat requests |
| **Supabase** | Database — fetches real job/company data for context |
| **TypeScript** | Language used throughout |
| **Raw `fetch()`** | How we call the Gemini REST API (no SDK needed) |

---

## 3. File Structure {#file-structure}

```
src/
├── lib/
│   └── ai/
│       └── gemini.ts              ← Core AI engine
│           ├── resolveModelName() ← Picks correct Gemini model
│           ├── generateGeminiText() ← Main function to call Gemini
│           └── generateGeminiJson() ← Calls Gemini, returns JSON
│
└── app/
    └── api/
        └── ai/
            └── assistant/
                └── route.ts       ← The chatbot HTTP endpoint
```

---

## 4. Core Concepts {#core-concepts}

### 🧠 A. What is a Language Model (LLM)?
A **Large Language Model** (like Gemini) is an AI trained on massive amounts of text.
It predicts the next word/token based on the input (prompt) you give it.

```
Input (Prompt) → [Gemini LLM] → Output (Generated Text)
```

### 📝 B. System Prompt
A hidden instruction given to the AI **before** the user's message.
It defines the AI's personality, rules, and limitations.

```
System Prompt: "You are WorkMatch AI. Only help with job-related questions."
User Message:  "Is this job a scam?"
               ↓
           [Gemini processes both]
               ↓
AI Reply:  "Here are some warning signs to watch for..."
```

### 🌡️ C. Temperature
Controls how **creative vs. factual** the AI is.

| Value | Behavior | Used For |
|---|---|---|
| `0.0` | Exact, deterministic | Strict factual answers |
| `0.3` | Mostly factual, slight variation | Our chatbot |
| `0.7` | Creative, varied | Story writing |
| `1.0` | Very random | Brainstorming |

> **WorkMatch uses `temperature: 0.35`** — factual but slightly natural-sounding.

### 📦 D. Tokens & maxOutputTokens
- A **token** ≈ ~4 characters or ¾ of a word
- `maxOutputTokens: 400` in our chatbot = limits reply length (saves cost + speed)

### 🔍 E. RAG — Retrieval-Augmented Generation
Instead of trusting the AI to "know" about a specific job, we **inject real data** from our database into the prompt.

```
Without RAG: "Tell me about this job" → AI guesses or hallucinates
With RAG:    "Here is the job data: [title, company, description...]
              Now answer: Tell me about this job" → AI uses real facts
```

---

## 5. Code Walkthrough — `gemini.ts` {#gemini-ts}

**File:** `src/lib/ai/gemini.ts`

---

### Part A: Model Selection

```ts
const configuredModel = process.env.GEMINI_MODEL?.trim();

function resolveModelName(model?: string): string {
  if (
    !model ||
    model === 'gemini-1.5-flash' ||   // Old deprecated models
    model === 'gemini-2.5-flash' ||
    model === 'gemini-2.5-flash-lite' ||
    model === 'gemini-flash-latest'
  ) {
    return 'gemini-3.1-flash-lite';   // Upgrade to current model
  }
  return model;
}

const PRIMARY_MODEL = resolveModelName(configuredModel);
const FALLBACK_MODELS = ['gemini-3.1-flash-lite-preview', 'gemini-3.8-flash'];
```

**What this does:**
- Reads the model name from the `.env` file
- If the model is old/deprecated → automatically upgrades it
- Defines **fallback models** to try if the primary fails

**Why it matters:**
> Google retires old Gemini models. This code ensures the app doesn't break when models are deprecated.

---

### Part B: System Instruction (AI Persona)

```ts
const WORKMATCH_SYSTEM_INSTRUCTION = `
  You are the WorkMatch AI Assistant for a Philippine job-matching platform.

  You may ONLY help with:
  - WorkMatch features, job postings, match-score explanations
  - Job-scam warning signs
  - Resume/career guidance and mock interview coaching

  You must REFUSE:
  - Writing source code, SQL, exploits, or application changes
  - Revealing API keys, environment variables, or internal implementation
  - Inventing candidate skills or verification results

  If asked to write code, reply:
  "I'm the WorkMatch AI Assistant. I can't help write code or modify software."
`;
```

**What this does:**
- Defines the chatbot's **identity and boundaries**
- Runs on **every** request — Gemini reads this before the user's message

**Why it matters:**
> Without this, users could ask Gemini to write malware, reveal secrets, or pretend to be a different AI. This "jailbreaks" prevention is critical for production apps.

---

### Part C: The `generateGeminiText()` Function (THE MAIN ENGINE)

```ts
export async function generateGeminiText(params: {
  userPrompt: string;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<string> {

  // Step 1: Get the API Key
  const apiKey = getGeminiApiKey(); // from .env GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  // Step 2: Build the list of models to try
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: Error | null = null;

  // Step 3: Loop through models (try primary first, fallback if fails)
  for (const model of modelsToTry) {
    try {

      // Step 4: Build the API URL
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      // Step 5: Configure generation settings
      const generationConfig = {
        temperature: params.temperature ?? 0.3,      // How creative
        maxOutputTokens: params.maxOutputTokens ?? 1024, // Max reply length
        thinkingConfig: { thinkingBudget: 0 },       // Disable slow "thinking mode"
      };

      // Step 6: Send POST request to Google Gemini API
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,  // Authentication
        },
        signal: AbortSignal.timeout(params.timeoutMs ?? 30_000), // 30s timeout
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: params.systemInstruction || WORKMATCH_SYSTEM_INSTRUCTION }],
          },
          contents: [
            { role: 'user', parts: [{ text: params.userPrompt }] }
          ],
          generationConfig,
        }),
      });

      // Step 7: Handle errors
      if (!res.ok) {
        const errText = await res.text();
        const error = new Error(`Gemini request failed (${res.status}): ${errText}`);
        if (res.status === 404 || res.status === 400) {
          lastError = error;
          continue; // Try next model
        }
        throw error;
      }

      // Step 8: Parse the response
      const data = await res.json();
      const text = data.candidates[0].content.parts
        .filter(part => !part.thought)   // Remove internal AI thoughts
        .map(part => part.text)
        .join('\n');

      // Step 9: Return the AI's reply
      return text.trim();

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next fallback model
    }
  }

  throw lastError || new Error('All Gemini model endpoints failed.');
}
```

**Step-by-step breakdown:**

| Step | What Happens |
|---|---|
| 1 | Get API key from environment variables |
| 2 | Build ordered list: [primary, fallback1, fallback2] |
| 3 | Loop — try each model until one succeeds |
| 4 | Build the Gemini API URL with the model name |
| 5 | Set temperature, token limit, disable thinking mode |
| 6 | Send HTTP POST to Google's servers with our prompt |
| 7 | If 404/400 error → model retired → try next model |
| 8 | Parse JSON response → extract the text reply |
| 9 | Return clean text to the caller |

---

### Part D: `generateGeminiJson()` — For Structured Outputs

```ts
export async function generateGeminiJson<T>(params): Promise<T> {
  const text = await generateGeminiText({
    ...params,
    responseMimeType: 'application/json', // Force Gemini to output JSON
  });

  // Clean up markdown code fences if Gemini wraps output in ```json
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.endsWith('```'))       cleaned = cleaned.slice(0, -3);

  return JSON.parse(cleaned.trim()) as T;
}
```

**Used for:**
- Skill matching → returns `{ mappings: SemanticSkillMatch[] }`
- Interview scoring → returns structured scores
- Any time we need **data, not plain text** from AI

---

## 6. Code Walkthrough — `assistant/route.ts` {#assistant-route}

**File:** `src/app/api/ai/assistant/route.ts`

This is a **Next.js API Route** — runs only on the server. The browser never sees this code.

---

### Full Annotated Code

```ts
export async function POST(request: NextRequest) {

  // ── STEP 1: Identify the user ──────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userRole = 'visitor';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    userRole = profile?.role || 'user'; // 'jobseeker', 'employer', 'admin'
  }

  // ── STEP 2: Read and validate the request body ─────────────────────────
  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim().slice(0, 2000); // Max 2000 chars
  const jobId = typeof body?.jobId === 'string' ? body.jobId.slice(0, 64) : undefined;

  if (!message) {
    return NextResponse.json({ error: 'Enter a question.' }, { status: 400 });
  }

  // ── STEP 3: Block coding/hacking requests ─────────────────────────────
  // CODING_REQUEST_PATTERN = regex matching "write code", "sql query", "drop table", etc.
  if (CODING_REQUEST_PATTERN.test(message)) {
    return NextResponse.json({
      reply: "I'm the WorkMatch AI Assistant. I can't help write code or modify software.",
    });
  }

  // ── STEP 4: Rate limiting ──────────────────────────────────────────────
  try {
    if (user) {
      await assertAiRateLimit(user.id, 'assistant');    // Limit per user ID
    } else {
      await assertGuestAiRateLimit(request, 'assistant'); // Limit per IP address
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'The assistant is temporarily unavailable.' },
      { status: 429 } // 429 = Too Many Requests
    );
  }

  // ── STEP 5: Load job context from database (RAG) ──────────────────────
  let jobContext = 'No specific job is selected.';

  if (jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, description, qualifications, city, status, company:companies(name, verification_status, verified, website)')
      .eq('id', jobId)
      .eq('status', 'published')
      .maybeSingle();

    if (job) {
      const company = job.company || {};
      jobContext = JSON.stringify({
        title: job.title,
        city: job.city,
        companyVerified: isCompanyVerified(company), // true/false
        verificationStatus: company.verification_status,
        descriptionExcerpt: job.description.slice(0, 800),    // First 800 chars
        qualificationsExcerpt: job.qualifications.slice(0, 500), // First 500 chars
      });
    }
  }

  // ── STEP 6: Build the full prompt ─────────────────────────────────────
  const userPrompt = `
    User role: ${userRole}
    Selected job/company facts the user is allowed to see: ${jobContext}

    User question:
    ${message}

    Rules recap:
    - Do not invent verification, application, or hiring facts.
    - A business permit upload is not automatic verification.
    - For suspicious-job questions, list warning signs and limitations.
    - Offer to use WorkMatch's report-a-job feature when relevant.
  `;

  // ── STEP 7: Call Gemini and return the reply ───────────────────────────
  try {
    const reply = await generateGeminiText({
      systemInstruction: WORKMATCH_SYSTEM_INSTRUCTION,
      userPrompt,
      temperature: 0.35,
      maxOutputTokens: 400,   // Short replies (chatbot style)
      timeoutMs: 45_000,      // 45 seconds max wait
    });

    return NextResponse.json({ reply }); // Send reply back to the browser

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Assistant is unavailable.' },
      { status: 500 }
    );
  }
}
```

---

## 7. Full Request Flow Diagram {#flow-diagram}

```
Browser (User types message)
        │
        │  POST /api/ai/assistant
        │  Body: { message: "Is this job a scam?", jobId: "abc123" }
        ▼
Next.js API Route (route.ts) — Server Side Only
        │
        ├─ [1] Who is the user? → Query Supabase profiles table
        │
        ├─ [2] Validate message (max 2000 chars)
        │
        ├─ [3] Is it a coding request? → Return refusal immediately
        │
        ├─ [4] Rate limit check → Too many requests? → Return 429
        │
        ├─ [5] Load job data from Supabase (if jobId provided) — RAG step
        │
        ├─ [6] Build prompt = role + job data + user question + rules
        │
        └─ [7] Call generateGeminiText()
                    │
                    │  HTTPS POST
                    │  to: https://generativelanguage.googleapis.com/...
                    │  with: systemInstruction + userPrompt + config
                    ▼
            Google Gemini API (Cloud)
                    │
                    │  JSON Response
                    │  { candidates: [{ content: { parts: [{ text: "..." }] } }] }
                    ▼
            Extract text → Return to route.ts
                    │
                    ▼
        Return { reply: "Here are warning signs..." }
                    │
                    ▼
Browser displays the AI reply in the chat UI
```

---

## 8. Key AI Terms Explained {#ai-terms}

| Term | Simple Definition | In WorkMatch |
|---|---|---|
| **LLM** | AI trained on text to generate text | Google Gemini |
| **System Prompt** | Hidden instructions that define AI behavior | `WORKMATCH_SYSTEM_INSTRUCTION` |
| **User Prompt** | The actual question/message sent to AI | User's chat message + job context |
| **Temperature** | Controls creativity (0=factual, 1=random) | `0.35` (mostly factual) |
| **Tokens** | Unit of text the AI processes | ~4 chars each |
| **maxOutputTokens** | Caps the AI reply length | `400` tokens |
| **RAG** | Injecting real database data into the prompt | Job details from Supabase |
| **Fallback Chain** | Try model A, if fail try model B | 3 Gemini models in sequence |
| **Rate Limiting** | Limit how many requests a user can make | Per user ID or IP address |
| **API Key** | Secret password to access Gemini | `GEMINI_API_KEY` in `.env` |

---

## 9. Defense Q&A {#defense-qa}

**Q: What AI did you use?**
> "We used Google Gemini, specifically the `gemini-3.1-flash-lite` model, accessed via Google's Generative Language REST API."

**Q: How does the chatbot know about specific jobs?**
> "We use a technique called RAG — Retrieval-Augmented Generation. Before calling Gemini, we fetch the specific job's data from our Supabase database and inject it into the prompt. This way, Gemini answers based on real data, not hallucinations."

**Q: What prevents users from abusing the chatbot?**
> "Three layers of protection: (1) a regex pattern blocks coding/hacking requests before even calling Gemini, (2) a rate limiter prevents spam — 429 error for too many requests, and (3) the system prompt explicitly tells Gemini to refuse harmful requests and ignore jailbreak attempts."

**Q: What is the System Prompt?**
> "The system prompt is a hidden instruction we send to Gemini on every request. It defines the AI's role as the WorkMatch assistant, lists what it can and cannot help with, and establishes safety guardrails. Users never see this — it runs behind the scenes."

**Q: What happens if Gemini is down or the model is retired?**
> "We implemented a fallback chain. The app tries the primary model first. If it returns a 404 or 400 error (model unavailable), it automatically tries two backup models. This makes the chatbot resilient to model deprecations."

**Q: Why is the API route server-side?**
> "Security. The API key for Gemini must never be exposed to the browser. By putting the Gemini call inside a Next.js API Route, it runs only on the server. The browser only receives the final reply text."

**Q: What does temperature mean?**
> "Temperature controls how creative vs. factual the AI is. We set it to 0.35, which means Gemini gives mostly consistent, factual answers — important for a job platform where accuracy matters more than creativity."

---

## 📌 One-Sentence Summary

> **WorkMatch sends the user's message plus real job data from Supabase to Google Gemini via a secure server-side API route, with rate limiting and input validation as guardrails, and Gemini generates a constrained, helpful reply based on a custom system prompt.**

---

*Generated for WorkMatch Capstone Defense | October 2026*
