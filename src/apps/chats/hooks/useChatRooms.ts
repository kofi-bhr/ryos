import { useState, useEffect, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';
import { type ChatRoom } from '@/types/chat';
import {
  loadChatRoomUsername,
  saveChatRoomUsername,
  loadLastOpenedRoomId,
  saveLastOpenedRoomId,
  loadCachedChatRooms,
  saveCachedChatRooms,
  loadChatSidebarVisible,
  saveChatSidebarVisible,
  APP_STORAGE_KEYS,
} from "@/utils/storage";

// Define the return type for the hook
export interface ChatRoomsManager {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  username: string | null;
  isAdmin: boolean;
  isSidebarVisible: boolean;
  handleRoomSelect: (room: ChatRoom | null) => void;
  setUsername: (name: string | null) => void; // Allow setting username directly
  toggleSidebar: () => void;
  fetchRooms: () => Promise<void>; // Expose fetch function
  callRoomAction: (action: 'joinRoom' | 'leaveRoom', roomId: string | null, currentUsername: string | null) => Promise<void>;
}

interface UseChatRoomsProps {
  isWindowOpen: boolean;
  isForeground: boolean;
}

// Define Pusher error types
interface PusherError {
  type: string;
  data: {
    code: number;
    message: string;
  };
}

interface PusherConnectionError {
  type: string; // e.g., 'PusherError', 'WebSocketError'
  data?: { // Optional top-level data
    code: number;
    message: string;
  };
  error?: PusherError | string; // Nested error could be PusherError or just a message
  message?: string; // Optional top-level message
  code?: number; // Optional top-level code
}

interface PusherSubscriptionError {
  type: string; // e.g., 'AuthError'
  error: string; // Human-readable message
  status: number; // HTTP Status code
}

export const useChatRooms = ({ isWindowOpen, isForeground }: UseChatRoomsProps): ChatRoomsManager => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Default true

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<{ unbind_all: () => void } | null>(null);
  const previousRoomIdRef = useRef<string | null>(null);

  const isAdmin = username === "ryo";

  // --- API Calls ---
  const callRoomAction = useCallback(async (action: 'joinRoom' | 'leaveRoom', roomId: string | null, currentUsername: string | null) => {
    if (!roomId || !currentUsername) return;

    console.log(`[Room Action] Calling ${action} for room ${roomId}, user ${currentUsername}`);
    try {
      const response = await fetch(`/api/chat-rooms?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, username: currentUsername }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[Room Action] Failed to ${action} room ${roomId}:`, errorData);
      } else {
         console.log(`[Room Action] Successfully performed ${action} for room ${roomId}`);
         // Optionally update user counts immediately after join/leave success
      }
    } catch (error) {
      console.error(`[Room Action] Network error during ${action} for room ${roomId}:`, error);
    }
  }, []); // Removed fetchRooms from dependencies

  const fetchRooms = useCallback(async (): Promise<void> => {
    try {
      console.log('[useChatRooms] Fetching rooms...');
      const response = await fetch('/api/chat-rooms?action=getRooms');
      if (!response.ok) {
        console.error(`Failed to fetch rooms: ${response.statusText}`);
        return;
      }
      const data = await response.json();
      const fetchedRooms: ChatRoom[] = data.rooms || [];

      setRooms(prevRooms => {
        const prevRoomsJson = JSON.stringify(prevRooms.map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));
        const fetchedRoomsJson = JSON.stringify(fetchedRooms.map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));

        if (prevRoomsJson !== fetchedRoomsJson) {
          saveCachedChatRooms(fetchedRooms);
          console.log("[useChatRooms] Updated rooms cache with fresh data");
          return fetchedRooms;
        }
        return prevRooms; // No change
      });
    } catch (error) {
      console.error('[useChatRooms] Error fetching rooms:', error);
    }
  }, []); // Remove dependency on currentRoom

  // --- Username Management ---
  const setUsername = useCallback((name: string | null) => {
    setUsernameState(name);
    if (name) {
      saveChatRoomUsername(name);
    } else {
      localStorage.removeItem(APP_STORAGE_KEYS.chats.CHAT_ROOM_USERNAME); // Or specific key
    }
  }, []);

  useEffect(() => {
    const storedUsername = loadChatRoomUsername();
    if (storedUsername) {
      setUsernameState(storedUsername);
      console.log(`[useChatRooms] Loaded username: ${storedUsername}`);
    } else {
      setUsernameState(null);
      console.log('[useChatRooms] No stored username found.');
      // Dialog opening is handled by the DialogManager hook based on this state
    }
  }, []);

  // --- Sidebar Visibility ---
  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(prev => {
      const newState = !prev;
      saveChatSidebarVisible(newState);
      return newState;
    });
  }, []);

  useEffect(() => {
    const savedState = loadChatSidebarVisible();
    setIsSidebarVisible(savedState);
  }, []);

  // --- Room Selection ---
  const handleRoomSelect = useCallback((newRoom: ChatRoom | null) => {
    const previousRoomId = previousRoomIdRef.current;
    const newRoomId = newRoom ? newRoom.id : null;

    console.log(`[Room Select] Switching from ${previousRoomId || '@ryo'} to ${newRoomId || '@ryo'}`);

    if (previousRoomId !== newRoomId && username) {
      // Leave previous room
      if (previousRoomId) {
        callRoomAction('leaveRoom', previousRoomId, username);
      }
      // Join new room
      if (newRoomId) {
        callRoomAction('joinRoom', newRoomId, username);
      }
    }

    setCurrentRoom(newRoom);
    saveLastOpenedRoomId(newRoomId);
    previousRoomIdRef.current = newRoomId;
  }, [username, callRoomAction]);

  // --- Pusher Real-time Updates ---
  useEffect(() => {
    if (!isWindowOpen || !isForeground) {
      // Disconnect Pusher if window is not open or not in foreground
      if (pusherRef.current) {
        console.log('[Pusher] Disconnecting due to window state change...');
        pusherRef.current.disconnect();
        pusherRef.current = null;
        channelRef.current = null;
      }
      return;
    }

    console.log('[Pusher] Initializing...');

    if (!pusherRef.current) {
      try {
        pusherRef.current = new Pusher('b47fd563805c8c42da1a', {
          cluster: 'us3',
          // Add error handling for connection
          authEndpoint: '/api/pusher/auth', // Example if needed for private channels
          // connectionTimeout: 10000, // Example timeout
        });

        pusherRef.current.connection.bind('error', (err: PusherConnectionError) => {
          console.error('[Pusher] Connection Error:', err);
          // Handle specific errors like authentication failure, unavailable cluster etc.
          // Example check: Adapt based on actual error structure logged
          let errorCode: number | undefined;
          if (err.data?.code) {
            errorCode = err.data.code;
          } else if (err.error && typeof err.error === 'object' && 'data' in err.error && typeof err.error.data === 'object' && err.error.data && 'code' in err.error.data) {
            // Check if err.error is an object and has data.code (making sure data is not null)
            errorCode = err.error.data.code;
          } else if (err.code) {
            errorCode = err.code;
          }

          if (errorCode === 4004) {
            console.error("Pusher app not found or disabled.");
          }
        });

        pusherRef.current.connection.bind('connected', () => {
          console.log('[Pusher] Connected successfully.');
          // Subscribe after successful connection
          const channel = pusherRef.current!.subscribe('chats');
          channelRef.current = channel;

          // Bind events only after successful subscription
          channel.bind('pusher:subscription_succeeded', () => {
            console.log('[Pusher] Subscribed to channel: chats');

            // Bind to room update events
            channel.bind('rooms-updated', (data: { rooms: ChatRoom[] }) => {
              console.log('[Pusher] Received rooms update:', data);
              if (data.rooms) {
                setRooms(currentRooms => {
                  const currentRoomsJson = JSON.stringify(currentRooms.map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));
                  const fetchedRoomsJson = JSON.stringify(data.rooms.map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));

                  if (currentRoomsJson !== fetchedRoomsJson) {
                    console.log("[Pusher] Room data updated via Pusher:", data.rooms);
                    saveCachedChatRooms(data.rooms); // Update cache
                    return data.rooms;
                  }
                  return currentRooms; // No changes
                });
              }
            });

            // Bind to user count update events
            channel.bind('user-count-updated', (data: { roomId: string; userCount: number }) => {
              console.log('[Pusher] Received user count update:', data);
              setRooms(prevRooms => {
                const updatedRooms = prevRooms.map(room => {
                  if (room.id === data.roomId) {
                    return { ...room, userCount: data.userCount };
                  }
                  return room;
                });
                 // Check if counts actually changed before updating state/cache
                 const changed = JSON.stringify(updatedRooms) !== JSON.stringify(prevRooms);
                 if (changed) {
                    saveCachedChatRooms(updatedRooms);
                    return updatedRooms;
                 }
                 return prevRooms;
              });
            });

            // Message events are handled in useChatCore

          });

          channel.bind('pusher:subscription_error', (error: PusherSubscriptionError) => {
            console.error('[Pusher] Subscription Error:', error);
            // Handle subscription errors (e.g., auth failure for private channels)
            // Example: Check error.status or error.type
            if (error.status === 401 || error.status === 403) {
                console.error('Authentication/Authorization failed for Pusher subscription.');
            }
          });
        });

        pusherRef.current.connection.bind('disconnected', () => {
          console.log('[Pusher] Disconnected.');
          // Optionally implement reconnection logic here if needed
        });

      } catch (error) {
        console.error('[Pusher] Failed to initialize Pusher:', error);
      }
    }

    // Cleanup function
    return () => {
      if (pusherRef.current && (!isWindowOpen || !isForeground)) {
        console.log('[Pusher] Cleaning up subscriptions and disconnecting...');
        if (channelRef.current) {
          channelRef.current.unbind_all();
        }
        // Check connection state before disconnecting
        if (pusherRef.current.connection.state !== 'disconnected') {
           pusherRef.current.disconnect();
        }
        pusherRef.current = null;
        channelRef.current = null;
      }
    };
  }, [isWindowOpen, isForeground]); // Re-run when window/foreground state changes

  // --- Initial Load and Room Restoration ---
  const isInitialMountRef = useRef(true);
  
  useEffect(() => {
    const initializeRooms = async () => {
      // First load cached rooms
      const cachedRooms = loadCachedChatRooms();
      if (cachedRooms && cachedRooms.length > 0) {
        console.log("[useChatRooms] Using cached rooms initially:", cachedRooms.length);
        setRooms(cachedRooms);
        
        // Try to restore last opened room
        const lastRoomId = loadLastOpenedRoomId();
        if (lastRoomId) {
          const lastRoom = cachedRooms.find(room => room.id === lastRoomId);
          if (lastRoom) {
            setCurrentRoom(lastRoom);
            previousRoomIdRef.current = lastRoom.id;
            console.log(`[useChatRooms] Restored last room from cache: ${lastRoom.name}`);
          }
        }
      }
      
      // Then fetch fresh data separately (don't use the return value)
      try {
        // Use direct fetch here instead of fetchRooms
        console.log('[useChatRooms] Fetching fresh room data...');
        const response = await fetch('/api/chat-rooms?action=getRooms');
        
        if (!response.ok) {
          console.error(`[useChatRooms] Failed to fetch rooms: ${response.statusText}`);
          return;
        }
        
        const data = await response.json();
        const fetchedRooms: ChatRoom[] = data.rooms || [];
        
        // Check if we have new data
        if (fetchedRooms.length > 0) {
          const currentRoomsJson = JSON.stringify((cachedRooms || []).map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));
          const newRoomsJson = JSON.stringify(fetchedRooms.map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));
          
          if (currentRoomsJson !== newRoomsJson) {
            console.log('[useChatRooms] Updating rooms with fresh data');
            setRooms(fetchedRooms);
            saveCachedChatRooms(fetchedRooms);
            
            // If no current room is set, try to restore from fresh data
            if (!currentRoom) {
              const lastRoomId = loadLastOpenedRoomId();
              if (lastRoomId) {
                const lastRoom = fetchedRooms.find(room => room.id === lastRoomId);
                if (lastRoom) {
                  setCurrentRoom(lastRoom);
                  previousRoomIdRef.current = lastRoom.id;
                  console.log(`[useChatRooms] Restored last room from fresh data: ${lastRoom.name}`);
                } else {
                  // Last room no longer exists, clear it
                  saveLastOpenedRoomId(null);
                }
              }
            }
          } else {
            console.log('[useChatRooms] Rooms data unchanged, using cache');
          }
        }
      } catch (error) {
        console.error("[useChatRooms] Error fetching fresh room data:", error);
      }
    };

    if (isInitialMountRef.current) {
      console.log("[useChatRooms] Initial mount, loading rooms...");
      initializeRooms();
      isInitialMountRef.current = false;
    }
  }, []); // Empty dependency array - only run on mount

   // Effect to join initial room when username becomes available
   useEffect(() => {
     const initialRoomId = currentRoom ? currentRoom.id : null;
     if (initialRoomId && username && !previousUsernameRef.current) { 
       console.log("[useChatRooms] Username available, joining initial room:", initialRoomId);
       callRoomAction('joinRoom', initialRoomId, username);
     }
     // Update previous username ref for the next render
     previousUsernameRef.current = username;
   }, [username, currentRoom?.id, callRoomAction]);

   // Ref to track previous username state for the effect above
   const previousUsernameRef = useRef<string | null>(null);
   // Initialize previous username ref on mount
   useEffect(() => {
       previousUsernameRef.current = username;
   }, []); // Run only on mount

  return {
    rooms,
    currentRoom,
    username,
    isAdmin,
    isSidebarVisible,
    handleRoomSelect,
    setUsername,
    toggleSidebar,
    fetchRooms,
    callRoomAction,
  };
};