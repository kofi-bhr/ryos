import { AppMenuBar } from "@/components/layout/AppMenuBar";
import { ViewMode } from "./EmailAppComponent";

interface EmailMenuBarProps {
  isWindowOpen: boolean;
  onClose: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
  onCompose: () => void;
  onEditData: () => void;
  viewMode: ViewMode;
  onBackToInbox: () => void;
}

export function EmailMenuBar({
  isWindowOpen,
  onClose,
  onShowHelp,
  onShowAbout,
  onCompose,
  onEditData,
  viewMode,
  onBackToInbox,
}: EmailMenuBarProps) {
  return (
    <AppMenuBar
      isWindowOpen={isWindowOpen}
      onClose={onClose}
      menus={[
        {
          name: "File",
          items: [
            {
              name: "New Email",
              action: onCompose,
              shortcut: "⌘N",
              disabled: viewMode === "compose",
            },
            { type: "separator" },
            {
              name: "Back to Inbox",
              action: onBackToInbox,
              shortcut: "⌘B",
              disabled: viewMode === "inbox",
            },
            { type: "separator" },
            { name: "Close", action: onClose, shortcut: "⌘W" },
          ],
        },
        {
          name: "Edit",
          items: [
            {
              name: "Edit Email Data",
              action: onEditData,
              shortcut: "⌘E",
              disabled: viewMode === "data",
            },
          ],
        },
        {
          name: "Help",
          items: [
            { name: "Email Help", action: onShowHelp },
            { type: "separator" },
            { name: "About Email", action: onShowAbout },
          ],
        },
      ]}
    />
  );
}
