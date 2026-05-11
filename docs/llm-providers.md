# LLM Providers

KOS2 is Ollama-first. All core functionality — chat, vault search, embeddings, agent mode — works
fully with a local Ollama install and no external accounts.

A secondary provider type (OpenAI-compatible) lets you connect to any self-hosted or third-party
endpoint that speaks the OpenAI API format.

---

## Ollama (Primary)

Runs open-source models locally on your machine.

- **Default URL**: `http://localhost:11434/v1/`
- **No API key required**
- **Setup**:
  1. Install Ollama from [ollama.com](https://ollama.com)
  2. Pull a model: `ollama pull qwen2.5:7b`
  3. KOS2 auto-discovers models from the running Ollama daemon

### Recommended first-run models

| Use | Model | Pull command |
|-----|-------|--------------|
| Chat (balanced) | qwen2.5:7b | `ollama pull qwen2.5:7b` |
| Chat (fast/small) | qwen2.5:3b | `ollama pull qwen2.5:3b` |
| Embeddings | bge-m3 | `ollama pull bge-m3` |

Open the **Ollama Setup** section in Settings to get machine-tuned pull recommendations.

### Remote Ollama

If Ollama runs on another machine (NAS, workstation), change the base URL in model settings to
point at that machine: `http://192.168.1.10:11434/v1/`.

---

## OpenAI-Compatible Endpoints (Secondary)

For any API that follows the OpenAI API format. Useful for:

- LM Studio (`http://localhost:1234/v1`)
- vLLM, LiteLLM, Tabby, koboldcpp, or any local inference server
- Third-party hosted endpoints that accept OpenAI-format requests

**Setup**: In the model settings dialog, select **3rd Party (OpenAI-format)** as the provider,
enter the base URL, and optionally add a per-model API key.

> **CORS note**: Some endpoints don't support CORS from Obsidian's browser context. If you see a
> CORS error, enable the **CORS** toggle on the custom model form. Streaming is not available in
> CORS mode.

---

## Web Search and Web Fetch

KOS2 uses Ollama Cloud as an optional companion for web-related tools:

- `@web` — search the web from the chat input
- `@url` — fetch and read a web page

These work without any API key when the Ollama Cloud service is reachable. If you prefer to
disable all outbound requests, turn off web tools in Settings.

---

## Embeddings

Embeddings (used for vault indexing and semantic search) follow the same two-provider model:

- **Ollama** — `bge-m3:latest` is the recommended default
- **OpenAI-compatible** — any embedding endpoint that accepts OpenAI-format requests

Configure the embedding model in **Settings → Copilot → QA**.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Connection refused" on Ollama | Make sure Ollama is running: `ollama serve` |
| Model not listed in KOS2 | Pull it first (`ollama pull <model>`), then refresh model list |
| CORS error on custom endpoint | Enable the CORS toggle on the model's settings form |
| Slow first response | Large models take time to load into memory; responses speed up after warm-up |

---

## Related

- [Models and Parameters](models-and-parameters.md) — Enable, disable, and configure individual models
- [Getting Started](getting-started.md) — First-time setup
- [Vault Search and Indexing](vault-search-and-indexing.md) — Embedding model setup
