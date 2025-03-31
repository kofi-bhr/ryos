import { useState, useEffect, useCallback, useRef } from 'react';
import { useChat, type Message } from 'ai/react';
import Pusher, { Channel } from 'pusher-js';
import { type ChatRoom, type ChatMessage as RoomChatMessage } from '@/types/chat';
import {
  loadChatMessages,
  saveChatMessages,
  getSystemState,
  loadCachedRoomMessages,
  saveRoomMessagesToCache,
  APP_STORAGE_KEYS,
} from "@/utils/storage";
import { useAppContext } from "@/contexts/AppContext";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { AppId } from "@/config/appRegistry";
import {
    parseTextEditMarkup,
    cleanTextEditMarkup,
    parseAppControlMarkup,
    cleanAppControlMarkup,
} from '../utils/markupUtils';
import {
    applyTextEditChanges,
    updateTextEditContent,
    getCurrentTextEditContent,
    ensureDocumentSaved,
    extractTextFromTextEditContent,
} from '../utils/textEditUtils';
import { generateId } from '../utils/helpers';

// Define message shape from API
interface ApiMessage {
  id: string;
  roomId: string;
  username: string;
  content: string;
  timestamp: string | number;
}

// Update RoomChatMessage interface to include isPending
interface ExtendedRoomChatMessage extends RoomChatMessage {
  isPending?: boolean;
}

// Combine AI Message and Room Message into a unified type for the UI
export interface DisplayMessage extends Message {
  username?: string; // Username for room messages or 'You'/'Ryo'
  timestamp?: number; // Timestamp for room messages
  isPending?: boolean; // For optimistic UI updates in rooms
}

// Define the TextEdit context state
interface TextEditContext {
  fileName: string;
  content: string; // Store plain text content
}

// Define the return type for the hook
export interface ChatCoreManager {
  messages: DisplayMessage[];
  input: string;
  isLoading: boolean; // Combined loading state (AI or room send)
  error: Error | undefined; // AI chat error
  textEditContext: TextEditContext | null;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleDirectMessageSubmit: (message: string) => void;
  handleNudge: () => void;
  reload: () => void; // Reload AI chat
  stop: () => void; // Stop AI generation
  clearChats: () => void; // Clear AI chat history
  setMessages: (messages: DisplayMessage[]) => void; // Allow external message setting if needed
}

interface UseChatCoreProps {
  currentRoom: ChatRoom | null;
  username: string | null;
  isWindowOpen: boolean;
  isForeground: boolean;
  initialAiMessages?: Message[];
}

const RYO_INITIAL_MESSAGE: DisplayMessage = {
  id: "1",
  role: "assistant" as const,
  content: "👋 hey! i'm ryo. ask me anything!",
  createdAt: new Date(),
  username: "Ryo",
};

export const useChatCore = ({
  currentRoom,
  username,
  isWindowOpen,
  isForeground,
  initialAiMessages = loadChatMessages() || [RYO_INITIAL_MESSAGE],
}: UseChatCoreProps): ChatCoreManager => {
  const { toggleApp } = useAppContext();
  const launchApp = useLaunchApp();

  const [roomMessages, setRoomMessages] = useState<ExtendedRoomChatMessage[]>([]);
  const [textEditContext, setTextEditContext] = useState<TextEditContext | null>(null);
  const [combinedMessages, setCombinedMessages] = useState<DisplayMessage[]>([]);
  const [isSendingRoomMessage, setIsSendingRoomMessage] = useState(false);

  // Refs for managing state and avoiding race conditions
  const isProcessingEdits = useRef(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const componentMountedAt = useRef(new Date());
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);

  // Track the current room ID in a ref to avoid dependency changes
  const currentRoomIdRef = useRef<string | null>(null);
  
  // --- AI Chat Hook ---
  const {
    messages: aiMessages,
    input,
    handleInputChange,
    isLoading: isAiLoading,
    error: aiError,
    reload,
    stop,
    setMessages: setAiMessages,
    append,
  } = useChat({
    initialMessages: initialAiMessages,
    experimental_throttle: 50,
    body: {
      // Pass context dynamically in handleSubmit/append
    },
    onFinish: (message) => {
      console.log("AI finished generating message:", message.id);
      processAiMessage(message, false);
    },
  });

  // --- TextEdit Context Loading ---
  useEffect(() => {
    const loadContext = () => {
      const filePath = localStorage.getItem(APP_STORAGE_KEYS.textedit.LAST_FILE_PATH);
      const contentJson = localStorage.getItem(APP_STORAGE_KEYS.textedit.CONTENT);

      if (filePath && contentJson) {
        const content = extractTextFromTextEditContent(contentJson);
        const fileName = filePath.split('/').pop() || 'Untitled';
        setTextEditContext({ fileName, content });
        console.log("[useChatCore] Loaded TextEdit context:", fileName);
      } else {
        setTextEditContext(null);
      }
    };

    // Load initially and listen for changes triggered by TextEdit itself
    loadContext();
    const handleContentChange = (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log("[useChatCore] TextEdit content changed externally, reloading context.");
        // Check if the change is for the current file we are tracking
        const currentFilePath = localStorage.getItem(APP_STORAGE_KEYS.textedit.LAST_FILE_PATH);
        if (customEvent.detail?.path === currentFilePath) {
            loadContext();
        }
    };
    window.addEventListener('contentChanged', handleContentChange);
    window.addEventListener('documentUpdated', handleContentChange); // Listen to both events

    return () => {
      window.removeEventListener('contentChanged', handleContentChange);
      window.removeEventListener('documentUpdated', handleContentChange);
    };
  }, []); // Run once on mount

  // --- Pusher for Room Messages ---
  useEffect(() => {
    // Update the ref whenever currentRoom changes
    currentRoomIdRef.current = currentRoom?.id || null;

    // Only set up Pusher if window is open and in foreground
    if (!isWindowOpen || !isForeground) {
      return;
    }
    
    console.log(`[useChatCore] Setting up Pusher for ${currentRoom?.name || 'no room'}`);
    
    // Initialize Pusher if needed
    if (!pusherRef.current) {
      try {
        console.log('[Pusher - ChatCore] Initializing Pusher');
        pusherRef.current = new Pusher('b47fd563805c8c42da1a', { cluster: 'us3' });
      } catch (error) {
        console.error('[Pusher - ChatCore] Failed to initialize:', error);
        return;
      }
    }
    
    // Define the message handler
    const handleRoomMessage = (data: { roomId: string; message: ExtendedRoomChatMessage }) => {
      // Use the ref for current room check to avoid stale closures
      if (currentRoomIdRef.current && data.roomId === currentRoomIdRef.current) {
        console.log('[Pusher] Received room message:', data);
        setRoomMessages(prevMessages => {
          const isDuplicate = prevMessages.some(msg => msg.id === data.message.id);
          if (!isDuplicate) {
            const newMessage = {
              ...data.message,
              timestamp: typeof data.message.timestamp === 'string' 
                ? new Date(data.message.timestamp).getTime() 
                : data.message.timestamp,
            };
            const updatedMessages = [...prevMessages, newMessage];
            updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
            // Only cache non-pending messages
            if (currentRoomIdRef.current) {
              saveRoomMessagesToCache(
                currentRoomIdRef.current, 
                updatedMessages.filter(msg => !msg.isPending)
              );
            }
            return updatedMessages;
          }
          return prevMessages;
        });
      }
    };
    
    // Subscribe to the channel only once
    if (!channelRef.current && pusherRef.current) {
      console.log('[Pusher - ChatCore] Subscribing to chats channel');
      channelRef.current = pusherRef.current.subscribe('chats');
    }
    
    // Only bind once to avoid duplicate handlers
    if (channelRef.current) {
      const boundEventName = 'room-message';
      
      // Make sure we unbind first to prevent duplicates
      console.log(`[Pusher - ChatCore] Binding to ${boundEventName} event`);
      channelRef.current.unbind(boundEventName);
      channelRef.current.bind(boundEventName, handleRoomMessage);
    }
    
    // Clean up only when unmounting component or window closing
    return () => {
      if (channelRef.current) {
        console.log('[Pusher - ChatCore] Unbinding room-message event');
        channelRef.current.unbind('room-message');
      }
    };
  }, [isWindowOpen, isForeground]); // Remove currentRoom dependency to prevent constant re-subscription
  
  // Separate effect to handle room changes without rebinding Pusher events
  useEffect(() => {
    if (currentRoom) {
      console.log(`[useChatCore] Room changed to: ${currentRoom.name}`);
      // Fetch messages without affecting Pusher subscriptions
      const fetchAndSetRoomMessages = async (roomId: string) => {
        let finalMessages: ExtendedRoomChatMessage[] | null = null;

        // Load from cache first
        const cachedMessages = loadCachedRoomMessages(roomId);
        if (cachedMessages && cachedMessages.length > 0) {
          console.log(`[useChatCore] Loaded ${cachedMessages.length} cached messages for room ${roomId}`);
          finalMessages = cachedMessages; // Tentatively use cache
          setRoomMessages(cachedMessages); // Update UI immediately with cache
        } else {
          console.log(`[useChatCore] No cached messages for room ${roomId}, clearing messages`);
          setRoomMessages([]); // Clear messages while loading if no cache
          finalMessages = []; // Start with empty
        }

        // Fetch latest from server
        try {
          const response = await fetch(`/api/chat-rooms?action=getMessages&roomId=${roomId}`);
          if (!response.ok) throw new Error(`Failed to fetch messages: ${response.statusText}`);
          const data = await response.json();
          const fetchedMessages: ExtendedRoomChatMessage[] = (data.messages || []).map((msg: ApiMessage) => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp).getTime() : msg.timestamp,
          }));
          fetchedMessages.sort((a, b) => a.timestamp - b.timestamp); // Ensure fetched are sorted

          if (fetchedMessages.length > 0) {
            console.log(`[useChatCore] Fetched ${fetchedMessages.length} messages from API for room ${roomId}`);
            // Compare with cached/current state to see if we need to update
            const currentMessagesJson = JSON.stringify((finalMessages || []).map(m => m.id).sort());
            const fetchedMessagesJson = JSON.stringify(fetchedMessages.map(m => m.id).sort());

            if (currentMessagesJson !== fetchedMessagesJson) {
                console.log(`[useChatCore] Updating messages with fetched data for room ${roomId}`);
                finalMessages = fetchedMessages;
                saveRoomMessagesToCache(roomId, fetchedMessages);
                setRoomMessages(fetchedMessages); // Update state only if different
            } else {
              console.log(`[useChatCore] Fetched data same as cache/current for room ${roomId}, no update needed.`);
              // If cache was used initially, ensure it's saved (might have been empty before)
              if (finalMessages && finalMessages.length > 0) {
                  saveRoomMessagesToCache(roomId, finalMessages);
              }
            }
          } else if (finalMessages && finalMessages.length > 0) {
              // Fetched is empty, but cache wasn't. Clear the cache.
              console.log(`[useChatCore] API returned no messages for room ${roomId}, clearing cache and messages.`);
              saveRoomMessagesToCache(roomId, []);
              setRoomMessages([]);
          }
        } catch (error) {
          console.error(`[useChatCore] Error fetching room messages for ${roomId}:`, error);
          // Optionally revert to cache or show error message
          // If cache was loaded, we might stick with it on error
          if (cachedMessages && cachedMessages.length > 0) {
            console.warn(`[useChatCore] Fetch failed, sticking with cached messages for room ${roomId}`);
            setRoomMessages(cachedMessages); // Ensure cache is displayed
          } else {
            setRoomMessages([]); // Clear if fetch failed and no cache
          }
        }
      };

      fetchAndSetRoomMessages(currentRoom.id);
    } else {
      // Clear room messages when no room selected
      setRoomMessages([]);
    }
  }, [currentRoom?.id]); // Only depend on the room ID, not the entire room object

  // --- Message Combination Logic ---
  useEffect(() => {
    if (currentRoom) {
      // Display room messages
      const displayMessages = roomMessages.map(msg => ({
        id: msg.id,
        role: msg.username === username ? 'user' : 'human', // 'human' for others
        content: msg.content,
        createdAt: new Date(msg.timestamp),
        username: msg.username,
        timestamp: msg.timestamp,
        isPending: msg.isPending,
      } as DisplayMessage));
      setCombinedMessages(displayMessages);
    } else {
      // Display AI messages
      const displayMessages = aiMessages.map(msg => ({
        ...msg,
        username: msg.role === 'user' ? (username || 'You') : 'Ryo',
      } as DisplayMessage));
      setCombinedMessages(displayMessages);
      // Save AI messages to localStorage whenever they change
      saveChatMessages(aiMessages);
    }
  }, [currentRoom, roomMessages, aiMessages, username]);

  // --- AI Message Processing (Markup Handling) ---
  const processAiMessage = useCallback(async (message: Message, isStreaming: boolean) => {
    if (message.role !== 'assistant') return; // Only process assistant messages

    // Skip if already processed and not streaming
    if (processedMessageIds.current.has(message.id) && !isStreaming) {
        // console.log("Skipping already processed message:", message.id);
        return;
    }

    // Skip historical messages (created before component mount)
    if (message.createdAt && message.createdAt < componentMountedAt.current && !isStreaming) {
      // console.log("Skipping historical message:", message.id);
      processedMessageIds.current.add(message.id);
      return;
    }

    let currentContent = message.content;
    let messageNeedsUpdate = false;

    // 1. Handle App Control Markup
    const appControlOps = parseAppControlMarkup(currentContent);
    if (appControlOps.length > 0) {
      console.log("[useChatCore] Processing App Control Markup:", appControlOps);
      appControlOps.forEach(op => {
        if (op.type === "launch") launchApp(op.id as AppId);
        else if (op.type === "close") toggleApp(op.id);
      });
      currentContent = cleanAppControlMarkup(currentContent);
      messageNeedsUpdate = true;
    }

    // 2. Handle TextEdit Markup
    const containsTextEditMarkup = /<textedit:(insert|replace|delete)/i.test(currentContent);
    if (containsTextEditMarkup) {
        console.log("[useChatCore] Processing TextEdit Markup for message:", message.id);
        const openTags = (currentContent.match(/<textedit:(insert|replace|delete)/g) || []).length;
        const closeTags = (currentContent.match(/<\/textedit:(insert|replace)>|<textedit:delete[^>]*\/>/g) || []).length;
        const isComplete = openTags > 0 && openTags === closeTags;

        // Clean the message content for display *before* applying edits
        const cleanedDisplayContent = cleanTextEditMarkup(currentContent);
        if (cleanedDisplayContent !== currentContent) {
            currentContent = cleanedDisplayContent;
            messageNeedsUpdate = true;
        }

        // Apply edits only if markup is complete and not currently streaming (or apply only replace if streaming)
        if (isComplete && (!isStreaming || isAiLoading)) { // isAiLoading check might be redundant if onFinish is used
            if (isProcessingEdits.current) {
                console.warn("[useChatCore] Skipping TextEdit processing, already in progress.");
                return;
            }
            isProcessingEdits.current = true;

            try {
                const edits = parseTextEditMarkup(message.content); // Parse original content
                if (edits.length > 0) {
                    const editsToApply = isStreaming ? edits.filter(e => e.type === 'replace') : edits;
                    const otherEditsPending = !isStreaming && edits.some(e => e.type !== 'replace');

                    if (editsToApply.length > 0) {
                        let docContent = getCurrentTextEditContent();
                        let filePath = localStorage.getItem(APP_STORAGE_KEYS.textedit.LAST_FILE_PATH);

                        if (!filePath && docContent !== null) {
                            console.log("No file path, ensuring document is saved...");
                            // Update message to show saving state
                            currentContent = `${cleanedDisplayContent}\n\n_[Saving TextEdit document...]_`;
                            messageNeedsUpdate = true;
                            filePath = await ensureDocumentSaved(docContent);
                            if (filePath) {
                                // Refetch content after save just in case
                                docContent = getCurrentTextEditContent();
                            } else {
                                throw new Error("Failed to save TextEdit document before applying edits.");
                            }
                        }

                        if (filePath && docContent !== null) {
                            console.log(`Applying ${editsToApply.length} TextEdit edits...`);
                            const newContent = applyTextEditChanges(docContent, editsToApply);
                            const updated = updateTextEditContent(newContent); // This handles saving and dispatching events

                            if (updated) {
                                console.log("TextEdit document updated successfully.");
                                // Update local context immediately
                                setTextEditContext({ fileName: filePath.split('/').pop() || 'Untitled', content: newContent });

                                // If streaming stopped and no other edits are pending, mark as processed
                                if (!isStreaming && !otherEditsPending) {
                                    processedMessageIds.current.add(message.id);
                                }
                                // If only replace edits were applied during streaming, don't mark processed yet
                            } else {
                                throw new Error("Failed to update TextEdit content via utility.");
                            }
                        } else if (!filePath) {
                             throw new Error("TextEdit document path not available.");
                        } else {
                             console.warn("Cannot apply TextEdit edits, content is null.");
                        }
                    } else if (!isStreaming) {
                        // No edits to apply, but markup was complete
                         processedMessageIds.current.add(message.id);
                    }
                } else if (!isStreaming) {
                    // No valid edits found, mark as processed
                    processedMessageIds.current.add(message.id);
                }
            } catch (error) {
                console.error("Error applying TextEdit edits:", error);
                currentContent = `${cleanedDisplayContent}\n\n_[Error applying edits: ${error instanceof Error ? error.message : String(error)}]_`;
                messageNeedsUpdate = true;
                // Don't mark as processed on error
            } finally {
                isProcessingEdits.current = false;
            }
        } else if (!isComplete && !isStreaming) {
             console.warn("Incomplete TextEdit markup detected in final message:", message.id);
             // Optionally show an error or leave the cleaned message
             currentContent = `${cleanedDisplayContent}\n\n_[Warning: Incomplete edit instructions received]_`;
             messageNeedsUpdate = true;
             processedMessageIds.current.add(message.id); // Mark processed as it's finished but broken
        }
    }

    // Update AI message list if content was cleaned/modified
    if (messageNeedsUpdate) {
      setAiMessages(prev => {
        const index = prev.findIndex(m => m.id === message.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], content: currentContent };
          return updated;
        }
        return prev;
      });
    }

    // Mark as processed if finished generating and no TextEdit errors occurred
    if (!isStreaming && !isProcessingEdits.current && !currentContent.includes("_[Error") && !currentContent.includes("_[Warning")) {
        // Ensure it wasn't marked processed already
        if (!processedMessageIds.current.has(message.id)) {
             processedMessageIds.current.add(message.id);
             console.log("Marked message as processed:", message.id);
        }
    }
  }, [launchApp, toggleApp, setAiMessages, isAiLoading]); // Add isAiLoading

  // Effect to process the *latest* AI message during streaming or on completion
  useEffect(() => {
    const lastMessage = aiMessages[aiMessages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      processAiMessage(lastMessage, isAiLoading);
    }
  }, [aiMessages, isAiLoading, processAiMessage]);


  // --- Submission Handling ---
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const messageContent = input.trim();
    if (!messageContent) return;

    if (currentRoom && username) {
      // Send Room Message
      const tempId = generateId();
      const newMessage: ExtendedRoomChatMessage = {
        id: tempId,
        roomId: currentRoom.id,
        username,
        content: messageContent,
        timestamp: Date.now(),
        isPending: true,
      };

      // Optimistic UI update
      setRoomMessages(prev => {
          const updated = [...prev, newMessage];
          updated.sort((a, b) => a.timestamp - b.timestamp);
          return updated;
      });
      setIsSendingRoomMessage(true);

      // Send to backend
      fetch('/api/chat-rooms?action=sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: currentRoom.id, username, content: messageContent }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          // Replace pending message with confirmed one
          setRoomMessages(prev => {
            const confirmedMessage = { ...data.message, timestamp: new Date(data.message.timestamp).getTime() };
            const updated = prev.map(msg => msg.id === tempId ? confirmedMessage : msg);
            // Ensure the confirmed message isn't already present (from Pusher)
            if (!prev.some(msg => msg.id === confirmedMessage.id && msg.id !== tempId)) {
                 updated.sort((a, b) => a.timestamp - b.timestamp);
                 saveRoomMessagesToCache(currentRoom.id, updated.filter(msg => !msg.isPending)); // Save confirmed
                 return updated;
            } else {
                 // Already received via Pusher, just remove the pending one
                 const final = prev.filter(msg => msg.id !== tempId);
                 final.sort((a, b) => a.timestamp - b.timestamp);
                 saveRoomMessagesToCache(currentRoom.id, final);
                 return final;
            }
          });
        } else {
          throw new Error(data.error || "Failed to send message");
        }
      })
      .catch(error => {
        console.error("Error sending room message:", error);
        // Remove pending message on error
        setRoomMessages(prev => prev.filter(msg => msg.id !== tempId));
        // TODO: Show error to user
      })
      .finally(() => {
        setIsSendingRoomMessage(false);
      });

    } else {
      // Send AI Message
      append(
        { content: messageContent, role: 'user' },
        { body: { textEditContext: textEditContext || undefined, systemState: getSystemState() } }
      );
    }

    // Clear input field
    handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);

  }, [currentRoom, username, input, append, handleInputChange, textEditContext]);

  const handleDirectMessageSubmit = useCallback((message: string) => {
    const messageContent = message.trim();
    if (!messageContent) return;

    if (currentRoom && username) {
       // Simulate form submission for rooms
       const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
       // Temporarily set input, submit, then clear
       handleInputChange({ target: { value: messageContent } } as React.ChangeEvent<HTMLInputElement>);
       // Use requestAnimationFrame to ensure state update before submit
       requestAnimationFrame(() => {
           handleSubmit(fakeEvent);
           // Clear input again just in case
           handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
       });
    } else {
      // Send AI Message directly
      append(
        { content: messageContent, role: 'user' },
        { body: { textEditContext: textEditContext || undefined, systemState: getSystemState() } }
      );
    }
  }, [currentRoom, username, append, textEditContext, handleSubmit, handleInputChange]);


  const handleNudge = useCallback(() => {
    // Nudge is sent as a direct message
    handleDirectMessageSubmit("👋 *nudge sent*");
    // Shaking is handled in the component UI
  }, [handleDirectMessageSubmit]);

  const clearChats = useCallback(() => {
    // Only clears AI chat history
    setAiMessages([RYO_INITIAL_MESSAGE]);
    saveChatMessages([RYO_INITIAL_MESSAGE]);
    processedMessageIds.current.clear(); // Clear processed IDs
    processedMessageIds.current.add(RYO_INITIAL_MESSAGE.id); // Add initial message back
    console.log("AI chat cleared.");
  }, [setAiMessages]);

  // Combined loading state
  const isLoading = isAiLoading || isSendingRoomMessage;

  return {
    messages: combinedMessages,
    input,
    isLoading,
    error: aiError,
    textEditContext,
    handleInputChange,
    handleSubmit,
    handleDirectMessageSubmit,
    handleNudge,
    reload,
    stop,
    clearChats,
    setMessages: setCombinedMessages, // Allow external setting if needed, though maybe risky
  };
};