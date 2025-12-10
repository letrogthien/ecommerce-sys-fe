import { Client, type IMessage } from '@stomp/stompjs';
import { getGuestToken, getGuestUUID } from './guestSessionService';

export interface ChatMessage {
  messageId?: string;
  conversationId: string;
  userId: string;
  serverSeq?: number | null;
  threadRootId?: string | null;
  text: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  edited?: boolean;
  deleted?: boolean;
}

export interface GuestChatService {
  client: Client | null;
  connect: (onMessageReceived: (message: ChatMessage) => void) => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string, conversationId?: string) => void;
  isConnected: () => boolean;
}

class GuestChatServiceImpl implements GuestChatService {
  client: Client | null = null;
  private messageCallback: ((message: ChatMessage) => void) | null = null;

  async connect(onMessageReceived: (message: ChatMessage) => void): Promise<void> {
    const token = getGuestToken();
    
    if (!token) {
      console.error('❌ No guest token available');
      throw new Error('No guest token available. Please initialize guest session first.');
    }

    console.log('🔌 Connecting to WebSocket...');
    console.log('🎫 Token (first 50 chars):', token.substring(0, 50) + '...');

    this.messageCallback = onMessageReceived;

    // Use relative WebSocket URL for Vite proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/websocket?token=${encodeURIComponent(token)}`;
    console.log('🔌 WebSocket URL:', wsUrl.substring(0, 100) + '...');

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.log('🔍 STOMP Debug:', str);
      },
      
      onConnect: () => {
        console.log('✅ Guest chat WebSocket connected');
        
        // Subscribe to user-specific queue
        this.client?.subscribe('/user/queue/messages', (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            console.log('📨 Received message:', data);
            this.messageCallback?.(data);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });
        
        // Subscribe to broadcast messages
        this.client?.subscribe('/topic/messages', (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            console.log('📢 Received broadcast:', data);
            this.messageCallback?.(data);
          } catch (error) {
            console.error('Error parsing broadcast message:', error);
          }
        });
      },
      
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame.headers['message']);
        console.error('Details:', frame.body);
      },
      
      onWebSocketError: (error) => {
        console.error('❌ WebSocket error:', error);
      },
      
      onDisconnect: () => {
        console.log('🔌 Guest chat WebSocket disconnected');
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.messageCallback = null;
    }
  }

  sendMessage(text: string, conversationId: string = ''): void {
    if (!this.client?.connected) {
      console.error('❌ Not connected to WebSocket');
      return;
    }

    const userId = getGuestUUID();
    if (!userId) {
      console.error('❌ No guest UUID found');
      return;
    }

    const message: ChatMessage = {
      messageId: crypto.randomUUID(),
      conversationId: conversationId,
      userId: userId,
      serverSeq: null,
      threadRootId: null,
      text: text,
      type: 'GUEST',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false,
      deleted: false,
    };

    this.client.publish({
      destination: '/app/guest/chat',
      body: JSON.stringify(message),
    });

    console.log('📤 Sent message:', message);
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Export singleton instance
export const guestChatService = new GuestChatServiceImpl();
