import { CustomCommand } from "@/commands/type";

export const LEGACY_SELECTED_TEXT_PLACEHOLDER = "{copilot-selection}";
export const COMMAND_NAME_MAX_LENGTH = 50;
export const QUICK_COMMAND_CODE_BLOCK = "copilotquickcommand";
export const EMPTY_COMMAND: CustomCommand = {
  title: "",
  content: "",
  showInContextMenu: true,
  showInSlashMenu: true,
  order: 0,
  modelKey: "",
  lastUsedMs: 0,
};

// Custom command frontmatter property constants
export const COPILOT_COMMAND_CONTEXT_MENU_ENABLED = "copilot-command-context-menu-enabled";
export const COPILOT_COMMAND_SLASH_ENABLED = "copilot-command-slash-enabled";
export const COPILOT_COMMAND_CONTEXT_MENU_ORDER = "copilot-command-context-menu-order";
export const COPILOT_COMMAND_MODEL_KEY = "copilot-command-model-key";
export const COPILOT_COMMAND_LAST_USED = "copilot-command-last-used";
export const LEGACY_DEFAULT_COMMAND_TITLES = [
  "Fix grammar and spelling",
  "Translate to Chinese",
  "Summarize",
  "Simplify",
  "Explain like I am 5",
  "Emojify",
  "Make shorter",
  "Make longer",
  "Generate table of contents",
  "Generate glossary",
  "Remove URLs",
  "Rewrite as tweet",
  "Rewrite as tweet thread",
  "Clip YouTube Transcript",
  "Clip Web Page",
] as const;
export const DEFAULT_COMMANDS: CustomCommand[] = [
  {
    title: "Organise into PARA",
    content: `Read {} and route it into PARA.

Return only markdown with these sections:
- Suggested location
- Why it belongs there
- What to keep
- What to discard or defer
- Next safe action

Be concrete. Do not drift into generic brainstorming.`,
    showInContextMenu: true,
    showInSlashMenu: true,
    order: 1000,
    modelKey: "",
    lastUsedMs: 0,
  },
  {
    title: "Extract Next Steps",
    content: `Read {} and extract the real next steps.

Return only markdown with these sections:
- Actions
- Blockers
- Open questions
- Follow-up owner or source

Keep actions specific, testable, and ready to execute. Do not include vague advice.`,
    showInContextMenu: true,
    showInSlashMenu: true,
    order: 1010,
    modelKey: "",
    lastUsedMs: 0,
  },
  {
    title: "Draft Decision",
    content: `Turn {} into a decision draft.

Return only markdown with these sections:
- Decision
- Context
- Evidence
- Tradeoffs
- Risks
- Follow-up review trigger

If the material is too weak for a decision, say so clearly and list what evidence is missing.`,
    showInContextMenu: true,
    showInSlashMenu: true,
    order: 1020,
    modelKey: "",
    lastUsedMs: 0,
  },
  {
    title: "Draft Review",
    content: `Review {} as an outcome or checkpoint.

Return only markdown with these sections:
- What changed
- What worked
- What slipped
- Risks now
- Next review action

Focus on closure, missed follow-ups, and what must happen next.`,
    showInContextMenu: true,
    showInSlashMenu: true,
    order: 1030,
    modelKey: "",
    lastUsedMs: 0,
  },
  {
    title: "Create Resource Note",
    content: `Turn {} into a clean KOS resource note.

Return only markdown with this structure:
- Title
- Summary
- Key points
- Reusable insights
- Links or follow-ups

Keep the note concise, scannable, and worth saving as a resource.`,
    showInContextMenu: true,
    showInSlashMenu: true,
    order: 1040,
    modelKey: "",
    lastUsedMs: 0,
  },
  {
    title: "Prepare Project Update",
    content: `Turn {} into a short project update.

Return only markdown with these sections:
- Status
- Progress since last update
- Current risks
- Decisions needed
- Immediate next steps

Optimize for fast leadership review, not for storytelling.`,
    showInContextMenu: false,
    showInSlashMenu: true,
    order: 1050,
    modelKey: "",
    lastUsedMs: 0,
  },
];
