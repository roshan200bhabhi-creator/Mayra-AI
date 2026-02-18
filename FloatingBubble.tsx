import React, { useState, useRef, useEffect } from 'react';
import { ConnectionState } from '../types';

interface FloatingBubbleProps {
  connectionState: ConnectionState;
  volume: number;
  onTap: () => void;
  onDoubleTap: () => void;
}

const FloatingBubble: React.FC<FloatingBubbleProps> = ({ connectionState, volume, onTap, onDoubleTap }) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight / 2 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{x: number, y: number} | null>(null);
  
  // Double tap detection
  const lastTapRef = useRef<number>(0);

  // Dynamic visuals
  // Pulse scale based on volume when connected
  const pulseScale = isConnected ? 1 + (volume * 1.5) : 1;
  const glowOpacity = isConnected ? 0.3 + (volume * 0.7) : 0.1;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    // Capture pointer to track movement even outside element
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartRef.current) {
      setIsDragging(true);
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    dragStartRef.current = null;
    
    // Tap detection logic (only if not dragged significantly)
    if (!isDragging) {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        onDoubleTap();
      } else {
        onTap();
      }
      lastTapRef.current = now;
    }
    setIsDragging(false);
  };

  return (
    <div 
      className="fixed z-50 touch-none cursor-pointer"
      style={{ 
        left: position.x, 
        top: position.y,
        transform: 'translate(-50%, -50%)' // Center the bubble on the coordinate
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Outer Pulse Rings (Only when connected) */}
      {isConnected && (
        <>
          <div 
            className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/30 animate-[ping_2s_ease-out_infinite]" 
            style={{ opacity: volume }}
          />
           <div 
            className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-xl transition-all duration-100" 
            style={{ transform: `translate(-50%, -50%) scale(${pulseScale * 1.2})`, opacity: glowOpacity }}
          />
        </>
      )}

      {/* Main Bubble Core */}
      <div 
        className={`
          relative flex items-center justify-center rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 ease-out
          ${isConnected ? 'w-20 h-20 bg-gradient-to-br from-[#2e1065] to-[#4c1d95] border border-purple-400/50' : 'w-16 h-16 bg-black/60 border border-white/10 hover:bg-black/80'}
          ${isConnecting ? 'animate-pulse' : ''}
        `}
        style={{
          transform: isConnected ? `scale(${pulseScale})` : 'scale(1)',
          boxShadow: isConnected ? `0 0 ${20 + volume * 20}px rgba(168, 85, 247, ${glowOpacity})` : '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {/* Inner visual */}
        {isConnected ? (
          // Active Voice Visual
          <div className="flex gap-1 items-center justify-center h-full">
             <div className="w-1 bg-white/80 rounded-full animate-bounce" style={{ height: `${20 + volume * 30}%`, animationDelay: '0ms' }} />
             <div className="w-1 bg-white/80 rounded-full animate-bounce" style={{ height: `${30 + volume * 50}%`, animationDelay: '100ms' }} />
             <div className="w-1 bg-white/80 rounded-full animate-bounce" style={{ height: `${20 + volume * 30}%`, animationDelay: '200ms' }} />
          </div>
        ) : (
          // Idle Icon (M)
          <span className="text-white/80 font-light text-xl tracking-wider select-none">
            M
          </span>
        )}
      </div>

      {/* Status Label (optional, fades out) */}
      {!isConnected && !isConnecting && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-black/40 backdrop-blur text-[10px] text-white/50 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
          Standby
        </div>
      )}
    </div>
  );
};

export default FloatingBubble;