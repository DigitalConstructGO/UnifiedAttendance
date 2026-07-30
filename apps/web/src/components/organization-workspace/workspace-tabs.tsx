import { WORKSPACE_TABS, type WorkspaceTab } from "./workspace-model";

type Props = {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
};

export function WorkspaceTabs({ activeTab, onChange }: Props) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-border"
      role="tablist"
      aria-label="Organization settings"
    >
      <span className="sr-only">Settings sections</span>
      {WORKSPACE_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`min-h-11 shrink-0 border-b-2 px-4 text-xs font-bold transition-colors ${
            activeTab === tab.id
              ? "text-strong border-primary"
              : "hover:text-strong border-transparent text-muted-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
