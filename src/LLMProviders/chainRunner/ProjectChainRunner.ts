import { KOS2AgentChainRunner } from "./KOS2AgentChainRunner";

/**
 * ProjectChainRunner - Chain runner for project-based chats
 *
 * Project context is automatically added to L1 via ChatManager.getSystemPromptForMessage()
 * No override needed - inherits all behavior from KOS2AgentChainRunner
 */
export class ProjectChainRunner extends KOS2AgentChainRunner {
  // No overrides needed - project context automatically in L1 via ChatManager
}
