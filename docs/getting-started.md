# Getting Started with KOS2

KOS2 is best when you treat it as a local operating layer for notes, projects, and decisions, not just a chat panel.

The shortest happy path is:

1. install the plugin from source
2. start Ollama locally
3. pull one chat model and one embedding model
4. turn on `Privacy (local) Mode` if that matches how you want to work
5. use the `KOS starter` paths instead of treating the product like a blank chatbot

KOS2 can run fully local if you want:

- local Ollama for chat
- local Ollama for embeddings
- no cloud key
- no transcript API

## Install from source

### 1. Clone and build

```bash
git clone https://github.com/pdurlej/KOS2.git
cd KOS2
npm install
npm run build
```

### 2. Copy the plugin into your vault

Replace `/path/to/YourVault` with your actual vault path:

```bash
mkdir -p "/path/to/YourVault/.obsidian/plugins/kos2"
cp main.js manifest.json styles.css "/path/to/YourVault/.obsidian/plugins/kos2/"
```

### 3. Enable in Obsidian

1. Open `Settings -> Community plugins`
2. Turn off `Restricted mode` if needed
3. Reload plugins or restart Obsidian
4. Enable `KOS2`

## First Local Setup

### 1. Install and start Ollama

Official installer: [ollama.com](https://ollama.com/)

If you use Homebrew on macOS:

```bash
brew install --cask ollama
open -a Ollama
```

### 2. Pull a chat model

Good first options:

```bash
ollama pull qwen3:8b
```

or:

```bash
ollama pull gemma3:12b
```

### 3. Pull an embedding model

```bash
ollama pull bge-m3
```

## Configure KOS2

Open `Settings -> KOS2`.

### Setup tab

Use this order:

1. Confirm local Ollama is reachable
2. Turn on `Privacy (local) Mode` if you want your default path to stay local
3. Set `Default Chat Model` to `KOS2 Local Agent` or to a specific local model
4. Keep `Ollama Cloud` empty unless you actually want web search and web fetch

### Knowledge tab

Use this order:

1. Click `Refresh Ollama Models`
2. Confirm your local chat and embedding models are visible
3. Pick a local embedding model if you want semantic search
4. Build the index if you want note retrieval by meaning instead of keywords only

## First Productive Use

When KOS2 opens, avoid starting with generic prompts like “hi” or “what can you do?”

Use one of the workflow paths:

- `Organise` for intake notes and rough material
- `Next steps` for turning a note or project into pending actions
- `Decision` for drafting a decision from evidence
- `Review` for outcome reflection and follow-up capture

Important: today `Organise` is best understood as a safe intake routing tool, not yet a universal artifact generator. It is strong at recognizing the current artifact, keeping traceability, and pointing you to the next safe workflow step.

## Local vs Cloud

KOS2 has two distinct paths:

- `Ollama Local`: local chat, local embeddings, local vault work
- `Ollama Cloud`: optional helper path for web search and web fetch

If you care about privacy for your most valuable notes, keep your working path on:

- `Privacy (local) Mode`
- `KOS2 Local Agent`
- local embeddings

## Optional Transcript Setup

KOS2 currently supports transcript setup guidance through:

- `Supadata` for transcript API access
- local preparation with `yt-dlp` and `whisper`

Treat this as an evolving capability, not a fully finished media pipeline.

## Local Smoke Check

```bash
npm run smoke:ollama
```

This verifies:

- local Ollama model discovery
- local chat inference
- local embeddings
- optional Ollama Cloud web search

## Related

- [KOS Philosophy](kos-philosophy.md)
- [Chat Interface](chat-interface.md)
- [Agent Mode and Tools](agent-mode-and-tools.md)
- [Vault Search and Indexing](vault-search-and-indexing.md)
