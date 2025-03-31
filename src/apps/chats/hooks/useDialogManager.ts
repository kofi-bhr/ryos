import { useState, useCallback } from 'react';
import { type ChatRoom } from '@/types/chat';
import { type Message } from 'ai';
import { saveAsMarkdown } from '@/utils/markdown/saveUtils'; // Assuming this utility exists

export interface DialogManager {
  // Help Dialog
  isHelpDialogOpen: boolean;
  openHelpDialog: () => void;
  closeHelpDialog: () => void;

  // About Dialog
  isAboutDialogOpen: boolean;
  openAboutDialog: () => void;
  closeAboutDialog: () => void;

  // Clear Chat Dialog
  isClearDialogOpen: boolean;
  openClearDialog: () => void;
  closeClearDialog: () => void;
  confirmClearChats: () => void; // Needs callback from parent

  // Save Transcript Dialog
  isSaveDialogOpen: boolean;
  saveFileName: string;
  openSaveDialog: (messages: Message[]) => void; // Pass messages to generate default name
  closeSaveDialog: () => void;
  handleSaveFileNameChange: (name: string) => void;
  handleSaveSubmit: (fileName: string) => void; // Needs callback from parent

  // Set Username Dialog
  isUsernameDialogOpen: boolean;
  newUsername: string;
  isSettingUsername: boolean;
  usernameError: string | null;
  openUsernameDialog: (currentUsername: string | null) => void;
  closeUsernameDialog: () => void;
  handleNewUsernameChange: (name: string) => void;
  handleUsernameSubmit: (username: string) => Promise<void>; // Needs callback from parent

  // New Room Dialog
  isNewRoomDialogOpen: boolean;
  newRoomName: string;
  isCreatingRoom: boolean;
  roomError: string | null;
  openNewRoomDialog: () => void;
  closeNewRoomDialog: () => void;
  handleNewRoomNameChange: (name: string) => void;
  handleRoomSubmit: (roomName: string) => Promise<void>; // Needs callback from parent

  // Delete Room Dialog
  isDeleteRoomDialogOpen: boolean;
  roomToDelete: ChatRoom | null;
  openDeleteRoomDialog: (room: ChatRoom) => void;
  closeDeleteRoomDialog: () => void;
  confirmDeleteRoom: () => Promise<void>; // Needs callback from parent
}

interface DialogManagerProps {
  onConfirmClearChats: () => void;
  onSaveTranscript: (fileName: string, transcript: string) => void;
  onSetUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
  onCreateRoom: (roomName: string) => Promise<{ success: boolean; error?: string; room?: ChatRoom }>;
  onDeleteRoom: (roomId: string) => Promise<{ success: boolean; error?: string }>;
  initialUsername?: string | null;
  messages?: Message[]; // For save transcript default name
}

export const useDialogManager = ({
  onConfirmClearChats,
  onSaveTranscript,
  onSetUsername,
  onCreateRoom,
  onDeleteRoom,
  initialUsername = null,
  messages = [],
}: DialogManagerProps): DialogManager => {
  // Help Dialog
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const openHelpDialog = useCallback(() => setIsHelpDialogOpen(true), []);
  const closeHelpDialog = useCallback(() => setIsHelpDialogOpen(false), []);

  // About Dialog
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const openAboutDialog = useCallback(() => setIsAboutDialogOpen(true), []);
  const closeAboutDialog = useCallback(() => setIsAboutDialogOpen(false), []);

  // Clear Chat Dialog
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const openClearDialog = useCallback(() => setIsClearDialogOpen(true), []);
  const closeClearDialog = useCallback(() => setIsClearDialogOpen(false), []);
  const confirmClearChats = useCallback(() => {
    closeClearDialog();
    onConfirmClearChats();
  }, [closeClearDialog, onConfirmClearChats]);

  // Save Transcript Dialog
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const openSaveDialog = useCallback((currentMessages: Message[]) => {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase().replace(":", "-").replace(" ", "");
    setSaveFileName(`chat-${date}-${time}.md`);
    setIsSaveDialogOpen(true);
  }, []);
  const closeSaveDialog = useCallback(() => setIsSaveDialogOpen(false), []);
  const handleSaveFileNameChange = useCallback((name: string) => setSaveFileName(name), []);
  const handleSaveSubmit = useCallback((fileName: string) => {
    const transcript = messages
      .map((msg) => {
        const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
        const role = msg.role === 'user' ? 'You' : (msg.role === 'assistant' ? 'Ryo' : (msg.username || msg.role));
        return `**${role}** (${time}):\n${msg.content}\n`;
      })
      .join("\n");

    const finalFileName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    onSaveTranscript(finalFileName, transcript);
    closeSaveDialog();
  }, [messages, onSaveTranscript, closeSaveDialog]);

  // Set Username Dialog
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(initialUsername || "");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const openUsernameDialog = useCallback((currentUsername: string | null) => {
    setNewUsername(currentUsername || "");
    setUsernameError(null);
    setIsUsernameDialogOpen(true);
  }, []);
  const closeUsernameDialog = useCallback(() => setIsUsernameDialogOpen(false), []);
  const handleNewUsernameChange = useCallback((name: string) => {
    setNewUsername(name);
    setUsernameError(null);
  }, []);
  const handleUsernameSubmit = useCallback(async (submittedUsername: string) => {
    const trimmedUsername = submittedUsername.trim();
    if (!trimmedUsername) {
      setUsernameError("Username cannot be empty.");
      return;
    }
    setIsSettingUsername(true);
    setUsernameError(null);
    const { success, error } = await onSetUsername(trimmedUsername);
    setIsSettingUsername(false);
    if (success) {
      closeUsernameDialog();
    } else {
      setUsernameError(error || "Failed to set username.");
    }
  }, [onSetUsername, closeUsernameDialog]);

  // New Room Dialog
  const [isNewRoomDialogOpen, setIsNewRoomDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const openNewRoomDialog = useCallback(() => {
    setNewRoomName("");
    setRoomError(null);
    setIsNewRoomDialogOpen(true);
  }, []);
  const closeNewRoomDialog = useCallback(() => setIsNewRoomDialogOpen(false), []);
  const handleNewRoomNameChange = useCallback((name: string) => {
    setNewRoomName(name);
    setRoomError(null);
  }, []);
  const handleRoomSubmit = useCallback(async (submittedRoomName: string) => {
    const trimmedRoomName = submittedRoomName.trim();
    if (!trimmedRoomName) {
      setRoomError("Room name cannot be empty.");
      return;
    }
    setIsCreatingRoom(true);
    setRoomError(null);
    const { success, error } = await onCreateRoom(trimmedRoomName);
    setIsCreatingRoom(false);
    if (success) {
      closeNewRoomDialog();
    } else {
      setRoomError(error || "Failed to create room.");
    }
  }, [onCreateRoom, closeNewRoomDialog]);

  // Delete Room Dialog
  const [isDeleteRoomDialogOpen, setIsDeleteRoomDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);
  const openDeleteRoomDialog = useCallback((room: ChatRoom) => {
    setRoomToDelete(room);
    setIsDeleteRoomDialogOpen(true);
  }, []);
  const closeDeleteRoomDialog = useCallback(() => {
    setIsDeleteRoomDialogOpen(false);
    setRoomToDelete(null);
  }, []);
  const confirmDeleteRoom = useCallback(async () => {
    if (!roomToDelete) return;
    const roomId = roomToDelete.id;
    // Optimistically close dialog
    closeDeleteRoomDialog();
    await onDeleteRoom(roomId);
    // Error handling should be managed by the caller or shown via notifications
  }, [roomToDelete, onDeleteRoom, closeDeleteRoomDialog]);

  return {
    isHelpDialogOpen, openHelpDialog, closeHelpDialog,
    isAboutDialogOpen, openAboutDialog, closeAboutDialog,
    isClearDialogOpen, openClearDialog, closeClearDialog, confirmClearChats,
    isSaveDialogOpen, saveFileName, openSaveDialog, closeSaveDialog, handleSaveFileNameChange, handleSaveSubmit,
    isUsernameDialogOpen, newUsername, isSettingUsername, usernameError, openUsernameDialog, closeUsernameDialog, handleNewUsernameChange, handleUsernameSubmit,
    isNewRoomDialogOpen, newRoomName, isCreatingRoom, roomError, openNewRoomDialog, closeNewRoomDialog, handleNewRoomNameChange, handleRoomSubmit,
    isDeleteRoomDialogOpen, roomToDelete, openDeleteRoomDialog, closeDeleteRoomDialog, confirmDeleteRoom,
  };
};