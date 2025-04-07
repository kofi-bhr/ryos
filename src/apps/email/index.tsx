import { BaseApp } from "../base/types";
import { EmailAppComponent } from "./components/EmailAppComponent";

export const helpItems = [
  {
    icon: "📧",
    title: "Email Management",
    description: "View, compose, reply to, and organize your emails",
  },
  {
    icon: "🔍",
    title: "Search & Filter",
    description: "Search for emails and filter by labels, read status, or starred",
  },
  {
    icon: "📝",
    title: "Compose Emails",
    description: "Create new emails with rich text formatting",
  },
  {
    icon: "🏷️",
    title: "Labels & Organization",
    description: "Organize emails with custom labels and categories",
  },
  {
    icon: "💾",
    title: "Data Management",
    description: "Edit the underlying email data in JSON format",
  },
  {
    icon: "📁",
    title: "Thread View",
    description: "View email conversations in threaded format",
  },
];

export const appMetadata = {
  name: "Email",
  version: "1.0",
  creator: {
    name: "Ryo Lu",
    url: "https://ryo.lu",
  },
  github: "https://github.com/ryokun6/ryos",
  icon: "/icons/email.png",
};

export const EmailApp: BaseApp = {
  id: "email",
  name: "Email",
  icon: { type: "image", src: appMetadata.icon },
  description: "A simple email client with editable JSON data",
  component: EmailAppComponent,
  helpItems,
  metadata: appMetadata,
};
