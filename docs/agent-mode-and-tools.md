# Agent Mode and Tools

KOS2 includes an agent path for more complex note and web tasks.

This document is intentionally lighter than the old upstream “Copilot Plus” explanation. It describes what KOS2 can do now and where setup is still required.

## What the KOS2 Agent Is For

Use the agent when the job is more than a single answer and needs a short workflow:

- search the vault and inspect relevant notes
- search the web when current information matters
- create or edit notes with previewable changes
- combine evidence into a useful response

If the task is simple, normal chat is usually enough.

## What the Agent Can Use

### Core note tools

- vault search
- read note
- write to file
- edit file

These are the tools that matter most for KOS-style note work.

### Optional web tool

- web search

In KOS2 this should be treated as optional. It is not the default center of gravity. Web search is most useful when the task clearly depends on current external information.

### Optional transcript tool

- YouTube transcription

This now depends on explicit setup. KOS2 surfaces transcript setup in the plugin and currently points users toward:

- `Supadata` for transcript API access
- local preparation with `yt-dlp` and `whisper`

### Experimental desktop controls

Some inherited desktop or CLI-oriented tools still exist in the codebase, but they are not the primary product story and should be treated as advanced or experimental.

## Privacy And Local Defaults

If you want the default agent path to stay local:

1. enable `Privacy (local) Mode`
2. set the default chat model to `KOS2 Local Agent`
3. keep embeddings on a local Ollama model

That gives you a cleaner split:

- local model for note work
- optional cloud only when you deliberately want web search or web fetch

KOS2 can operate fully local. The cloud path exists only when you explicitly want help with current web information or web fetch flows.

## File Editing Behavior

When the agent writes or edits notes, the intended path is preview-first note operations rather than silent mutation.

Use the agent for:

- creating a note draft
- updating an existing note
- turning rough material into a clearer artifact

Treat it as an operator with guardrails, not as an invisible background process.

## When To Use Which Mode

- `Chat`: simple reasoning, rewriting, summarization, or conversation
- `Knowledge`: when note retrieval matters and you want search-backed help
- `KOS2 Agent`: when the request involves note work plus tools plus a small workflow
- `Projects`: inherited workspace isolation when you need separated chat state

## Related

- [Getting Started](getting-started.md)
- [KOS Philosophy](kos-philosophy.md)
- [Vault Search and Indexing](vault-search-and-indexing.md)
- [Custom Commands](custom-commands.md)
