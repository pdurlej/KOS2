# Chat Interface

The KOS2 chat panel is the main way you interact with the plugin in Obsidian. This guide covers the current chat UI: modes, message controls, history, settings, and the workflow-oriented surfaces that matter most.

---

## Chat Modes

KOS2 currently exposes four top-level paths. You can switch between them using the selector at the top of the chat panel.

### Chat

General-purpose conversation. Good for writing, brainstorming, summarizing, or any task where you want to talk to an AI. Your currently open note and selected text are automatically included as context.

### Knowledge

Ask questions about your vault content. KOS2 uses lexical search by default and semantic search when you enable a local embedding model and build the index.

### KOS2 Agent

The workflow-heavy path. Use this when the task needs tools instead of only a direct answer:

- Search your vault and the web
- Read and edit notes
- Use the available tools automatically

Web and transcript capabilities still depend on explicit setup.

### Projects (alpha)

Focused workspaces with their own context, model, system prompt, and isolated chat history. Useful for keeping separate AI conversations per project. See [Projects](projects.md) for details.

---

## Sending Messages

Type your message in the input box at the bottom of the chat panel and press **Enter** to send (or **Shift+Enter** to add a new line). You can change the send key in Settings → Basic → **Default Send Shortcut**.

While the AI is generating a response, a **Stop** button appears. Click it to interrupt the stream at any time.

### Referencing Notes Inline

You can mention specific notes directly in your message using double-bracket syntax:

```
[[Note Title]]
```

Copilot adds the note's content to your message as context in the background. This is different from @-mentions — it's typed directly in your message text.

### User Message Buttons

Each message you send has action buttons that appear on hover:

- **Edit** — Modify your prompt. Press Enter to re-send the edited message to the AI.
- **Copy** — Copy the message text to clipboard
- **Delete** — Remove this message from the conversation

### AI Message Buttons

Each AI response has action buttons:

- **Insert at cursor** — Insert the AI's response at your cursor position in the active note
- **Replace at cursor** — Replace the selected text in your note with the AI's response
- **Copy** — Copy the response to clipboard
- **Regenerate** — Ask the AI to generate a new response to the same message
- **Delete** — Remove this response from the conversation

---

## Chat History

### Autosave

By default, KOS2 automatically saves your conversations as markdown files in your vault. The save path now lives under the KOS2 system root instead of the old upstream folder layout.

You can turn off autosave in Settings → Basic. When you start a new chat, any unsaved conversation is saved automatically.

### Chat File Name Format

The filename template controls how saved chats are named. The default is:

```
{$topic}@{$date}_{$time}
```

Where:

- `{$topic}` — An AI-generated title (or the first few words of your first message if AI titles are off)
- `{$date}` — Date in YYYY-MM-DD format
- `{$time}` — Time in HH-MM-SS format

All three variables are required. You can customize the format in Settings → Basic → **Conversation note name**.

### AI-Generated Titles

When **Generate AI chat title on save** is enabled (default), KOS2 asks the AI to generate a short, descriptive title for the conversation when saving. When disabled, the first 10 words of your first message are used instead.

### Loading Previous Chats

Click the **clock/history icon** in the chat panel toolbar to open the Chat History list. You can:

- Browse previous conversations
- Click a conversation to load it and continue from where you left off
- Delete conversations you no longer need

The history list can be sorted by most recent or alphabetically.

---

## Per-Session Settings (Gear Icon)

Click the **gear icon** inside the chat panel to open per-session settings. These apply only to the current conversation and reset when you start a new chat:

- **System prompt** — Override the default system prompt for this session
- **Temperature** — Controls randomness (0 = deterministic, 1 = creative)
- **Max tokens** — Maximum length of the AI's response

---

## Token Counter

KOS2 can show a token count indicator at the bottom of the chat. This estimates how many tokens are being used by your current context. Useful when you're approaching context limits, but it is no longer a primary UX element.

---

## Auto-Compact

When a conversation grows very long, it can exceed the model's context window. Auto-compact automatically summarizes the older portion of the conversation and replaces it with a compressed summary, letting you continue chatting without losing track of what was discussed.

The threshold is configured in Settings → Basic → **Auto-compact threshold**, which defaults to 128,000 tokens. Valid range: 64,000–1,000,000 tokens.

When auto-compact triggers, you'll see a "Compacting" indicator in the chat. The conversation continues normally — older messages are replaced by a summary, so the AI still understands the history even though you can no longer scroll back to see the original messages.

---

## Suggested Prompts

When starting a new chat, KOS2 may show workflow starter paths instead of generic prompt spam. You can still enable or disable the prompt surface from settings if needed.

## Relevant Notes

KOS2 can display a list of notes related to your currently active note in the chat panel. This helps surface notes you might want to reference without manually searching.

Enable in `Settings -> KOS2 -> Setup -> Relevant Notes` if you want it visible.

## Saving a Chat Manually

If autosave is off, or you want to save mid-conversation, click the **Save Chat as Note** button above the chat input box. This saves the current conversation to your configured save folder.

---

## New Chat Behavior

Click the **pencil/new chat icon** to start a fresh conversation. This:

1. Saves the current conversation (if autosave is enabled)
2. Clears the chat window
3. Resets the context to your currently active note

You can also use the command palette: **New KOS2 Chat**.

---

## Related

- [Context and Mentions](context-and-mentions.md) — Control what context the AI sees
- [System Prompts](system-prompts.md) — Customize AI behavior with system prompts
- [Agent Mode and Tools](agent-mode-and-tools.md) — What the KOS2 agent can do
- [KOS Philosophy](kos-philosophy.md) — Why the product is shaped around workflow paths
- [Projects](projects.md) — Isolated workspaces with separate histories
