import React from "react";
import { Database, Globe, Pen, Sparkles, Brain, Wrench, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChainType } from "@/chainFactory";
import { cn } from "@/lib/utils";
import { updateSetting } from "@/settings/model";
import { isPlusChain } from "@/utils";

interface ChatToolControlsProps {
  // Tool toggle states
  vaultToggle: boolean;
  setVaultToggle: (value: boolean) => void;
  webToggle: boolean;
  setWebToggle: (value: boolean) => void;
  composerToggle: boolean;
  setComposerToggle: (value: boolean) => void;
  autonomousAgentToggle: boolean;
  setAutonomousAgentToggle: (value: boolean) => void;

  // Toggle-off callbacks for pill removal
  onVaultToggleOff?: () => void;
  onWebToggleOff?: () => void;
  onComposerToggleOff?: () => void;

  // Other props
  currentChain: ChainType;
}

const ToolChip = React.forwardRef<
  HTMLButtonElement,
  {
    active: boolean;
    icon: React.ReactNode;
    label: string;
  } & React.ComponentPropsWithoutRef<typeof Button>
>(({ active, icon, label, className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost2"
      size="fit"
      {...props}
      className={cn(
        "tw-h-8 tw-rounded-full tw-border tw-border-border tw-px-3 tw-text-xs tw-font-medium tw-text-normal tw-transition-colors",
        active && "tw-border-interactive-accent tw-text-accent tw-bg-accent/10",
        className
      )}
    >
      <span className="tw-flex tw-items-center tw-gap-1.5">
        {icon}
        <span>{label}</span>
      </span>
    </Button>
  );
});
ToolChip.displayName = "ToolChip";

const ChatToolControls: React.FC<ChatToolControlsProps> = ({
  vaultToggle,
  setVaultToggle,
  webToggle,
  setWebToggle,
  composerToggle,
  setComposerToggle,
  autonomousAgentToggle,
  setAutonomousAgentToggle,
  onVaultToggleOff,
  onWebToggleOff,
  onComposerToggleOff,
  currentChain,
}) => {
  const isCopilotPlus = isPlusChain(currentChain);
  const showAutonomousAgent = isCopilotPlus && currentChain !== ChainType.PROJECT_CHAIN;

  const handleAutonomousAgentToggle = () => {
    const newValue = !autonomousAgentToggle;
    setAutonomousAgentToggle(newValue);
    updateSetting("enableAutonomousAgent", newValue);
  };

  const handleVaultToggle = () => {
    const newValue = !vaultToggle;
    setVaultToggle(newValue);
    // If toggling off, remove pills
    if (!newValue && onVaultToggleOff) {
      onVaultToggleOff();
    }
  };

  const handleWebToggle = () => {
    const newValue = !webToggle;
    setWebToggle(newValue);
    // If toggling off, remove pills
    if (!newValue && onWebToggleOff) {
      onWebToggleOff();
    }
  };

  const handleComposerToggle = () => {
    const newValue = !composerToggle;
    setComposerToggle(newValue);
    // If toggling off, remove pills
    if (!newValue && onComposerToggleOff) {
      onComposerToggleOff();
    }
  };

  // If not Copilot Plus, don't show any tools
  if (!isCopilotPlus) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop view - show labeled chips when container is wide enough */}
      <div className="tw-hidden tw-items-center tw-gap-1.5 @[420px]/chat-input:tw-flex">
        {showAutonomousAgent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <ToolChip
                active={autonomousAgentToggle}
                icon={<Brain className="tw-size-4" />}
                label="Agent"
                onClick={handleAutonomousAgentToggle}
              />
            </TooltipTrigger>
            <TooltipContent className="tw-px-1 tw-py-0.5">Toggle agent mode</TooltipContent>
          </Tooltip>
        )}

        {!autonomousAgentToggle && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolChip
                  active={vaultToggle}
                  icon={<Database className="tw-size-4" />}
                  label="Vault"
                  onClick={handleVaultToggle}
                />
              </TooltipTrigger>
              <TooltipContent className="tw-px-1 tw-py-0.5">Toggle vault search</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolChip
                  active={webToggle}
                  icon={<Globe className="tw-size-4" />}
                  label="Web"
                  onClick={handleWebToggle}
                />
              </TooltipTrigger>
              <TooltipContent className="tw-px-1 tw-py-0.5">Toggle web search</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolChip
                  active={composerToggle}
                  icon={
                    <span className="tw-flex tw-items-center tw-gap-0.5">
                      <Sparkles className="tw-size-2" />
                      <Pen className="tw-size-3" />
                    </span>
                  }
                  label="Write"
                  onClick={handleComposerToggle}
                />
              </TooltipTrigger>
              <TooltipContent className="tw-px-1 tw-py-0.5">Toggle write mode</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* Mobile view - show overflow dropdown when container is narrow */}
      <div className="tw-flex tw-items-center tw-gap-0.5 @[420px]/chat-input:tw-hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost2" size="fit" className="tw-text-muted hover:tw-text-accent">
              <Wrench className="tw-size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw-w-56">
            {showAutonomousAgent && (
              <DropdownMenuItem
                onClick={handleAutonomousAgentToggle}
                className="tw-flex tw-items-center tw-justify-between"
              >
                <div className="tw-flex tw-items-center tw-gap-2">
                  <Brain className="tw-size-4" />
                  <span>Agent</span>
                </div>
                {autonomousAgentToggle && <Check className="tw-size-4" />}
              </DropdownMenuItem>
            )}

            {!autonomousAgentToggle && (
              <>
                <DropdownMenuItem
                  onClick={handleVaultToggle}
                  className="tw-flex tw-items-center tw-justify-between"
                >
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <Database className="tw-size-4" />
                    <span>Vault</span>
                  </div>
                  {vaultToggle && <Check className="tw-size-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleWebToggle}
                  className="tw-flex tw-items-center tw-justify-between"
                >
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <Globe className="tw-size-4" />
                    <span>Web</span>
                  </div>
                  {webToggle && <Check className="tw-size-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleComposerToggle}
                  className="tw-flex tw-items-center tw-justify-between"
                >
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-flex tw-items-center tw-gap-0.5">
                      <Sparkles className="tw-size-2" />
                      <Pen className="tw-size-3" />
                    </span>
                    <span>Write</span>
                  </div>
                  {composerToggle && <Check className="tw-size-4" />}
                </DropdownMenuItem>
              </>
            )}

            {autonomousAgentToggle && (
              <>
                <DropdownMenuItem
                  disabled
                  className="tw-flex tw-items-center tw-justify-between tw-opacity-50"
                >
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <Database className="tw-size-4" />
                    <span>Vault</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled
                  className="tw-flex tw-items-center tw-justify-between tw-opacity-50"
                >
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <Globe className="tw-size-4" />
                    <span>Web</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled
                  className="tw-flex tw-items-center tw-justify-between tw-opacity-50"
                >
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-flex tw-items-center tw-gap-0.5">
                      <Sparkles className="tw-size-2" />
                      <Pen className="tw-size-3" />
                    </span>
                    <span>Write</span>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
};

export { ChatToolControls };
