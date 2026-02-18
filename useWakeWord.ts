import { useState, useEffect, useRef, useCallback } from 'react';

export const useWakeWord = (onWake: () => void, isListening: boolean) => {
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();
      
      console.log("Wake word listener heard:", transcript);

      if (transcript.includes('mayra') || transcript.includes('myra') || transcript.includes('mira')) {
        console.log("Wake word detected!");
        onWake();
      }
    };

    recognition.onend = () => {
      // Auto-restart if it's supposed to be active
      if (recognitionRef.current && isListening) {
        try {
          recognition.start();
        } catch (e) {
          // ignore already started errors
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.log("Wake word error", event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [onWake, isListening]);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsWakeWordActive(true);
      } catch (e) {
        console.log("Recognition already started");
      }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsWakeWordActive(false);
    }
  }, [isListening]);

  return { isWakeWordActive };
};