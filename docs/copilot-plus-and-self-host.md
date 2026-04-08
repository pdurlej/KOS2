# Cloud and Legacy Integrations

This document exists mainly for inherited context.

KOS2 is no longer framed around the old `Copilot Plus` product model. The primary path is now:

- `Ollama Local` for chat, embeddings, and vault work
- `Ollama Cloud` only when web search and web fetch are useful

## What Changed

The upstream product treated “Plus” and “self-host” as the main way to unlock advanced behavior.

KOS2 does not present the product that way anymore.

Instead:

- local Ollama is the normal default
- web tooling is optional
- transcript access requires explicit setup
- legacy self-host surfaces are being pushed out of the main setup flow

## What Still Matters From The Old Model

Some inherited capabilities still exist in code or UI because the repo started as a soft fork:

- memory-related surfaces
- document processing surfaces
- remote or companion-service integrations
- advanced provider-oriented settings

These should be understood as migration context or advanced internals, not as the core narrative for KOS2.

## Transcript Path

For YouTube transcripts, the current intended setup is:

- `Supadata` for transcript API access
- or local preparation with `yt-dlp` and `whisper`

KOS2 currently exposes setup guidance for this, but the transcript stack should still be treated as evolving.

## Web Search Path

KOS2 uses `Ollama Cloud` as the optional cloud companion for:

- web search
- web fetch

If web access is not important for your workflow, you can leave this path disabled and keep the working setup local.

## Why Keep This Document

Because the codebase still contains inherited architecture and some legacy settings, it is useful to keep one short page that explains:

- what was inherited
- what changed
- what should no longer be treated as the primary setup story

## Related

- [Getting Started](getting-started.md)
- [Agent Mode and Tools](agent-mode-and-tools.md)
- [KOS Philosophy](kos-philosophy.md)
