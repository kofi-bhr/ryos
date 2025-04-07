import { useState, useEffect } from "react";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { appMetadata, helpItems } from "..";
import { EmailMenuBar } from "./EmailMenuBar";
import { EmailSidebar } from "./EmailSidebar";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { EmailCompose } from "./EmailCompose";
import { EmailDataEditor } from "./EmailDataEditor";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { getEmailContent } from "@/utils/contentLoader";

// Define types for our email data
export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  labels: string[];
}

export interface Thread {
  id: string;
  subject: string;
  participants: string[];
  lastMessageDate: string;
  messageIds: string[];
  unread: boolean;
  starred: boolean;
  labels: string[];
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface User {
  email: string;
  name: string;
  signature: string;
}

export interface EmailData {
  emails: Email[];
  threads: Thread[];
  labels: Label[];
  user: User;
}

// Define view modes for the app
export type ViewMode = "inbox" | "thread" | "compose" | "data";

export function EmailAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null);
  const [dataChanged, setDataChanged] = useState(false);

  // Load email data from localStorage or fetch from file
  useEffect(() => {
    const loadEmailData = async () => {
      try {
        // First try to load from localStorage
        const savedData = localStorage.getItem(APP_STORAGE_KEYS.email?.DATA);
        
        if (savedData) {
          setEmailData(JSON.parse(savedData));
        } else {
          // If not in localStorage, try to get from content file
          const contentData = getEmailContent();
          
          if (contentData && 'emails' in contentData && 'threads' in contentData && 'labels' in contentData) {
            setEmailData(contentData as EmailData);
            // Save to localStorage
            localStorage.setItem(APP_STORAGE_KEYS.email?.DATA, JSON.stringify(contentData));
          } else {
            // If not in content file, fetch from JSON file
            const response = await fetch("/src/apps/email/data/emails.json");
            const data = await response.json();
            setEmailData(data);
            
            // Save to localStorage
            localStorage.setItem(APP_STORAGE_KEYS.email?.DATA, JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error("Failed to load email data:", error);
        // Load default data if fetch fails
        import("../data/emails.json").then((data) => {
          setEmailData(data as EmailData);
          localStorage.setItem(APP_STORAGE_KEYS.email?.DATA, JSON.stringify(data));
        });
      }
    };

    loadEmailData();
  }, []);

  // Save email data to localStorage when it changes
  useEffect(() => {
    if (emailData && dataChanged) {
      localStorage.setItem(APP_STORAGE_KEYS.email?.DATA, JSON.stringify(emailData));
      setDataChanged(false);
    }
  }, [emailData, dataChanged]);

  // Handle thread selection
  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
    setViewMode("thread");
    
    // Mark thread as read
    if (emailData) {
      const updatedThreads = emailData.threads.map((thread) => {
        if (thread.id === threadId) {
          return { ...thread, unread: false };
        }
        return thread;
      });
      
      // Mark all emails in thread as read
      const thread = emailData.threads.find((t) => t.id === threadId);
      const updatedEmails = emailData.emails.map((email) => {
        if (thread?.messageIds.includes(email.id)) {
          return { ...email, read: true };
        }
        return email;
      });
      
      setEmailData({
        ...emailData,
        threads: updatedThreads,
        emails: updatedEmails,
      });
      setDataChanged(true);
    }
  };

  // Handle label selection
  const handleLabelSelect = (labelId: string | null) => {
    setSelectedLabelId(labelId);
    setViewMode("inbox");
    setSelectedThreadId(null);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setViewMode("inbox");
    setSelectedThreadId(null);
  };

  // Handle compose new email
  const handleCompose = () => {
    setViewMode("compose");
    setReplyToEmail(null);
  };

  // Handle reply to email
  const handleReply = (email: Email) => {
    setReplyToEmail(email);
    setViewMode("compose");
  };

  // Handle send email (new or reply)
  const handleSendEmail = (email: Email) => {
    if (!emailData) return;
    
    const newEmail: Email = {
      ...email,
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      read: true,
    };
    
    let updatedThreads = [...emailData.threads];
    let updatedEmails = [...emailData.emails, newEmail];
    
    // If it's a reply, add to existing thread
    if (replyToEmail) {
      const threadIndex = updatedThreads.findIndex((t) => t.id === replyToEmail.threadId);
      if (threadIndex !== -1) {
        const thread = updatedThreads[threadIndex];
        updatedThreads[threadIndex] = {
          ...thread,
          lastMessageDate: newEmail.date,
          messageIds: [...thread.messageIds, newEmail.id],
        };
      }
    } else {
      // Create new thread for new email
      const newThread: Thread = {
        id: `thread${Date.now()}`,
        subject: email.subject,
        participants: [email.from, email.to],
        lastMessageDate: newEmail.date,
        messageIds: [newEmail.id],
        unread: false,
        starred: false,
        labels: email.labels,
      };
      
      newEmail.threadId = newThread.id;
      updatedThreads = [...updatedThreads, newThread];
    }
    
    setEmailData({
      ...emailData,
      emails: updatedEmails,
      threads: updatedThreads,
    });
    
    setDataChanged(true);
    setViewMode("inbox");
  };

  // Handle star/unstar thread
  const handleToggleStarThread = (threadId: string) => {
    if (!emailData) return;
    
    const updatedThreads = emailData.threads.map((thread) => {
      if (thread.id === threadId) {
        return { ...thread, starred: !thread.starred };
      }
      return thread;
    });
    
    setEmailData({
      ...emailData,
      threads: updatedThreads,
    });
    
    setDataChanged(true);
  };

  // Handle updating email data directly (from JSON editor)
  const handleUpdateEmailData = (newData: EmailData) => {
    setEmailData(newData);
    setDataChanged(true);
    setViewMode("inbox");
  };

  // Handle edit data button click
  const handleEditData = () => {
    setViewMode("data");
  };

  // Get filtered threads based on selected label and search query
  const getFilteredThreads = () => {
    if (!emailData) return [];
    
    let filteredThreads = emailData.threads;
    
    // Filter by label if selected
    if (selectedLabelId) {
      filteredThreads = filteredThreads.filter((thread) => 
        thread.labels.includes(selectedLabelId)
      );
    }
    
    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredThreads = filteredThreads.filter((thread) => {
        // Search in subject
        if (thread.subject.toLowerCase().includes(query)) return true;
        
        // Search in email bodies
        const threadEmails = emailData.emails.filter((email) => 
          thread.messageIds.includes(email.id)
        );
        
        return threadEmails.some((email) => 
          email.body.toLowerCase().includes(query) ||
          email.from.toLowerCase().includes(query) ||
          email.to.toLowerCase().includes(query)
        );
      });
    }
    
    // Sort by date (newest first)
    return filteredThreads.sort((a, b) => 
      new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
    );
  };

  // Get emails for selected thread
  const getThreadEmails = () => {
    if (!emailData || !selectedThreadId) return [];
    
    const thread = emailData.threads.find((t) => t.id === selectedThreadId);
    if (!thread) return [];
    
    const threadEmails = emailData.emails.filter((email) => 
      thread.messageIds.includes(email.id)
    );
    
    // Sort by date (oldest first)
    return threadEmails.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  return (
    <>
      <EmailMenuBar
        onClose={onClose}
        isWindowOpen={isWindowOpen}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onCompose={handleCompose}
        onEditData={handleEditData}
        viewMode={viewMode}
        onBackToInbox={() => {
          setViewMode("inbox");
          setSelectedThreadId(null);
        }}
      />
      <WindowFrame
        title="Email"
        onClose={onClose}
        isForeground={isForeground}
        appId="email"
      >
        <div className="flex h-full w-full bg-white">
          {emailData ? (
            <>
              {/* Sidebar with labels */}
              <EmailSidebar
                labels={emailData.labels}
                selectedLabelId={selectedLabelId}
                onLabelSelect={handleLabelSelect}
                onCompose={handleCompose}
                threads={emailData.threads}
              />

              {/* Main content area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Search bar */}
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Email content based on view mode */}
                {viewMode === "inbox" && (
                  <EmailList
                    threads={getFilteredThreads()}
                    emails={emailData.emails}
                    labels={emailData.labels}
                    onThreadSelect={handleThreadSelect}
                    onToggleStar={handleToggleStarThread}
                  />
                )}

                {viewMode === "thread" && selectedThreadId && (
                  <EmailDetail
                    emails={getThreadEmails()}
                    labels={emailData.labels}
                    onReply={handleReply}
                  />
                )}

                {viewMode === "compose" && (
                  <EmailCompose
                    user={emailData.user}
                    replyToEmail={replyToEmail}
                    labels={emailData.labels}
                    onSend={handleSendEmail}
                    onCancel={() => {
                      setViewMode(replyToEmail ? "thread" : "inbox");
                      setReplyToEmail(null);
                    }}
                  />
                )}

                {viewMode === "data" && (
                  <EmailDataEditor
                    emailData={emailData}
                    onSave={handleUpdateEmailData}
                    onCancel={() => setViewMode("inbox")}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p>Loading email data...</p>
            </div>
          )}
        </div>
      </WindowFrame>

      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
        helpItems={helpItems}
        appName="Email"
      />
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={appMetadata}
      />
    </>
  );
}
