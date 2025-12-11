import React, { useEffect, useRef, useState } from 'react';
import { guestChatService, type ChatMessage } from '../../services/guestChatService';
import { initGuestSession } from '../../services/guestSessionService';
import './ChatWidget.css';

interface DisplayMessage {
  text: string;
  sender: 'user' | 'support';
  timestamp: string;
  isStreaming?: boolean;
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { text: 'Xin chào! Chúng tôi có thể giúp gì cho bạn?', sender: 'support', timestamp: new Date().toISOString() }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId] = useState('');
  const hasInitialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Stream text effect for incoming messages
  const addStreamingMessage = (fullText: string, sender: 'user' | 'support') => {
    const messageId = Date.now();
    const timestamp = new Date().toISOString();
    
    // Add empty message first
    setMessages(prev => [...prev, {
      text: '',
      sender,
      timestamp,
      isStreaming: true
    }]);

    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        const displayText = fullText.substring(0, currentIndex);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.timestamp === timestamp) {
            lastMessage.text = displayText;
            lastMessage.isStreaming = currentIndex < fullText.length;
          }
          return newMessages;
        });
        currentIndex += 2; // Speed: 2 characters at a time
      } else {
        clearInterval(streamInterval);
      }
    }, 30); // 30ms per update for smooth streaming
  };

  // Initialize guest session and WebSocket connection - only when chat is opened
  useEffect(() => {
    if (!isOpen || hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeGuestChat = async () => {
      try {
        setIsConnecting(true);
        console.log('🔄 Initializing guest session...');
        
        // Get or create guest session and access token
        await initGuestSession();
        console.log('✅ Guest session initialized');
        
        // Connect to WebSocket
        await guestChatService.connect((message: ChatMessage) => {
          // Handle incoming messages with streaming effect
          addStreamingMessage(message.text, 'support');
        });
        
        setIsConnected(true);
        console.log('✅ Guest chat connected');
      } catch (error) {
        console.error('❌ Failed to initialize guest chat:', error);
        setMessages(prev => [...prev, {
          text: 'Không thể kết nối đến hệ thống chat. Vui lòng thử lại sau.',
          sender: 'support',
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsConnecting(false);
      }
    };

    initializeGuestChat();

    // Cleanup on unmount
    return () => {
      guestChatService.disconnect();
    };
  }, [isOpen]); // Depend on isOpen to trigger when chat opens

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const getConnectionStatus = () => {
    if (isConnecting) return 'Đang kết nối...';
    if (isConnected) return 'Trực tuyến';
    return 'Ngoại tuyến';
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Format message with line breaks, links, and basic markdown
  const formatMessage = (text: string) => {
    return text
      // Convert URLs to links
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      // Convert line breaks
      .replace(/\n/g, '<br/>')
      // Bold text **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic text *text*
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code `code`
      .replace(/`(.+?)`/g, '<code>$1</code>');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && isConnected) {
      // Add message to UI immediately
      setMessages(prev => [...prev, { 
        text: inputMessage, 
        sender: 'user',
        timestamp: new Date().toISOString()
      }]);
      
      // Send message via WebSocket
      guestChatService.sendMessage(inputMessage, conversationId);
      setInputMessage('');
    } else if (!isConnected) {
      alert('Chưa kết nối đến hệ thống chat. Vui lòng đợi hoặc tải lại trang.');
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-window">
          <div className="chat-widget-header">
            <div className="chat-header-content">
              <div className="chat-header-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="chat-header-info">
                <h3>Hỗ trợ khách hàng</h3>
                <span className="chat-status">
                  {getConnectionStatus()}
                </span>
              </div>
            </div>
            <button className="chat-close-btn" onClick={toggleChat}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div className="chat-widget-messages" ref={messagesContainerRef}>
            {messages.map((msg, index) => (
              <div key={`${msg.timestamp}-${index}`} className={`chat-message ${msg.sender}`}>
                {msg.sender === 'support' && (
                  <div className="message-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                )}
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="message-text" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                    {msg.isStreaming && <span className="streaming-cursor">▊</span>}
                  </div>
                  <div className="message-time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-widget-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder={isConnected ? "Nhập tin nhắn..." : "Đang kết nối..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={!isConnected}
            />
            <button type="submit" disabled={!isConnected || !inputMessage.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button 
        className={`chat-widget-button ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label="Chat support"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        )}
        {!isOpen && <span className="chat-notification-badge">1</span>}
      </button>
    </>
  );
};
