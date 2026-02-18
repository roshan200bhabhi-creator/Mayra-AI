import React, { useEffect, useRef } from 'react';
import { Message } from '../types';

interface ChatPanelProps {
  messages: Message[];
  isOpen: boolean;
  isMobile: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isOpen, isMobile }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // CSS classes for responsiveness
  // Mobile: Absolute overlay, z-index high, glass effect
  // Desktop: Relative width, transition width/opacity
  const containerClasses = isMobile
    ? `absolute inset-0 z-40 bg-black/80 backdrop-blur-md pt-20 pb-10 px-4 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`
    : `relative h-full border-l border-white/5 bg-black/20 backdrop-blur-sm transition-all duration-500 ease-in-out ${isOpen ? 'w-[400px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10 overflow-hidden'}`;

  return (
    <div className={containerClasses}>
        
        {/* Scrollable Area */}
        <div 
            ref={scrollRef}
            className={`
              h-full overflow-y-auto space-y-6 scroll-smooth pr-2
              ${isMobile ? '' : 'p-6'} 
            `}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} 
        >
            {messages.length === 0 && isOpen && (
               <div className="h-full flex items-center justify-center text-white/20 text-sm italic">
                  Conversation history will appear here
               </div>
            )}

            {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
                >
                    <div 
                        className={`
                            max-w-[85%] px-5 py-3 rounded-2xl backdrop-blur-xl shadow-lg border text-sm md:text-base leading-relaxed
                            ${msg.sender === 'user' 
                                ? 'bg-white/10 text-white border-white/10 rounded-tr-sm' 
                                : 'bg-[#1a0b2e]/60 text-pink-50 border-purple-500/20 rounded-tl-sm'
                            }
                        `}
                    >
                        {msg.text}
                        
                        {/* Render Search Sources (Grounding) */}
                        {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Sources</span>
                            <div className="flex flex-wrap gap-2">
                              {msg.groundingChunks.map((chunk, idx) => (
                                chunk.web?.uri && (
                                  <a 
                                    key={idx}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-blue-300 bg-blue-900/30 px-2 py-1 rounded hover:bg-blue-800/40 transition-colors truncate max-w-full"
                                  >
                                    {chunk.web.title || new URL(chunk.web.uri).hostname}
                                  </a>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1.5 px-1 uppercase tracking-widest font-medium opacity-60">
                        {msg.sender === 'user' ? 'You' : 'Mayra'}
                    </span>
                </div>
            ))}
        </div>
        
        {/* Bottom Fade Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
};

export default ChatPanel;