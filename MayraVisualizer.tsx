import React from 'react';
import { ConnectionState, AssistantMode } from '../types';

interface MayraVisualizerProps {
  connectionState: ConnectionState;
  volume: number; // 0 to ~1
  mode: AssistantMode;
}

const MayraVisualizer: React.FC<MayraVisualizerProps> = ({ connectionState, volume, mode }) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  
  // Calculate dynamic scales based on volume for the "talking" effect
  const baseScale = isConnected ? 1 : 0.85;
  const dynamicScale = baseScale + (volume * 2.5); 

  // Glow intensity
  const glowOpacity = isConnected ? 0.4 + (volume * 0.6) : 0.15;

  // Visual Theme based on Mode
  let mainGradient = 'conic-gradient(from 180deg, #d8b4fe, #f472b6, #c084fc, #d8b4fe)'; // Default (Pink/Purple)
  let glowColor = '232, 121, 249'; // Pink
  let modeLabel = 'MAYRA';
  let modeSubLabel = 'AI COMPANION';

  if (mode === AssistantMode.LAWYER) {
    mainGradient = 'conic-gradient(from 180deg, #60a5fa, #3b82f6, #2563eb, #60a5fa)'; // Blue
    glowColor = '59, 130, 246';
    modeLabel = 'LAWYER MODE';
    modeSubLabel = 'LEGAL EXPERT ACTIVE';
  } else if (mode === AssistantMode.TEACHER) {
    mainGradient = 'conic-gradient(from 180deg, #4ade80, #22c55e, #16a34a, #4ade80)'; // Green
    glowColor = '34, 197, 94';
    modeLabel = 'TEACHER MODE';
    modeSubLabel = 'ACADEMIC INSTRUCTOR ACTIVE';
  } else if (mode === AssistantMode.INTERVIEW_COACH) {
    mainGradient = 'conic-gradient(from 180deg, #64748b, #94a3b8, #475569, #64748b)'; // Slate/Business Blue-Grey
    glowColor = '148, 163, 184';
    modeLabel = 'INTERVIEW COACH';
    modeSubLabel = 'PROFESSIONAL TRAINING ACTIVE';
  } else if (mode === AssistantMode.MOTIVATIONAL_COACH) {
    mainGradient = 'conic-gradient(from 180deg, #f59e0b, #fbbf24, #d97706, #f59e0b)'; // Amber/Orange
    glowColor = '251, 191, 36';
    modeLabel = 'MOTIVATIONAL COACH';
    modeSubLabel = 'INSPIRATION MODULE ACTIVE';
  } else if (mode === AssistantMode.LIFE_ASSISTANT) {
    mainGradient = 'conic-gradient(from 180deg, #14b8a6, #5eead4, #0d9488, #14b8a6)'; // Teal
    glowColor = '45, 212, 191';
    modeLabel = 'LIFE ASSISTANT';
    modeSubLabel = 'PERSONAL ORGANIZER ACTIVE';
  }

  return (
    <div className="relative flex items-center justify-center w-72 h-72">
      {/* Outer Ambient Glow - Warm Purple/Pink or Mode Color */}
      <div 
        className={`absolute w-full h-full rounded-full blur-[60px] transition-all duration-1000 ease-in-out`}
        style={{
          background: `radial-gradient(circle, rgba(${glowColor}, 0.4), rgba(${glowColor}, 0.1))`,
          opacity: isConnected ? 0.6 : 0,
          transform: `scale(${isConnected ? 1.2 : 0.8})`
        }}
      />

      {/* Secondary Pulse Ring */}
      <div 
        className={`absolute w-48 h-48 rounded-full border border-white/20 transition-all duration-300 ease-out`}
        style={{
            transform: `scale(${isConnected ? dynamicScale * 1.2 : 0.9})`,
            opacity: isConnected ? 0.3 + (volume * 0.5) : 0,
            borderColor: `rgba(${glowColor}, 0.4)`
        }}
      />

      {/* Main Core - The "Voice" Identity */}
      <div 
        className={`relative z-10 w-36 h-36 rounded-full transition-all duration-700 ease-out flex items-center justify-center`}
        style={{
            background: isConnected ? mainGradient : 'linear-gradient(135deg, #374151, #1f2937)',
            transform: `scale(${isConnected ? dynamicScale : 1})`,
            boxShadow: isConnected 
                ? `0 0 ${30 + (volume * 60)}px rgba(${glowColor}, ${glowOpacity})` 
                : '0 0 20px rgba(0,0,0,0.5)'
        }}
      >
        {/* Inner Glassy Core */}
        <div className="w-[96%] h-[96%] rounded-full bg-black/10 backdrop-blur-sm relative overflow-hidden">
             <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-white/20 blur-xl rotate-45 transform origin-center animate-pulse" 
                  style={{ opacity: isConnected ? 0.3 : 0 }} 
             />
        </div>
      </div>

      {/* Active Listening Ripple Effects */}
      {isConnected && (
         <>
            <div className={`absolute w-40 h-40 rounded-full border opacity-0 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]`} style={{ borderColor: `rgba(${glowColor}, 0.4)` }} />
            <div className={`absolute w-40 h-40 rounded-full border opacity-0 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] delay-150`} style={{ borderColor: `rgba(${glowColor}, 0.3)` }} />
         </>
      )}

      {/* Status Text below visualizer */}
      <div className="absolute -bottom-24 text-center w-full space-y-2">
        <p className={`text-xl font-light tracking-[0.2em] transition-colors duration-500 uppercase ${isConnected ? 'text-white' : 'text-gray-600'}`}>
          {connectionState === ConnectionState.CONNECTING ? 'CONNECTING...' : 
           connectionState === ConnectionState.CONNECTED ? (volume > 0.05 ? 'LISTENING' : modeLabel) : 
           'OFFLINE'}
        </p>
        {isConnected && (
            <p className="text-[10px] text-white/50 font-medium tracking-[0.3em] uppercase transition-all duration-500">
                {modeSubLabel}
            </p>
        )}
      </div>
    </div>
  );
};

export default MayraVisualizer;