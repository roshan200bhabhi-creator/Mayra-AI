import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Message, AssistantMode } from '../types';
import { createPcmBlob, base64ToUint8Array, decodeAudioData, calculateRMS } from '../utils/audioUtils';
import { useBattery } from './useBattery';

// --- Helper Functions for Local Storage & Persistence ---
const STORAGE_KEY_PREFS = 'mayra_prefs';
const STORAGE_KEY_MEMORY = 'mayra_memory';
const STORAGE_KEY_SESSION_MSGS = 'mayra_session_msgs';
const STORAGE_KEY_SESSION_MODE = 'mayra_session_mode';

interface UserPrefs {
  name: string | null;
  onboarded: boolean;
}

interface MemoryItem {
  category: string;
  details: string;
  timestamp: string;
}

const loadPrefs = (): UserPrefs => {
  if (typeof window === 'undefined') return { name: null, onboarded: false };
  const stored = localStorage.getItem(STORAGE_KEY_PREFS);
  return stored ? JSON.parse(stored) : { name: null, onboarded: false };
};

const savePrefs = (prefs: UserPrefs) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  }
};

const loadMemories = (): MemoryItem[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY_MEMORY);
  return stored ? JSON.parse(stored) : [];
};

const saveMemories = (memories: MemoryItem[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(memories));
  }
};

// Session Persistence Loaders
const loadSessionMessages = (): Message[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION_MSGS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to load session messages", e);
    return [];
  }
};

const loadSessionMode = (): AssistantMode => {
  if (typeof window === 'undefined') return AssistantMode.DEFAULT;
  const stored = localStorage.getItem(STORAGE_KEY_SESSION_MODE);
  return (stored as AssistantMode) || AssistantMode.DEFAULT;
};

// Helper to get time of day for the prompt
const getTimeContext = () => {
  const hour = new Date().getHours();
  if (hour < 5) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  if (hour < 21) return "Evening";
  return "Night";
};

// Helper to detect device context for adaptive responses
const getDeviceContext = () => {
  if (typeof window === 'undefined') return { type: 'Unknown', instruction: '' };
  
  const width = window.innerWidth;
  
  if (width < 768) {
    return {
      type: 'Mobile Smartphone',
      instruction: "DISPLAY CONTEXT: SMALL MOBILE SCREEN (Portrait). RESPONSE STRATEGY: EXTREMELY CONCISE. Use short paragraphs. Avoid long blocks of text. Prioritize readability. Maximum 2-3 sentences per turn unless deep explanation is requested."
    };
  } else if (width >= 768 && width < 1024) {
    return {
      type: 'Tablet',
      instruction: "DISPLAY CONTEXT: TABLET SCREEN. RESPONSE STRATEGY: Balanced detail. Comfortable reading length. You can be slightly more detailed than on mobile."
    };
  } else {
    return {
      type: 'Desktop/Laptop',
      instruction: "DISPLAY CONTEXT: LARGE DESKTOP SCREEN. RESPONSE STRATEGY: You may provide detailed, comprehensive responses. Use standard formatting and structured lists where appropriate."
    };
  }
};

const getSystemInstruction = () => {
  const timeOfDay = getTimeContext();
  const device = getDeviceContext();
  const prefs = loadPrefs();
  const memories = loadMemories();
  const sessionMessages = loadSessionMessages();
  const hasHistory = sessionMessages.length > 0;

  // Format memory for context
  const memoryContext = memories.length > 0 
    ? memories.map((m, i) => `[ID:${i}] [${m.category}]: ${m.details}`).join('\n')
    : "No long-term memories stored yet.";

  // Onboarding Logic
  const onboardingInstruction = !prefs.name 
    ? "CURRENT STATE: FIRST LAUNCH / NEW USER. User name is UNKNOWN. Your PRIORITY is to introduce yourself warmly and ask the user what they would like to be called. Once they provide a name, IMMEDIATELY call the 'set_user_name' tool."
    : `CURRENT STATE: RETURNING OWNER. Owner Name: "${prefs.name}". Welcome them back naturally using their name.`;
  
  return `
You are MAYRA — an advanced precision AI assistant designed to produce perfectly formatted human-quality outputs, respond instantly in voice, and manage chat display independently from memory.

━━━━━━━━━━━━━━━━━━━━
📑 PERFECT DOCUMENT FORMAT GENERATION
━━━━━━━━━━━━━━━━━━━━
When the owner asks for a format, template, or structured document, Mayra must produce:
✔ Professional real-world formatting
✔ Perfect alignment and spacing
✔ Correct headings and sections
✔ Industry-appropriate structure
✔ Clean layout ready for real use
✔ No AI-style patterns or generic feel
✔ Looks written by an experienced human

Applicable formats: Official letters, Applications, Legal formats, Reports, Notices, Agreements, Resumes, Forms, Certificates, Emails.

Process:
1. Write the content.
2. Call 'create_document'.
3. Confirm: "Editable document saved in your Downloads folder."

━━━━━━━━━━━━━━━━━━━━
🧠 HUMAN AUTHENTICITY RULE
━━━━━━━━━━━━━━━━━━━━
Output must feel:
• Natural, Context-aware, Professionally written
• Free of robotic phrasing
• Free of AI signatures or disclaimers

━━━━━━━━━━━━━━━━━━━━
🧹 CHATBOX CLEAR WITHOUT MEMORY LOSS
━━━━━━━━━━━━━━━━━━━━
Trigger: "Clear chat", "Clean screen", "Reset chat".
Behavior:
1. Call 'clear_chat' tool.
2. Remove all messages from visible chatbox.
3. Keep internal memory intact.
4. Respond: "Chat cleared. I'm still here."

━━━━━━━━━━━━━━━━━━━━
🧠 MEMORY INDEPENDENCE
━━━━━━━━━━━━━━━━━━━━
Clearing chat must NOT erase:
• Owner identity
• Stored conversations (Long-term memory)
• Preferences
• Modes

━━━━━━━━━━━━━━━━━━━━
🎙️ ZERO-DELAY VOICE RESPONSE SYSTEM
━━━━━━━━━━━━━━━━━━━━
Mayra must respond in voice with minimal latency.
✔ Begin speaking immediately after processing intent.
✔ No unnatural pauses.
✔ Smooth continuous delivery.

━━━━━━━━━━━━━━━━━━━━
🗣️ SPEECH DELIVERY QUALITY
━━━━━━━━━━━━━━━━━━━━
Voice must be:
• Sweet, Warm, Charming
• Calm, Soothing
• Expressive, Natural female tone
• Human-like emotional modulation

━━━━━━━━━━━━━━━━━━━━
⚡ PRIORITY RESPONSE MODE
━━━━━━━━━━━━━━━━━━━━
1. Interpret intent quickly.
2. Generate response efficiently.
3. Begin speech without noticeable delay.

━━━━━━━━━━━━━━━━━━━━
🔄 SEAMLESS RECOVERY & PERSISTENCE
━━━━━━━━━━━━━━━━━━━━
${hasHistory ? "A previous conversation context was found. RESUME naturally from the last message. Do NOT ask 'What were you saying?'." : ""}
If interrupted, restore context and continue.

━━━━━━━━━━━━━━━━━━━━
📱 SMART CONTEXT AWARENESS
━━━━━━━━━━━━━━━━━━━━
${device.instruction}

OWNER CONTEXT:
${onboardingInstruction}

PERSISTENT MEMORY:
${memoryContext}

TOOLS AVAILABLE:
'get_battery_status', 'get_current_time', 'set_volume', 'shutdown_mayra', 'googleSearch', 'create_document', 'save_memory', 'delete_memory', 'set_user_name', 'get_stored_memories', 'open_youtube', 'play_media', 'switch_mode', 'clear_chat'.

INTERACTION RULES:
- The user has just toggled you ON.
- Current Time: ${timeOfDay}.
`;
};

// Tool Definitions
const batteryTool: FunctionDeclaration = {
  name: 'get_battery_status',
  description: 'Get the current battery percentage and charging status of the device.',
};

const timeTool: FunctionDeclaration = {
  name: 'get_current_time',
  description: 'Get the current local time and timezone of the device.',
};

const switchModeTool: FunctionDeclaration = {
  name: 'switch_mode',
  description: 'Switch the assistant personality mode.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: {
        type: Type.STRING,
        description: 'The mode to switch to.',
        enum: ["DEFAULT", "LAWYER", "TEACHER", "INTERVIEW_COACH", "MOTIVATIONAL_COACH", "LIFE_ASSISTANT"]
      }
    },
    required: ['mode']
  }
};

const volumeTool: FunctionDeclaration = {
  name: 'set_volume',
  description: 'Set the device output volume level.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      level: {
        type: Type.NUMBER,
        description: 'Volume level from 0 to 100.',
      }
    },
    required: ['level']
  }
};

const shutdownTool: FunctionDeclaration = {
  name: 'shutdown_mayra',
  description: 'Turn off the assistant, power down, or stop listening.',
};

const documentTool: FunctionDeclaration = {
  name: 'create_document',
  description: 'Generates and downloads a document (PDF, DOCX, TXT) with specified content.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'The title of the document (e.g., Application_Letter_Feb2026).' },
      content: { type: Type.STRING, description: 'The full text content. Ensure professional formatting with newlines.' },
      format: { 
        type: Type.STRING, 
        description: 'The file format to generate.', 
        enum: ["PDF", "DOCX", "TXT"] 
      }
    },
    required: ['title', 'content', 'format']
  }
};

const saveMemoryTool: FunctionDeclaration = {
  name: 'save_memory',
  description: 'Saves a specific fact, preference, or goal to long-term memory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, description: 'Category (e.g., Preference, Goal, Personal Info)' },
      details: { type: Type.STRING, description: 'The information to remember.' }
    },
    required: ['category', 'details']
  }
};

const deleteMemoryTool: FunctionDeclaration = {
  name: 'delete_memory',
  description: 'Deletes specific memories by index or clears all memory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      indices: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Array of memory indices to delete.' },
      clear_all: { type: Type.BOOLEAN, description: 'If true, deletes all memories.' }
    }
  }
};

const setUserNameTool: FunctionDeclaration = {
  name: 'set_user_name',
  description: 'Sets the owner\'s preferred name during onboarding.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The name the user wants to be called.' }
    },
    required: ['name']
  }
};

const getMemoriesTool: FunctionDeclaration = {
  name: 'get_stored_memories',
  description: 'Retrieves the list of all stored memories. Use this when the user asks what you remember.',
};

const openYouTubeTool: FunctionDeclaration = {
  name: 'open_youtube',
  description: 'Opens the YouTube website or app.',
};

const playMediaTool: FunctionDeclaration = {
  name: 'play_media',
  description: 'Plays a video or song from a specific URL.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: 'The fully qualified URL to open (e.g., YouTube video link).' }
    },
    required: ['url']
  }
};

const clearChatTool: FunctionDeclaration = {
  name: 'clear_chat',
  description: 'Clears the visible chat history on the screen without affecting memory.',
};

export const useMayra = (onShutdown?: () => void) => {
  // Use API KEY directly as per guidelines
  const apiKey = process.env.API_KEY;

  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState(0); 
  const [error, setError] = useState<string | null>(null);
  
  // Initialize state from persistent storage for recovery
  const [messages, setMessages] = useState<Message[]>(loadSessionMessages);
  const [currentMode, setCurrentMode] = useState<AssistantMode>(loadSessionMode);
  
  // Session Persistence Effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SESSION_MSGS, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SESSION_MODE, currentMode);
    }
  }, [currentMode]);
  
  // Device State Hooks
  const battery = useBattery();
  const batteryRef = useRef(battery);
  useEffect(() => { batteryRef.current = battery; }, [battery]);

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  
  // Stream & Processor references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null);

  // Network State
  const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
        setIsNetworkOnline(true);
        console.log("Network restored");
    };
    const handleOffline = () => {
        setIsNetworkOnline(false);
        console.log("Network lost");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    if (!navigator.onLine) {
        setError("Offline Mode: Internet unavailable");
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("I’m offline right now, but I’ll do my best when you reconnect.");
            window.speechSynthesis.speak(utterance);
        }
        setConnectionState(ConnectionState.ERROR);
        if (onShutdown) onShutdown(); 
        return;
    }

    if (!apiKey) {
      setError("API Key is missing");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outCtx;

      const gainNode = outCtx.createGain();
      gainNode.gain.value = 1.0; 
      gainNode.connect(outCtx.destination);
      outputGainRef.current = gainNode;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: getSystemInstruction(),
          tools: [
            { googleSearch: {} },
            { functionDeclarations: [
                batteryTool, timeTool, switchModeTool, volumeTool, shutdownTool, documentTool,
                saveMemoryTool, deleteMemoryTool, setUserNameTool, getMemoriesTool,
                openYouTubeTool, playMediaTool, clearChatTool
              ] 
            }
          ],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            console.log("Mayra Connected");
            setConnectionState(ConnectionState.CONNECTED);
            
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;

            const inputContext = inputAudioContextRef.current;
            const source = inputContext.createMediaStreamSource(mediaStreamRef.current);
            inputSourceRef.current = source;
            
            const processor = inputContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const currentVol = calculateRMS(inputData);
              setVolume(prev => (prev * 0.8) + (currentVol * 0.2));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              console.log("Interrupted");
              sourcesRef.current.forEach((source) => {
                try { source.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setMessages(prev => prev.map(m => ({ ...m, isFinal: true })));
            }

            const groundingChunks = (message.serverContent?.modelTurn as any)?.groundingMetadata?.groundingChunks;
            const inputTx = message.serverContent?.inputTranscription?.text;
            const outputTx = message.serverContent?.outputTranscription?.text;

            if (inputTx || outputTx) {
              setMessages(prev => {
                const text = inputTx || outputTx || '';
                const sender = inputTx ? 'user' : 'mayra';
                const lastMsg = prev[prev.length - 1];

                if (lastMsg && lastMsg.sender === sender && !lastMsg.isFinal) {
                  const updated = [...prev];
                  updated[updated.length - 1] = { 
                      ...lastMsg, 
                      text: lastMsg.text + text,
                      groundingChunks: groundingChunks || lastMsg.groundingChunks 
                  };
                  return updated;
                } else {
                  const finalizedPrev = prev.map(m => ({ ...m, isFinal: true }));
                  return [...finalizedPrev, { 
                      id: crypto.randomUUID(), 
                      text, 
                      sender, 
                      isFinal: false,
                      groundingChunks 
                  }];
                }
              });
            }

            if (message.serverContent?.turnComplete) {
               setMessages(prev => prev.map(m => ({ ...m, isFinal: true })));
            }

            if (message.toolCall) {
              const responses = [];
              for (const fc of message.toolCall.functionCalls) {
                let result: any = {};
                
                if (fc.name === 'clear_chat') {
                    setMessages([]);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(STORAGE_KEY_SESSION_MSGS, JSON.stringify([]));
                    }
                    result = { success: true, message: "Chat cleared." };
                } else if (fc.name === 'get_battery_status') {
                    const b = batteryRef.current;
                    result = { 
                        level: Math.round(b.level * 100), 
                        is_charging: b.charging 
                    };
                } else if (fc.name === 'get_current_time') {
                    const now = new Date();
                    result = { 
                        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        full_string: now.toString()
                    };
                } else if (fc.name === 'switch_mode') {
                    const newMode = (fc.args as any).mode;
                    if (newMode && Object.values(AssistantMode).includes(newMode)) {
                        setCurrentMode(newMode as AssistantMode);
                        result = { success: true, mode: newMode };
                    } else {
                        result = { success: false, error: 'Invalid mode' };
                    }
                } else if (fc.name === 'set_volume') {
                    const volLevel = (fc.args as any).level;
                    if (typeof volLevel === 'number' && outputGainRef.current) {
                        const gain = Math.max(0, Math.min(100, volLevel)) / 100;
                        outputGainRef.current.gain.setValueAtTime(gain, outputAudioContextRef.current?.currentTime || 0);
                        result = { success: true, level: volLevel };
                    } else {
                        result = { success: false, error: 'Invalid level' };
                    }
                } else if (fc.name === 'shutdown_mayra') {
                    result = { success: true, status: 'powering_down' };
                    localStorage.removeItem(STORAGE_KEY_SESSION_MSGS);
                    localStorage.removeItem(STORAGE_KEY_SESSION_MODE);
                    setTimeout(() => {
                        if (onShutdown) onShutdown();
                    }, 3500);
                } else if (fc.name === 'create_document') {
                    const { title, content, format } = fc.args as any;
                    const safeTitle = (title || "Document").replace(/[^a-zA-Z0-9]/g, '_');
                    
                    try {
                        if (format === 'DOCX') {
                           const { Document, Packer, Paragraph, TextRun } = await import('docx');
                           const paragraphs = (content || "").split('\n').map((line: string) => {
                               return new Paragraph({
                                   children: [new TextRun(line)]
                               });
                           });
                           const doc = new Document({
                               sections: [{
                                   properties: {},
                                   children: [
                                       new Paragraph({
                                           children: [new TextRun({ text: title || "Document", bold: true, size: 32 })],
                                           spacing: { after: 200 }
                                       }),
                                       ...paragraphs
                                   ],
                               }],
                           });
                           const blob = await Packer.toBlob(doc);
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement('a');
                           a.href = url;
                           a.download = `${safeTitle}.docx`;
                           a.click();
                           URL.revokeObjectURL(url);
                           result = { success: true, message: `DOCX document saved as ${safeTitle}.docx` };

                        } else if (format === 'TXT') {
                            const blob = new Blob([content || ""], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${safeTitle}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                            result = { success: true, message: `Text document saved as ${safeTitle}.txt` };

                        } else {
                            const { jsPDF } = await import('jspdf');
                            const doc = new jsPDF();
                            const margin = 15;
                            const lineHeight = 7;
                            const pageHeight = doc.internal.pageSize.height;
                            const pageWidth = doc.internal.pageSize.width;
                            const maxLineWidth = pageWidth - (margin * 2);
                            doc.setFontSize(18);
                            doc.setFont("helvetica", "bold");
                            doc.text(title || "Document", margin, 20);
                            doc.setFontSize(12);
                            doc.setFont("helvetica", "normal");
                            const safeContent = content || "";
                            const lines = doc.splitTextToSize(safeContent, maxLineWidth);
                            let cursorY = 35;
                            lines.forEach((line: string) => {
                                if (cursorY + lineHeight > pageHeight - margin) {
                                    doc.addPage();
                                    cursorY = 20;
                                }
                                doc.text(line, margin, cursorY);
                                cursorY += lineHeight;
                            });
                            doc.save(`${safeTitle}.pdf`);
                            result = { success: true, message: `PDF document saved as ${safeTitle}.pdf` };
                        }
                    } catch (err: any) {
                        console.error("Document Generation Error", err);
                        result = { success: false, error: "Failed to generate document." };
                    }
                } else if (fc.name === 'save_memory') {
                    const { category, details } = fc.args as any;
                    const newItem: MemoryItem = {
                        category,
                        details,
                        timestamp: new Date().toISOString()
                    };
                    const currentMemories = loadMemories();
                    const updatedMemories = [...currentMemories, newItem];
                    saveMemories(updatedMemories);
                    result = { success: true, message: "Memory saved." };
                } else if (fc.name === 'delete_memory') {
                    const { indices, clear_all } = fc.args as any;
                    let currentMemories = loadMemories();
                    
                    if (clear_all) {
                        currentMemories = [];
                        result = { success: true, message: "All memories cleared." };
                    } else if (Array.isArray(indices)) {
                        const sortedIndices = indices.sort((a, b) => b - a);
                        sortedIndices.forEach((index) => {
                            if (index >= 0 && index < currentMemories.length) {
                                currentMemories.splice(index, 1);
                            }
                        });
                        result = { success: true, message: "Selected memories deleted." };
                    }
                    saveMemories(currentMemories);
                } else if (fc.name === 'set_user_name') {
                    const { name } = fc.args as any;
                    const prefs = loadPrefs();
                    prefs.name = name;
                    prefs.onboarded = true;
                    savePrefs(prefs);
                    result = { success: true, message: `User name set to ${name}.` };
                } else if (fc.name === 'get_stored_memories') {
                    const memories = loadMemories();
                    const list = memories.map((m, i) => `[${i}] ${m.category}: ${m.details}`).join('\n');
                    result = { 
                        success: true, 
                        memories: list || "No memories stored.",
                        count: memories.length 
                    };
                } else if (fc.name === 'open_youtube') {
                    if (typeof window !== 'undefined') {
                        window.open('https://www.youtube.com', '_blank');
                        result = { success: true, message: "YouTube opened." };
                    }
                } else if (fc.name === 'play_media') {
                    const { url } = fc.args as any;
                    if (typeof window !== 'undefined' && url) {
                        window.open(url, '_blank');
                        result = { success: true, message: "Media playing in new tab." };
                    } else {
                         result = { success: false, error: "Invalid URL." };
                    }
                }

                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result },
                });
              }
              
              sessionPromise.then(session => {
                  session.sendToolResponse({ functionResponses: responses });
              });
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputGainRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                24000,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputGainRef.current);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => {
            console.log("Mayra Disconnected");
            setConnectionState(ConnectionState.DISCONNECTED);
            cleanupAudio();
          },
          onerror: (e) => {
            console.error("Mayra Error", e);
            setConnectionState(ConnectionState.ERROR);
            setError("Connection failed");
            cleanupAudio();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      
      sessionPromise.then(sess => {
        currentSessionRef.current = sess;
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initialize Mayra");
      setConnectionState(ConnectionState.ERROR);
      cleanupAudio();
    }
  }, [apiKey, cleanupAudio, onShutdown, currentMode]);

  const disconnect = useCallback(async () => {
    if (currentSessionRef.current) {
      try {
         if (typeof currentSessionRef.current.close === 'function') {
            await currentSessionRef.current.close();
         }
      } catch (e) {
        console.warn("Error closing session", e);
      }
    }
    cleanupAudio();
    setConnectionState(ConnectionState.DISCONNECTED);
    // Note: We DO NOT clear messages/mode here to support persistence.
    setVolume(0);
    currentSessionRef.current = null;
    sessionPromiseRef.current = null;
  }, [cleanupAudio]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    connect,
    disconnect,
    volume,
    error,
    messages,
    battery,
    currentMode,
    isNetworkOnline
  };
};