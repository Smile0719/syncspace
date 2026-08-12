import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronDown, ChevronUp, User } from 'lucide-react';
import { ChatMessage, UserPresence } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUser: UserPresence;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  currentUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none">
      {isOpen ? (
        <div className="w-80 h-96 bg-white backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">Room Chat & Logs</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div
                    key={msg.id}
                    className="text-center py-1 text-[11px] text-gray-500 font-mono bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {msg.text}
                  </div>
                );
              }

              const isMe = msg.senderId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: msg.senderColor }}
                    >
                      {msg.senderName}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-slate-900 ${
                      isMe
                                            ? 'bg-violet-600 text-white rounded-tr-none'
                                            : 'bg-gray-100 border border-gray-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-gray-200 text-slate-900 text-xs font-semibold shadow-xl hover:bg-gray-50 transition-all transform hover:scale-105"
        >
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span>Room Chat</span>
          {messages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
          )}
        </button>
      )}
    </div>
  );
};
