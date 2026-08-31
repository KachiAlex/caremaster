/**
 * Voice-to-Text Input Component
 * 
 * Provides speech recognition for text input fields
 * Uses Web Speech API for browser-based speech recognition
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

const VoiceToTextInput = ({
  value = '',
  onChange,
  placeholder = 'Click microphone to start dictation...',
  disabled = false,
  language = 'en-US',
  continuous = false,
  interimResults = true
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(value);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Listening...', { autoClose: 4000 });
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        finalTranscriptRef.current = finalTranscript;
        const newValue = finalTranscript + interimTranscript;
        setTranscript(newValue);
        if (onChange) {
          onChange(newValue);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition aborted';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your microphone.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          default:
            errorMessage = `Error: ${event.error}`;
        }
        
        toast.error(errorMessage);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (continuous) {
          // Restart if continuous mode
          if (isListening) {
            try {
              recognition.start();
            } catch (error) {
              console.warn('Could not restart recognition:', error);
            }
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [language, continuous, interimResults, isListening]);

  useEffect(() => {
    setTranscript(value);
    finalTranscriptRef.current = value;
  }, [value]);

  const startListening = () => {
    if (!isSupported) {
      toast.error('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (recognitionRef.current) {
      try {
        finalTranscriptRef.current = transcript;
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error('Could not start speech recognition');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    finalTranscriptRef.current = '';
    if (onChange) {
      onChange('');
    }
    toast.info('Transcript cleared');
  };

  if (!isSupported) {
    return (
      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            if (onChange) onChange(e.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
        />
        <div className="mt-2 text-xs text-gray-500">
          Speech recognition not supported. Please use Chrome, Edge, or Safari.
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <textarea
        value={transcript}
        onChange={(e) => {
          setTranscript(e.target.value);
          if (onChange) onChange(e.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled || isListening}
        className={`w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          isListening ? 'bg-blue-50 border-blue-300' : ''
        }`}
        rows={4}
      />
      
      {/* Voice Control Buttons */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        {isListening ? (
          <>
            <button
              onClick={stopListening}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
              title="Stop listening"
            >
              <Square className="h-4 w-4" />
            </button>
            <div className="p-2 bg-red-100 rounded-lg animate-pulse">
              <Mic className="h-4 w-4 text-red-600" />
            </div>
          </>
        ) : (
          <>
            <button
              onClick={startListening}
              disabled={disabled}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Start voice input"
            >
              <Mic className="h-4 w-4" />
            </button>
            {transcript && (
              <button
                onClick={clearTranscript}
                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                title="Clear text"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
      
      {isListening && (
        <div className="absolute top-2 right-2">
          <div className="px-2 py-1 bg-red-600 text-white text-xs rounded-full animate-pulse">
            Listening...
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceToTextInput;

