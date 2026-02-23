import { io, Socket } from 'socket.io-client';
import type { DefaultEventsMap } from '@socket.io/component-emitter';
import { authService } from './User.Services';

// Export types for better module resolution
export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
};

export type ChatRoom = {
  id: string;
  participants: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }[];
  lastMessage?: ChatMessage;
  unreadCount: number;
};

export type ChatListUpdate = {
  otherUserId: string;
  lastMessageAt: string | Date;
  unreadIncrement?: number;
};

class ChatService {
  private socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;
  private currentUser: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private initializePromise: Promise<void> | null = null;

  private resolveSocketUrl() {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;

    if (typeof envSocketUrl === 'string' && envSocketUrl.trim().length > 0) {
      return String(envSocketUrl).trim().replace(/\/+$/, '');
    }

    const base =
      (typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0)
        ? envBaseUrl
        : 'http://localhost:8100';

    const trimmed = String(base || '').trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
  }

  // Initialize socket connection
  async initialize() {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this.initializeInternal().finally(() => {
      this.initializePromise = null;
    });

    return this.initializePromise;
  }

  private async initializeInternal() {
    try {
      // Get current user info
      const userResponse = await authService.getCurrentUser();
      if (!userResponse?.success || !userResponse?.data) {
        throw new Error('User not authenticated');
      }

      this.currentUser = userResponse.data;

      // Initialize socket connection
      // Replace with your backend URL
      const backendUrl = this.resolveSocketUrl();
      
      console.log('🔌 Connecting to backend:', backendUrl);
      
      this.socket = io(backendUrl, {
        auth: {
          token: localStorage.getItem('token'),
          userId: this.currentUser.id || this.currentUser._id,
          userName: this.currentUser?.name,
          userEmail: this.currentUser?.email
        },
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        timeout: 10000,
        autoConnect: true
      });

      console.log('🔌 Socket created:', {
        exists: !!this.socket,
        connected: this.socket.connected,
        id: this.socket.id
      });

      // Add connection event listeners
      this.socket.on('connect', () => {
        console.log('🔌 Connected to chat server!');
        console.log('🔌 Socket ID:', this.socket?.id);
        this.reconnectAttempts = 0;
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Connection error:', error);
        console.error('🔌 Error details:', error.message);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason);
      });

      this.setupEventListeners();

      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not created'));
          return;
        }

        if (this.socket.connected) {
          resolve();
          return;
        }

        const timer = setTimeout(() => {
          cleanup();
          reject(new Error('Socket connection timeout'));
        }, 12000);

        const onConnect = () => {
          cleanup();
          resolve();
        };

        const onError = (error: any) => {
          cleanup();
          reject(error instanceof Error ? error : new Error(String(error?.message || error)));
        };

        const cleanup = () => {
          clearTimeout(timer);
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
        };

        this.socket.once('connect', onConnect);
        this.socket.once('connect_error', onError);
      });

      console.log('✅ Chat service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize chat service:', error);
      throw error;
    }
  }

  private async ensureConnected() {
    if (this.socket?.connected) return;

    if (!this.socket) {
      await this.initialize();
    }

    const socket = this.socket;
    if (!socket) {
      throw new Error('Socket not created');
    }

    if (socket.connected) return;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Socket connection timeout'));
      }, 12000);

      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onError = (error: any) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error?.message || error)));
      };

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onError);

      if (!socket.active) {
        socket.connect();
      }
    });
  }

  // Setup socket event listeners
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to chat server');
      this.reconnectAttempts = 0;
      
      // Join user's personal room for direct messages
      this.socket?.emit('join_user_room', {
        userId: this.currentUser?.id || this.currentUser._id,
        userInfo: {
          name: this.currentUser?.name,
          email: this.currentUser?.email,
          avatar: this.currentUser?.avatar
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat server:', reason);
      
      // Attempt to reconnect if not intentionally disconnected
      if (reason === 'io server disconnect') {
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.reconnect();
    });

    // Message events
    this.socket.on('new_message', (message: ChatMessage) => {
      console.log('📨 New message received:', message);
      // This will be handled by the chat component
    });

    this.socket.on('message_read', (data: { messageId: string, readerId: string }) => {
      console.log('📖 Message read:', data);
    });

    this.socket.on('user_online', (userId: string) => {
      console.log('🟢 User came online:', userId);
    });

    this.socket.on('user_offline', (userId: string) => {
      console.log('🔴 User went offline:', userId);
    });
  }

  // Reconnection logic
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, 1000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  // Send a direct message to a user
  sendMessage(receiverId: string, content: string): Promise<ChatMessage> {
    return new Promise(async (resolve, reject) => {
      console.log('📤 Attempting to send message:', { receiverId, content });
      console.log('🔌 Socket status:', {
        exists: !!this.socket,
        connected: this.socket?.connected,
        id: this.socket?.id,
        readyState: this.socket?.io?.engine?.readyState
      });
      
      try {
        await this.ensureConnected();
      } catch (e) {
        console.error('❌ Socket not connected - details:', {
          socket: !!this.socket,
          connected: this.socket?.connected,
          id: this.socket?.id,
          socketExists: !!this.socket,
          isSocketConnected: this.socket?.connected
        });
        reject(e instanceof Error ? e : new Error('Not connected to chat server'));
        return;
      }

      const message = {
        senderId: this.currentUser?.id || this.currentUser._id,
        senderName: this.currentUser?.name,
        senderEmail: this.currentUser?.email,
        receiverId,
        content: content.trim(),
        timestamp: new Date(),
        read: false
      };

      console.log('📨 Emitting send_message event:', message);

      const socket = this.socket;
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('send_message', message, (response: ChatMessage | { error: string }) => {
        console.log('📬 Response from server:', response);
        
        if ('error' in response) {
          console.error('❌ Server returned error:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('✅ Message sent successfully:', response);
          resolve(response);
        }
      });
    });
  }

  // Get chat history with a specific user
  getChatHistory(userId: string, page: number = 1, limit: number = 50): Promise<ChatMessage[]> {
    return new Promise(async (resolve, reject) => {
      console.log('📚 Attempting to get chat history:', { userId, page, limit });
      console.log('🔌 Socket status:', {
        exists: !!this.socket,
        connected: this.socket?.connected,
        id: this.socket?.id
      });
      
      try {
        await this.ensureConnected();
      } catch (e) {
        console.error('❌ Socket not connected for chat history');
        reject(e instanceof Error ? e : new Error('Not connected to chat server'));
        return;
      }

      const socket = this.socket;
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('get_chat_history', { userId, page, limit }, (response: { messages: ChatMessage[] } | { error: string }) => {
        console.log('📚 Chat history response:', response);
        
        if ('error' in response) {
          console.error('❌ Server returned error for chat history:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('✅ Chat history loaded:', response.messages.length, 'messages');
          resolve(response.messages);
        }
      });
    });
  }

  // Mark message as read
  markMessageAsRead(messageId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureConnected();
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Not connected to chat server'));
        return;
      }

      const socket = this.socket;
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('mark_message_read', {
        messageId,
        readerId: this.currentUser?.id || this.currentUser._id
      }, (response: { success: boolean } | { error: string }) => {
        if ('error' in response) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  // Get all chat rooms (conversations)
  getChatRooms(): Promise<ChatRoom[]> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureConnected();
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Not connected to chat server'));
        return;
      }

      const socket = this.socket;
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('get_chat_rooms', {}, (response: { rooms: ChatRoom[] } | { error: string }) => {
        if ('error' in response) {
          reject(new Error(response.error));
        } else {
          resolve(response.rooms);
        }
      });
    });
  }

  // Listen to new messages (for components)
  onNewMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('new_message', callback);
    return () => {
      this.socket?.off('new_message', callback);
    };
  }

  onChatListUpdate(callback: (data: ChatListUpdate) => void) {
    this.socket?.on('chat_list_update', callback);
    return () => {
      this.socket?.off('chat_list_update', callback);
    };
  }

  // Listen to user status changes
  onUserStatusChange(callback: (data: { userId: string; online: boolean }) => void) {
    const onOnline = (userId: string) => callback({ userId, online: true });
    const onOffline = (userId: string) => callback({ userId, online: false });
    this.socket?.on('user_online', onOnline);
    this.socket?.on('user_offline', onOffline);
    return () => {
      this.socket?.off('user_online', onOnline);
      this.socket?.off('user_offline', onOffline);
    };
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
}

// Export singleton instance
export const chatService = new ChatService();
