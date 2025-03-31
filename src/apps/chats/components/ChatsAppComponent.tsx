import { useState, useEffect, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { helpItems, appMetadata } from "..";

import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { FileText, Plus, Trash } from "lucide-react";
import { type ChatRoom} from "@/types/chat"; // Adjusted path
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import the new hooks and utils
import { useDialogManager } from '../hooks/useDialogManager';
import { useChatRooms } from '../hooks/useChatRooms';
import { useChatCore } from '../hooks/useChatCore';
import { truncateFilename } from '../utils/helpers';

// Keep ChatRoomSidebarProps interface if needed for the imported component
interface ChatRoomSidebarProps {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  onRoomSelect: (room: ChatRoom | null) => void;
  onAddRoom: () => void; // Trigger dialog open
  onDeleteRoom?: (room: ChatRoom) => void; // Trigger dialog open
  isVisible: boolean;
  onToggleVisibility?: () => void;
  username: string | null;
  isAdmin: boolean;
}

// Keep the component definition for ChatRoomSidebar (or import it)
const ChatRoomSidebar: React.FC<ChatRoomSidebarProps> = ({
  rooms,
  currentRoom,
  onRoomSelect,
  onAddRoom,
  onDeleteRoom,
  isVisible,
  isAdmin,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full bg-neutral-200 border-b flex flex-col max-h-34 overflow-hidden md:w-56 md:border-r md:border-b-0 md:max-h-full font-geneva-12 text-[12px]">
      <div className="py-3 px-3 flex flex-col flex-1 overflow-hidden">
        <div className="flex justify-between items-center md:mb-2">
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-[14px] pl-1">Chats</h2>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddRoom} // Use the passed handler
              className="flex items-center text-xs hover:bg-black/5 w-[24px] h-[24px]"
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          <div
            className={cn(
                'px-2 py-1 cursor-pointer',
                currentRoom === null ? 'bg-black text-white' : 'hover:bg-black/5'
            )}
            onClick={() => onRoomSelect(null)}
          >
            @ryo
          </div>
          {rooms.map((room) => (
            <div
              key={room.id}
              className={cn(
                  'group relative px-2 py-1 cursor-pointer',
                  currentRoom?.id === room.id ? 'bg-black text-white' : 'hover:bg-black/5'
              )}
              onClick={() => onRoomSelect(room)}
            >
              <div className="flex items-center">
                <span>#{room.name}</span>
                <span className={cn(
                  "text-gray-400 text-[10px] ml-1.5 transition-opacity",
                  room.userCount > 0 ? "opacity-100" : (currentRoom?.id === room.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                )}>
                  {room.userCount} online
                </span>
              </div>
              {isAdmin && onDeleteRoom && (
                <button
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-500 p-1 rounded hover:bg-black/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRoom(room); // Use the passed handler
                  }}
                  aria-label="Delete room"
                >
                  <Trash className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export function ChatsAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isShaking, setIsShaking] = useState(false); // Keep UI state like shaking

  // --- Instantiate Hooks ---

  const chatRoomsManager = useChatRooms({ 
    isWindowOpen: isWindowOpen || false, 
    isForeground: isForeground || false 
  });

  const chatCoreManager = useChatCore({
    currentRoom: chatRoomsManager.currentRoom,
    username: chatRoomsManager.username,
    isWindowOpen: isWindowOpen || false,
    isForeground: isForeground || false,
    // initialAiMessages can be passed if needed, otherwise hook loads default
  });

  const dialogManager = useDialogManager({
    // Pass callbacks that interact with other hooks or perform actions
    onConfirmClearChats: chatCoreManager.clearChats,
    onSaveTranscript: (fileName, transcript) => {
        const filePath = `/Documents/${fileName}`;
        const saveEvent = new CustomEvent("saveFile", {
          detail: {
            name: fileName,
            path: filePath,
            content: transcript,
            icon: "/icons/file-text.png",
            isDirectory: false,
          },
        });
        window.dispatchEvent(saveEvent);
    },
    onSetUsername: async (newUsername) => {
        // Call API to set/create user
        try {
            const response = await fetch('/api/chat-rooms?action=createUser', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: newUsername }),
            });
            if (response.ok) {
              const data = await response.json();
              chatRoomsManager.setUsername(data.user.username); // Update state via hook
              return { success: true };
            } else if (response.status === 409) {
              return { success: false, error: "Username already taken." };
            } else {
              const errorData = await response.json();
              return { success: false, error: errorData.error || 'Failed to set username.' };
            }
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    },
    onCreateRoom: async (roomName) => {
        if (!chatRoomsManager.username) return { success: false, error: "Username not set." };
        try {
            const response = await fetch('/api/chat-rooms?action=createRoom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: roomName }),
            });
            if (response.ok) {
              const newRoomData = await response.json();
              await chatRoomsManager.fetchRooms(); // Re-fetch rooms to include the new one
              // Auto-join the new room
              await chatRoomsManager.callRoomAction('joinRoom', newRoomData.room.id, chatRoomsManager.username);
              chatRoomsManager.handleRoomSelect(newRoomData.room); // Select the new room
              return { success: true, room: newRoomData.room };
            } else {
              const errorData = await response.json();
              return { success: false, error: errorData.error || 'Failed to create room.' };
            }
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    },
    onDeleteRoom: async (roomId) => {
        try {
            const response = await fetch(`/api/chat-rooms?action=deleteRoom&roomId=${roomId}`, {
              method: 'DELETE'
            });
            if (response.ok) {
              await chatRoomsManager.fetchRooms(); // Re-fetch rooms
              // If current room was deleted, switch to Ryo
              if (chatRoomsManager.currentRoom?.id === roomId) {
                chatRoomsManager.handleRoomSelect(null);
              }
              return { success: true };
            } else {
              const errorData = await response.json();
              return { success: false, error: errorData.error || 'Failed to delete room.' };
            }
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    },
    initialUsername: chatRoomsManager.username,
    messages: chatCoreManager.messages,
  });

  // --- Nudge Handling ---
  const handleNudge = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    chatCoreManager.handleNudge(); // Delegate nudge logic to core hook
  }, [chatCoreManager.handleNudge]);

  // --- Effect for Username Prompt ---
   useEffect(() => {
     // If username is null after initial load/check in useChatRooms, open dialog
     if (chatRoomsManager.username === null) {
       // Small delay to ensure component mounts fully before opening dialog
       const timer = setTimeout(() => {
           if (chatRoomsManager.username === null && !dialogManager.isUsernameDialogOpen) {
               console.log("Username is null, opening dialog.");
               dialogManager.openUsernameDialog(null);
           }
       }, 500);
       return () => clearTimeout(timer);
     }
   }, [chatRoomsManager.username, dialogManager.openUsernameDialog, dialogManager.isUsernameDialogOpen]);


  // --- Render Logic ---
  if (!isWindowOpen) return null;

  return (
    <>
      <ChatsMenuBar
        onClose={onClose}
        onShowHelp={dialogManager.openHelpDialog}
        onShowAbout={dialogManager.openAboutDialog}
        onClearChats={dialogManager.openClearDialog}
        onSaveTranscript={() => dialogManager.openSaveDialog(chatCoreManager.messages)}
        onSetUsername={() => dialogManager.openUsernameDialog(chatRoomsManager.username)}
        onToggleSidebar={chatRoomsManager.toggleSidebar}
        isSidebarVisible={chatRoomsManager.isSidebarVisible}
        onAddRoom={dialogManager.openNewRoomDialog} // Open dialog
        rooms={chatRoomsManager.rooms}
        currentRoom={chatRoomsManager.currentRoom}
        onRoomSelect={chatRoomsManager.handleRoomSelect}
        isAdmin={chatRoomsManager.isAdmin}
      />
      <WindowFrame
        title={chatRoomsManager.currentRoom ? `#${chatRoomsManager.currentRoom.name}` : "@ryo"}
        onClose={onClose}
        isForeground={isForeground}
        appId="chats"
        isShaking={isShaking}
      >
        <div className="flex flex-col md:flex-row h-full bg-[#c0c0c0] w-full">
          <ChatRoomSidebar
            rooms={chatRoomsManager.rooms}
            currentRoom={chatRoomsManager.currentRoom}
            onRoomSelect={chatRoomsManager.handleRoomSelect}
            onAddRoom={dialogManager.openNewRoomDialog} // Open dialog
            onDeleteRoom={dialogManager.openDeleteRoomDialog} // Open dialog
            isVisible={chatRoomsManager.isSidebarVisible}
            onToggleVisibility={chatRoomsManager.toggleSidebar}
            username={chatRoomsManager.username}
            isAdmin={chatRoomsManager.isAdmin}
          />
          <div className="flex flex-col flex-1 p-2 overflow-hidden">
            <ChatMessages
              // Use a key that changes when switching between AI and rooms
              key={chatRoomsManager.currentRoom ? `room-${chatRoomsManager.currentRoom.id}` : 'ryo'}
              messages={chatCoreManager.messages}
              isLoading={chatCoreManager.isLoading}
              error={chatCoreManager.error}
              onRetry={chatCoreManager.reload} // Assuming reload is for AI chat
              onClear={dialogManager.openClearDialog} // Open dialog
              isRoomView={!!chatRoomsManager.currentRoom}
            />
            <ChatInput
              input={chatCoreManager.input}
              isLoading={chatCoreManager.isLoading}
              isForeground={isForeground}
              onInputChange={chatCoreManager.handleInputChange}
              onSubmit={chatCoreManager.handleSubmit}
              onStop={chatCoreManager.stop} // Assuming stop is for AI chat
              onDirectMessageSubmit={chatCoreManager.handleDirectMessageSubmit}
              onNudge={handleNudge} // Use local nudge handler for shaking
              // Generate previous messages based on the current context (AI or Room)
              previousMessages={Array.from(
                new Set(
                  chatCoreManager.messages
                    .filter((msg) => msg.role === "user") // Filter user messages from combined list
                    .map((msg) => msg.content)
                )
              ).reverse()}
            />
            {chatCoreManager.textEditContext && (
              <div className="font-geneva-12 flex items-center gap-1 text-[10px] text-gray-600 mt-1 px-0 py-0.5">
                <FileText className="w-3 h-3" />
                <span>
                  Using{" "}
                  <strong>{truncateFilename(chatCoreManager.textEditContext.fileName)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Render Dialogs using state/handlers from useDialogManager */}
        <HelpDialog
          isOpen={dialogManager.isHelpDialogOpen}
          onOpenChange={dialogManager.closeHelpDialog}
          helpItems={helpItems}
          appName="Chats"
        />
        <AboutDialog
          isOpen={dialogManager.isAboutDialogOpen}
          onOpenChange={dialogManager.closeAboutDialog}
          metadata={appMetadata}
        />
        <ConfirmDialog
          isOpen={dialogManager.isClearDialogOpen}
          onOpenChange={dialogManager.closeClearDialog}
          onConfirm={dialogManager.confirmClearChats}
          title="Clear Chats"
          description="Are you sure you want to clear your chat history with Ryo? This action cannot be undone." // Clarified scope
        />
        <InputDialog
          isOpen={dialogManager.isSaveDialogOpen}
          onOpenChange={dialogManager.closeSaveDialog}
          onSubmit={dialogManager.handleSaveSubmit}
          title="Save Transcript"
          description="Enter a name for your transcript file"
          value={dialogManager.saveFileName}
          onChange={dialogManager.handleSaveFileNameChange}
        />
        <InputDialog
          isOpen={dialogManager.isUsernameDialogOpen}
          onOpenChange={dialogManager.closeUsernameDialog}
          onSubmit={dialogManager.handleUsernameSubmit}
          title="Set Username"
          description="Enter the username you want to use in chat rooms"
          value={dialogManager.newUsername}
          onChange={dialogManager.handleNewUsernameChange}
          isLoading={dialogManager.isSettingUsername}
          errorMessage={dialogManager.usernameError}
        />
        <InputDialog
          isOpen={dialogManager.isNewRoomDialogOpen}
          onOpenChange={dialogManager.closeNewRoomDialog}
          onSubmit={dialogManager.handleRoomSubmit}
          title="Create New Room"
          description="Enter a name for the new chat room"
          value={dialogManager.newRoomName}
          onChange={dialogManager.handleNewRoomNameChange}
          isLoading={dialogManager.isCreatingRoom}
          errorMessage={dialogManager.roomError}
        />
        <ConfirmDialog
          isOpen={dialogManager.isDeleteRoomDialogOpen}
          onOpenChange={dialogManager.closeDeleteRoomDialog}
          onConfirm={dialogManager.confirmDeleteRoom}
          title="Delete Chat Room"
          description={`Are you sure you want to delete the room "${dialogManager.roomToDelete?.name}"? This action cannot be undone.`}
        />
      </WindowFrame>
    </>
  );
}