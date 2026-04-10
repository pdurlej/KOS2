# Troubleshooting and FAQ

This guide covers the issues that matter most for the current KOS2 product shape: local Ollama, model discovery, embeddings, privacy mode, optional cloud setup, and transcript expectations.

## First Checks

Before going deeper:

1. Confirm you are on the latest KOS2 release
2. Reload plugins or restart Obsidian
3. Make sure Ollama is running
4. Open `Settings -> KOS2 -> Knowledge` and click `Refresh Ollama Models`

If you are reporting a bug, include:

- your OS and machine type
- KOS2 version
- how you installed it (`BRAT`, `release assets`, or `source`)
- the model you tried to use

## Ollama Runtime

### KOS2 says Ollama is unreachable

**What to check**

- Ollama is running locally
- the host in KOS2 matches your local Ollama address
- `ollama list` works in a terminal

**Useful commands**

```bash
ollama list
curl http://127.0.0.1:11434/api/tags
```

If `localhost` behaves strangely on your machine, try `127.0.0.1`.

### Models do not appear after `Refresh Ollama Models`

**What to check**

- the models are actually installed locally
- you refreshed from `Knowledge`, not just from `Setup`
- the current Ollama host is the same runtime where you pulled the models

If the list is still empty:

1. re-run `ollama list`
2. re-pull the model if necessary
3. refresh again inside `Knowledge`

## Embeddings

### Chat models appear, but embedding models do not

KOS2 only shows embedding candidates that look usable for the embedding path.

**What to check**

- you pulled an embedding model such as `bge-m3`
- you refreshed models after pulling it
- you are looking at the `Knowledge` tab and not just `Setup`

Start with:

```bash
ollama pull bge-m3
```

Then click `Refresh Ollama Models` again.

### Semantic search is off even though Ollama works

That usually means one of these is still missing:

- no embedding model selected
- index not built yet
- knowledge search still disabled

Go to `Settings -> KOS2 -> Knowledge` and:

1. choose a local embedding model
2. turn on semantic search
3. build the index

## Privacy And Local Defaults

### I want KOS2 to stay local by default

Use this combination:

- turn on `Privacy (local) Mode`
- set the default chat path to `KOS2 Local Agent`
- keep embeddings on a local Ollama model
- leave `Ollama Cloud` empty unless you need web tools

### I do not have an `Ollama Cloud` key

That is fine.

Without `Ollama Cloud`, KOS2 still supports:

- local chat
- local embeddings
- local workflow paths
- fully local note work

What you lose is only:

- web search
- web fetch

## Transcript Setup

### YouTube transcripts are not working automatically

Transcript support is currently a setup-assisted capability, not a finished autonomous media pipeline.

The two intended paths are:

- `Supadata` for transcript API access
- local preparation with `yt-dlp` and `whisper`

If you want the easiest path, use Supadata first.

## BRAT And Install Paths

### BRAT installed KOS2, but I am not sure which version I got

Check:

- KOS2 version in Obsidian plugin settings
- the latest release on [GitHub Releases](https://github.com/pdurlej/KOS2/releases/latest)

If in doubt:

1. update BRAT
2. re-add `pdurlej/KOS2`
3. install the latest release again

### I installed from release assets and KOS2 does not load

Make sure the plugin folder contains exactly these files:

- `main.js`
- `manifest.json`
- `styles.css`

The folder should be:

```text
<your-vault>/.obsidian/plugins/kos2/
```

## Still Stuck?

Open an issue and include:

- install path used
- local models installed
- whether you stayed local-only or used hybrid mode
- what exact step failed

Issue tracker: [github.com/pdurlej/KOS2/issues/new/choose](https://github.com/pdurlej/KOS2/issues/new/choose)
