import React from "react";
import { render, screen } from "@testing-library/react";
import { SuggestedPrompts } from "@/components/chat-components/SuggestedPrompts";

jest.mock("@/settings/model", () => ({
  useSettingsValue: jest.fn(),
  getVisibleChatModels: jest.fn(),
  getVisibleEmbeddingModels: jest.fn(),
}));

import {
  getVisibleChatModels,
  getVisibleEmbeddingModels,
  useSettingsValue,
} from "@/settings/model";

const mockUseSettingsValue = useSettingsValue as jest.MockedFunction<typeof useSettingsValue>;
const mockGetVisibleChatModels = getVisibleChatModels as jest.MockedFunction<
  typeof getVisibleChatModels
>;
const mockGetVisibleEmbeddingModels = getVisibleEmbeddingModels as jest.MockedFunction<
  typeof getVisibleEmbeddingModels
>;

/**
 * Create the minimal Obsidian app shape required by SuggestedPrompts.
 *
 * @param hasMarkdownNote - Whether the workspace should report an active markdown note
 * @returns Mock app object for the component
 */
function createMockApp(hasMarkdownNote: boolean): any {
  const file = hasMarkdownNote ? { extension: "md" } : null;
  return {
    workspace: {
      getActiveViewOfType: jest.fn(() => ({ file })),
      getActiveFile: jest.fn(() => file),
    },
  };
}

describe("SuggestedPrompts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettingsValue.mockReturnValue({
      enableSemanticSearchV3: false,
    } as any);
    mockGetVisibleChatModels.mockReturnValue([{ key: "chat-model" }] as any);
    mockGetVisibleEmbeddingModels.mockReturnValue([{ key: "embedding-model" }] as any);
  });

  it("runs the selected KOS workflow instead of injecting a prompt", () => {
    const onRunWorkflow = jest.fn();

    render(<SuggestedPrompts app={createMockApp(true)} onRunWorkflow={onRunWorkflow} />);

    const organiseButton = screen.getByRole("button", { name: /Organise/i });
    organiseButton.click();

    expect(onRunWorkflow).toHaveBeenCalledWith("organise");
  });

  it("disables workflow cards when no active markdown note is available", () => {
    render(<SuggestedPrompts app={createMockApp(false)} onRunWorkflow={jest.fn()} />);

    const organiseButton = screen.getByRole("button", { name: /Organise/i });
    expect(organiseButton.getAttribute("disabled")).not.toBeNull();
    expect(screen.getByText(/Open a markdown note first/i)).toBeTruthy();
  });
});
