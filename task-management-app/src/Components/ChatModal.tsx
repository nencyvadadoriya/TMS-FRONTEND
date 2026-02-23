import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical } from 'lucide-react';
import { chatService } from '../Services/Chat.service';
import type { ChatMessage } from '../Services/Chat.service';
import { userAvatarUrl } from '../utils/avatar';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  } | null;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, selectedUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when user is selected
  useEffect(() => {
    if (isOpen && selectedUser) {
      loadChatHistory();
      inputRef.current?.focus();
    }
  }, [isOpen, selectedUser]);

  // Setup socket listeners
  useEffect(() => {
    if (!isOpen) return;

    // Listen for new messages
    const handleNewMessage = (message: ChatMessage) => {
      // Only add message if it's for current chat
      if (
        (message.senderId === selectedUser?.id && message.receiverId === chatService.getCurrentUser()?.id) ||
        (message.senderId === chatService.getCurrentUser()?.id && message.receiverId === selectedUser?.id)
      ) {
        setMessages(prev => [...prev, message]);
        
        // Mark message as read if it's from the other user
        if (message.senderId === selectedUser?.id) {
          chatService.markMessageAsRead(message.id);
        }
      }
    };

    // Listen for user status changes
    const handleUserStatusChange = (data: { userId: string; online: boolean }) => {
      if (data.userId === selectedUser?.id) {
        setIsOnline(data.online);
      }
    };

    const unsubscribeNewMessage = chatService.onNewMessage(handleNewMessage);
    const unsubscribeStatus = chatService.onUserStatusChange(handleUserStatusChange);

    return () => {
      unsubscribeNewMessage?.();
      unsubscribeStatus?.();
    };
  }, [isOpen, selectedUser]);

  const loadChatHistory = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const history = await chatService.getChatHistory(selectedUser.id);
      const normalized = history.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp as any),
      }));
      setMessages(normalized.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    try {
      const message = await chatService.sendMessage(selectedUser.id, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // You could show an error toast here
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return messageDate.toLocaleDateString();
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [date: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  if (!isOpen || !selectedUser) return null;

  const messageGroups = groupMessagesByDate(messages);
  const currentUser = chatService.getCurrentUser();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative">
              {selectedUser.avatar ? (
                <img
                  src={userAvatarUrl(selectedUser.avatar)}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Online status indicator */}
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                isOnline ? 'bg-green-400' : 'bg-gray-300'
              }`}></div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900">{selectedUser.name}</h3>
              <p className="text-sm text-gray-500">
                {isOnline ? 'Online' : 'Offline'} • {selectedUser.role?.toUpperCase()}
              </p>
            </div>
          </div>
          
          <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start a conversation!</p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-100 px-3 py-1 rounded-full">
                    <span className="text-xs text-gray-600">{date}</span>
                  </div>
                </div>
                
                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message) => {
                    const isFromMe = message.senderId === currentUser?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isFromMe ? 'order-2' : 'order-1'}`}>
                          {!isFromMe && (
                            <p className="text-xs text-gray-500 mb-1">{message.senderName}</p>
                          )}
                          
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isFromMe
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          
                          <div className={`flex items-center space-x-1 mt-1 text-xs text-gray-500 ${
                            isFromMe ? 'justify-end' : 'justify-start'
                          }`}>
                            <span>{formatTime(message.timestamp)}</span>
                            {isFromMe && (
                              <span className={message.read ? 'text-blue-500' : ''}>
                                {message.read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          
          <div ref={messagesEndRef} />
        </div>
      

        {/* Message input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors flex items-center"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
