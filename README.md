# Smriti AI (स्मृति) — AI-Powered Personal Memory Companion

Smriti AI is an AI-powered memory companion and foundational Second Brain inspired by the Sanskrit word **Smriti** (*स्मृति* — memory and remembrance). Rather than acting as a standard conversational chatbot, Smriti operates as a **Personal Memory Agent** that transforms conversations and reflections into structured, queryable knowledge with human oversight and user-isolated security.

---

## 1. Product Features & Architecture

- **Personal Memory Agent**: Facilitates multi-turn reflective dialogues with Gemini, asking insightful coaching questions and synthesizing memories.
- **Wisdom Circle Module**: Preserve timeless advice, life philosophies, stories, and core values from people who shaped you (Mother, Father, Mentor, Teacher, Friend, Grandparent, etc.).
  - **Zero-Auto-Surface Privacy Policy**: Wisdom is strictly gated behind explicit user consent before retrieval into agent reflections.
  - **Bidirectional Memory Vault Integration**: Link mentor wisdom directly to memories to preserve guidance lineage.
- **Book Wisdom Module**: Preserve ideas, lessons, quotes, principles, and personal reflections from books.
  - **User-Isolated Storage**: Stored at `/users/{userId}/books/{bookId}` with owner-only access.
  - **Search & Author/Theme Filtering**: Real-time searching across titles, authors, key ideas, quotes, reflections, and tags.
  - **Human-in-the-Loop Curation**: Fully human editable before persistence and at any time.
  - **Bidirectional Memory Vault Linking**: Cross-link book entries with reflections and launch tailored reflection dialogues.
- **Related Wisdom Retrieval & Knowledge Graph Foundation**:
  - **Unified Knowledge Search**: Concurrently searches across Memories, Wisdom Circle, and Book Wisdom during reflection.
  - **Permission-Gated Discovery (Zero-Auto-Surface)**: Does NOT automatically display results; prompts the user first: *"I found potentially relevant wisdom. Would you like to review it?"*.
  - **Structured Review Display**: Explicitly displays **Source**, **Why it is relevant**, **Tags**, and **Themes**.
  - **Interactive Knowledge Graph Visualizer**: Visualizes semantic relationships with node topology, connection edge reasons, relevance weight scores, and action hooks to quote in input or consult in dialogue with consent.
- **Structured Memory Extraction**: Automatically extracts:
  - Concise Summaries
  - Key Learnings (bulleted takeaways)
  - Action Items (with interactive checkbox tracking)
  - Theme Categories and Topic Tags
  - AI Transparency Rationale
- **Spoken Voice Agent**: Real-time two-way dialogue with speech synthesis and voice capture.
- **Responsible AI & Human Oversight**: Dedicated review modal allowing users to inspect, edit, or adjust all AI-generated fields before committing to their permanent vault.
- **Strict User-Isolated Storage**: All memories (`/users/{userId}/memories`) and wisdom entries (`/users/{userId}/wisdom`) are protected by Cloud Firestore Security Rules guaranteeing per-user isolation.
- **Resilient Model Fallback Ladder**: Server-side helper that cascades through `gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash` across transient 429/503 errors.

---

## 2. Threat Modeling & Countermeasures Summary

| Threat Zone | Identified Risks | Implemented Countermeasures |
| :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection in reflections, untrusted strings in wisdom entries | Strict TypeScript schema validation, null-safe payload sanitization, zero-undefined Firestore cleaner |
| **Planning & Reasoning** | System instruction bypass, unauthorized automated memory/wisdom retrieval | Zero-Auto-Surface architecture requiring explicit user consent modal; system prompts strictly isolate data from instructions |
| **Tool Execution & APIs** | SSRF or key leakage via API calls, rate-limiting failures | Server-side Next.js route proxies, Google Secret Manager for `GEMINI_API_KEY`, automated 4-tier model fallback ladder |
| **Memory & State** | Cross-user data leakage, unauthorized read/write access in Firestore | Hardened Firestore rules with `isOwner(userId)` checking `request.auth.uid == userId` for all `/users/{userId}/**` paths |
| **Inter-System Communication**| Token interception, insecure credentials in code | Google Federated Identity via Firebase Auth (no passwords handled in code), zero hardcoded secrets |

---

## 3. Cloud Prerequisites & API Setup

Ensure you have the [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed and authenticated:

```bash
# Log in to Google Cloud
gcloud auth login

# Set your active Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 3. Secret Manager Configuration

Secure your Gemini API key inside Google Cloud Secret Manager so it is never committed or exposed client-side:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Identify your Cloud project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# 3. Grant the Cloud Run runtime service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Firestore Security Rules Configuration

Deploy the hardened, user-isolated Firestore security rules supporting both `/users/{userId}`, `/users/{userId}/memories/{memoryId}`, and `/users/{userId}/interactions/{interactionId}`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function verifying authenticated user ownership
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // User profile document: /users/{userId}
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // User structured memories subcollection: /users/{userId}/memories/{memoryId}
    match /users/{userId}/memories/{memoryId} {
      allow read, write: if isOwner(userId);
    }

    // User wisdom circle subcollection: /users/{userId}/wisdom/{wisdomId}
    match /users/{userId}/wisdom/{wisdomId} {
      allow read, write: if isOwner(userId);
    }

    // User book wisdom subcollection: /users/{userId}/books/{bookId}
    match /users/{userId}/books/{bookId} {
      allow read, write: if isOwner(userId);
    }

    // User interactions subcollection: /users/{userId}/interactions/{interactionId}
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if isOwner(userId);
    }

    // User conversations subcollection: /users/{userId}/conversations/{conversationId}
    match /users/{userId}/conversations/{conversationId} {
      allow read, write: if isOwner(userId);
    }

    // Catch-all for any nested subcollections under the authenticated user
    match /users/{userId}/{allSubcollections=**} {
      allow read, write: if isOwner(userId);
    }
  }
}
```

Deploy using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Cloud Run Deployment Flow & Campaign Verification

Build and deploy your Next.js application to Google Cloud Run, injecting the Secret Manager binding and applying the required campaign verification label:

```bash
# Deploy to Google Cloud Run
gcloud run deploy smriti-ai \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

### Challenge Verification Label Binding

If updating an existing Cloud Run service, attach the mandatory verification label:

```bash
gcloud run services update smriti-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Walkthrough & Testing Steps

To verify application stability and interaction pathways:

1. **Google Sign-In Authentication**:
   - Navigate to `/`.
   - Click **"Continue with Google Sign-In"** or **"Sign In with Google"**.
   - Verify that the authenticated header appears displaying the user's name and email.
2. **Multi-Turn Reflection Dialogue**:
   - In the **Reflection Dialogue** tab, select a starter prompt (e.g. *"What decision did I make today..."*).
   - Click Send. Verify that Smriti responds with an empathetic coaching question within 2–3 seconds.
   - Reply with additional thoughts to establish multi-turn context.
3. **Agentic Memory Synthesis**:
   - Click the **"Synthesize into Structured Memory"** button.
   - Verify the loading indicator triggers and the **Human Review & Oversight Modal** opens.
4. **Human Review & Oversight**:
   - Inspect the generated Summary, Key Learnings, Action Items, and AI Rationale.
   - Edit one of the action items or key learnings.
   - Click **"Commit to Smriti Vault"**.
5. **Memory Vault & Search Verification**:
   - Switch to the **Memory Vault** tab.
   - Verify the newly saved memory appears with its theme, summary, and action items.
   - Click an action item checkbox to toggle completion; verify state persists.
   - Enter a search query in the search bar and verify instantaneous filtering.
6. **Growth Patterns**:
   - Switch to the **Growth Patterns** tab.
   - Verify that total memories, themes, and action items reflect active corpus statistics.
7. **Wisdom Circle Preservation & Search**:
   - Switch to the **Wisdom Circle** tab.
   - Click **"+ Preserve Wisdom"** and enter:
     - Person Name: `Mother`
     - Relationship: `Mother`
     - Wisdom / Advice: `Always listen before you react; silence often teaches what words cannot.`
     - Situation: `When I faced a tough conflict at work.`
     - Why It Matters: `Grounds me in patience and empathy.`
     - Tags: `patience`, `listening`
     - Themes: `Emotional Intelligence`
   - Click **"Preserve in Wisdom Circle"**. Verify that the card renders in the grid.
   - Test the relationship filter pills (`Mother`, `Mentor`, `Teacher`, etc.) and the search input.
   - Click **"Edit"** on the card to edit a field and verify instant Firestore update.
8. **Explicit Consent-Gated Retrieval & Consultation**:
   - On the wisdom card, click **"Consult with Reflection"**.
   - Verify the **Explicit Consent Gate Modal** opens explaining the Zero-Auto-Surface Privacy Policy.
   - Click **"Grant Consent & Consult Smriti"**.
   - Verify that the app transitions to the **Agent Reflection** tab and shows the **"User-Consented Wisdom Attached"** banner.
   - Send a prompt to Smriti; verify that Smriti seamlessly weaves the mentor's advice into its coaching response.
   - Click **"Detach"** on the banner to verify that consent is immediately revoked.
9. **Bidirectional Cross-Linking (Wisdom <-> Memory Vault)**:
   - In **Wisdom Circle**, click **"Link Memory"** on a wisdom card to attach it to an existing memory.
   - In **Memory Vault**, click **"Link Mentor"** to connect advice directly to a life memory.
   - Verify bidirectional link badges render cleanly in both tabs.
