# Models and Parameters

This guide explains how to manage chat models, embedding models, and the parameters that control
how the AI behaves.

---

## Chat Models

### Default Models

KOS2 comes with two built-in chat models. Both run locally via Ollama — no cloud account needed.

| Model | Provider | Notes |
|-------|----------|-------|
| qwen3-coder:30b | Ollama | Default for coding and structured tasks |
| SpeakLeash/bielik-7b-instruct-v0.1-gguf:Q5_K_M | Ollama | Optimised for Polish-language work |

If you haven't pulled these yet, use the **Ollama Setup** section in Settings to get
machine-tuned pull recommendations and copy-ready commands.

### Model Capability Badges

Models may show capability badges you assign when adding a custom model:

- **Reasoning** — Extended internal thinking; better for complex multi-step tasks
- **Vision** — Can process images embedded in notes

### Managing Models

Go to **Settings → Copilot → Model** to see the full model list.

- **Enable/disable** — Toggle individual models on or off
- **Reorder** — Drag models to change their position in the dropdown
- **Delete** — Remove custom models you've added

### Adding Custom Models

KOS2 discovers Ollama models automatically. To add a model from a custom endpoint:

1. Go to **Settings → Copilot → Model**
2. Click **Add Model**
3. Enter the model name as the endpoint expects it (e.g., `llama3.1:8b`)
4. Select the provider (**Ollama** or **3rd Party (OpenAI-format)**)
5. For 3rd-party endpoints, add the base URL and optional API key
6. Save

---

## Embedding Models

Embedding models convert text into numerical vectors, which powers semantic search in Vault QA.

### Default Embedding Model

| Model | Provider | Notes |
|-------|----------|-------|
| bge-m3:latest | Ollama | Multilingual, good recall across most vaults |

Pull it with: `ollama pull bge-m3`

### Custom Embedding Models

Any OpenAI-compatible embedding endpoint works. Add it under **Settings → Copilot → Model** with
the **Embedding** toggle enabled.

### Selecting an Embedding Model

Go to **Settings → Copilot → QA** → **Embedding Model**.

> If you change embedding models, you must rebuild the vault index — old and new vectors are not
> compatible. KOS2 will prompt you to confirm before rebuilding.

---

## Model Parameters

These settings control how the AI responds. Global defaults live in **Settings → Copilot → Model**.
You can override them per-session using the gear icon in the chat panel.

### Temperature

Controls how random or creative responses are.

- **Range**: 0.0–1.0
- **Default**: 0.1
- **Low (0.0–0.2)**: Precise, factual, deterministic
- **High (0.8–1.0)**: Creative, varied, less predictable

### Max Tokens

Maximum tokens in the AI's response. A token is roughly ¾ of a word.

- **Default**: 6,000

### Conversation Turns in Context

How many past conversation turns to include in each request.

- **Default**: 15

### Auto-Compact Threshold

When the conversation reaches this many tokens, older messages are automatically summarised.

- **Default**: 128,000 tokens
- See [Chat Interface](chat-interface.md) for details

### Reasoning Effort

For models that support extended reasoning, controls how much internal thinking happens before
responding.

- **Options**: minimal, low, medium, high, xhigh
- **Default**: low

---

## Related

- [LLM Providers](llm-providers.md) — Provider setup and troubleshooting
- [Vault Search and Indexing](vault-search-and-indexing.md) — How embedding models are used
- [Getting Started](getting-started.md) — First-time setup
