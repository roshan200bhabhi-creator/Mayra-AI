import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ToggleButton from './components/ToggleButton';
import MayraVisualizer from './components/MayraVisualizer';
import ChatPanel from './components/ChatPanel';
import { useMayra } from './hooks/useMayra';
import { ConnectionState, AssistantMode } from './types';

const App: React.FC = () => {
  const [isOn, setIsOn] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Callback passed to hook to allow AI to turn itself off
  const handleShutdown = useCallback(() => {
    setIsOn(false);
  }, []);

  const { connect, disconnect, connectionState, volume, error, messages, currentMode, isNetworkOnline } = useMayra(handleShutdown);

  // Handle Resize for Responsive Layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-open chat on desktop, auto-close on mobile
      if (!mobile) {
        setIsChatOpen(true);
      } else {
        setIsChatOpen(false);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggle = () => {
    setIsOn(!isOn);
  };

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  // React to toggle state changes and Network Auto-Recovery
  useEffect(() => {
    if (isOn) {
      // Connect if disconnected
      if (connectionState === ConnectionState.DISCONNECTED) {
        connect();
      }
      
      // Auto-Recovery: If network comes back and we were disconnected/errored, retry
      if (isNetworkOnline && (connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR)) {
        connect();
      }
    } else {
      if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
        disconnect();
      }
    }
  }, [isOn, connect, disconnect, connectionState, isNetworkOnline]);

  // Determine background colors based on mode
  const modeColors = useMemo(() => {
    switch (currentMode) {
        case AssistantMode.LAWYER:
            return { primary: 'bg-blue-900/20', secondary: 'bg-indigo-900/10' };
        case AssistantMode.TEACHER:
            return { primary: 'bg-green-900/20', secondary: 'bg-emerald-900/10' };
        case AssistantMode.INTERVIEW_COACH:
            return { primary: 'bg-slate-800/20', secondary: 'bg-gray-800/10' };
        case AssistantMode.MOTIVATIONAL_COACH:
            return { primary: 'bg-amber-900/20', secondary: 'bg-orange-900/10' };
        case AssistantMode.LIFE_ASSISTANT:
            return { primary: 'bg-teal-900/20', secondary: 'bg-cyan-900/10' };
        case AssistantMode.DEFAULT:
        default:
            return { primary: 'bg-purple-900/20', secondary: 'bg-blue-900/10' };
    }
  }, [currentMode]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
        
      {/* Background Ambient Gradient - Adapts to Mode */}
      <div className="absolute inset-0 pointer-events-none transition-colors duration-1000">
        <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] transition-all duration-1000 ${modeColors.primary} ${isOn ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] transition-all duration-1000 ${modeColors.secondary} ${isOn ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Top Controls */}
      <ToggleButton 
        isOn={isOn} 
        onToggle={handleToggle} 
        disabled={connectionState === ConnectionState.CONNECTING}
      />

      {/* Mobile Chat Toggle Button */}
      {isMobile && (
        <button 
          onClick={handleChatToggle}
          className={`absolute top-6 right-6 z-50 p-2 rounded-full transition-all duration-300 ${isChatOpen ? 'bg-white/20 text-white' : 'bg-transparent text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        </button>
      )}

      {/* Main Layout */}
      <div className="flex w-full h-full relative">
        
        {/* Visualizer Container */}
        {/* On Desktop: Shifts left when chat is open. On Mobile: Always centered (chat overlays) */}
        <div className={`
            flex-1 flex items-center justify-center transition-all duration-500
            ${!isMobile && isChatOpen ? 'w-[calc(100%-400px)]' : 'w-full'}
        `}>
             <MayraVisualizer 
                connectionState={connectionState} 
                volume={volume} 
                mode={currentMode}
            />
        </div>

        {/* Chat Panel - Responsive Implementation */}
        <ChatPanel 
          messages={messages} 
          isOpen={isChatOpen} 
          isMobile={isMobile}
        />
        
      </div>

      {/* Network Status Indicator (Subtle) */}
      {!isNetworkOnline && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-600/20 text-red-200 px-4 py-2 rounded-lg border border-red-600/40 z-50 backdrop-blur-md animate-pulse">
            No Internet Connection
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-red-900/50 border border-red-700/50 rounded-lg backdrop-blur-sm max-w-sm text-center z-50">
            <p className="text-red-200 text-sm">{error}</p>
            <button 
                onClick={() => setIsOn(false)} 
                className="mt-2 text-xs text-red-100 underline hover:text-white"
            >
                Reset
            </button>
        </div>
      )}
      
      {/* Footer / Hint */}
      <div className={`absolute bottom-8 left-0 right-0 text-center transition-opacity duration-700 pointer-events-none ${isOn ? 'opacity-0' : 'opacity-40'}`}>
        <p className="text-gray-500 text-sm font-light">Toggle top-left switch to activate Mayra</p>
      </div>

    </div>
  );
};

export default App;