import { ResetSettingsConfirmModal } from "@/components/modals/ResetSettingsConfirmModal";
import { Button } from "@/components/ui/button";
import { TabContent, TabItem, type TabItem as TabItemType } from "@/components/ui/setting-tabs";
import { TabProvider, useTab } from "@/contexts/TabContext";
import { useLatestVersion } from "@/hooks/useLatestVersion";
import CopilotPlugin from "@/main";
import { resetSettings } from "@/settings/model";
import { CommandSettings } from "@/settings/v2/components/CommandSettings";
import { Cog, Database, Sparkles, Wrench } from "lucide-react";
import React from "react";
import { AdvancedSettings } from "./components/AdvancedSettings";
import { BasicSettings } from "./components/BasicSettings";
import { CopilotPlusSettings } from "./components/CopilotPlusSettings";
import { ModelSettings } from "./components/ModelSettings";
import { QASettings } from "./components/QASettings";

const TAB_IDS = ["setup", "knowledge", "workflows", "labs"] as const;
type TabId = (typeof TAB_IDS)[number];

// tab icons
const icons: Record<TabId, JSX.Element> = {
  setup: <Cog className="tw-size-5" />,
  knowledge: <Database className="tw-size-5" />,
  workflows: <Sparkles className="tw-size-5" />,
  labs: <Wrench className="tw-size-5" />,
};

const KnowledgeSettings: React.FC = () => (
  <div className="tw-space-y-6">
    <ModelSettings />
    <QASettings />
  </div>
);

const LabsSettings: React.FC = () => (
  <div className="tw-space-y-6">
    <AdvancedSettings />
    <CommandSettings />
  </div>
);

// tab components
const components: Record<TabId, React.FC> = {
  setup: () => <BasicSettings />,
  knowledge: () => <KnowledgeSettings />,
  workflows: () => <CopilotPlusSettings />,
  labs: () => <LabsSettings />,
};

// tabs
const tabLabels: Record<TabId, string> = {
  setup: "Setup",
  knowledge: "Knowledge",
  workflows: "Workflows",
  labs: "Labs",
};

const tabs: TabItemType[] = TAB_IDS.map((id) => ({
  id,
  icon: icons[id],
  label: tabLabels[id],
}));

const SettingsContent: React.FC = () => {
  const { selectedTab, setSelectedTab } = useTab();

  return (
    <div className="tw-flex tw-flex-col">
      <div className="tw-flex tw-flex-wrap tw-rounded-lg">
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isSelected={selectedTab === tab.id}
            onClick={() => setSelectedTab(tab.id)}
            isFirst={index === 0}
            isLast={index === tabs.length - 1}
          />
        ))}
      </div>
      <div className="tw-w-full tw-border tw-border-solid" />

      <div>
        {TAB_IDS.map((id) => {
          const Component = components[id];
          return (
            <TabContent key={id} id={id} isSelected={selectedTab === id}>
              <Component />
            </TabContent>
          );
        })}
      </div>
    </div>
  );
};

interface SettingsMainV2Props {
  plugin: CopilotPlugin;
}

const SettingsMainV2: React.FC<SettingsMainV2Props> = ({ plugin }) => {
  // Add a key state that we'll change when resetting
  const [resetKey, setResetKey] = React.useState(0);
  const { latestVersion, hasUpdate } = useLatestVersion(plugin.manifest.version);

  const handleReset = async () => {
    const modal = new ResetSettingsConfirmModal(app, async () => {
      resetSettings();
      // Increment the key to force re-render of all components
      setResetKey((prev) => prev + 1);
    });
    modal.open();
  };

  return (
    <TabProvider>
      <div>
        <div className="tw-flex tw-flex-col tw-gap-2">
          <h1 className="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
            <div className="tw-flex tw-items-center tw-gap-2">
              <span>KOS2 Settings</span>
              <div className="tw-flex tw-items-center tw-gap-1">
                <span className="tw-text-xs tw-text-muted">v{plugin.manifest.version}</span>
                {latestVersion && (
                  <>
                    {hasUpdate ? (
                      <a
                        href="obsidian://show-plugin?id=kos2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tw-text-xs tw-text-accent hover:tw-underline"
                      >
                        (Update to v{latestVersion})
                      </a>
                    ) : (
                      <span className="tw-text-xs tw-text-normal"> (up to date)</span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="tw-self-end sm:tw-self-auto">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Reset Settings
              </Button>
            </div>
          </h1>
        </div>
        {/* Add the key prop to force re-render */}
        <SettingsContent key={resetKey} />
      </div>
    </TabProvider>
  );
};

export default SettingsMainV2;
