import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Send, Bot, User, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Badge } from "./ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isVoice?: boolean;
}

interface ConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
}

const mockResponses = [
  "That's a great question! Let me clarify: ",
  "To elaborate on that point: ",
  "Here's what I mean by that: ",
  "Let me give you an example: ",
  "Think of it this way: "
];

export function ConversationDialog({ open, onOpenChange, question }: ConversationDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Audio recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [isFetchingGuide, setIsFetchingGuide] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Seed initial assistant message with the latest question when dialog opens
  useEffect(() => {
    if (open) {
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `${question}`,
          isVoice: false
        }
      ]);
    }
  }, [open, question]);

  // Stop recording/TTS when dialog closes
  useEffect(() => {
    if (!open) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecordingAudio(false);
      setTranscribedText("");
      window.speechSynthesis.cancel();
    }
  }, [open]);

  const speakText = (text: string) => {
    if (!text || !open) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const buildHistoryString = (allMessages: Message[]): string => {
    // Exclude the initial assistant message (seed) from history
    const conversational = allMessages.slice(1);
    const parts = conversational.map(m => {
      const speaker = m.role === 'assistant' ? 'interviewer' : 'candidate';
      const safe = m.content.replace(/\"/g, '“').replace(/"/g, '“');
      return `${speaker}: "${safe}"`;
    });
    return `[${parts.join(' ')}]`;
  };

  const callGuideApi = async (mainQuestion: string, historyStr: string, newUserQuery: string): Promise<string> => {
    const response = await fetch('http://127.0.0.1:8000/coach/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ main_question: mainQuestion, history_str: historyStr, new_user_query: newUserQuery }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      // Try common keys (including 'guidance' from your API)
      const value =
        data.guidance ||
        data.answer ||
        data.response ||
        data.text ||
        data.result ||
        data.message ||
        data.guide ||
        data.content || '';
      return value != null ? String(value) : '';
    }
    // Fallback to raw text
    const text = await response.text();
    return text || '';
  };

  const handleSend = async (isVoiceMessage = false) => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      isVoice: isVoiceMessage
    };

    // Push user message immediately
    setMessages(prev => [...prev, userMessage]);

    try {
      setIsFetchingGuide(true);
      const seeded = messages.length ? messages : [{ id: 'seed', role: 'assistant', content: question, isVoice: false } as Message];
      const all = [...seeded, userMessage];
      const historyStr = buildHistoryString(all);
      const guide = await callGuideApi(question, historyStr, input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: (guide && guide.trim().length > 0)
          ? guide
          : (mockResponses[Math.floor(Math.random() * mockResponses.length)] + " I'm here to help with details."),
        isVoice: true,
      };
      setMessages(prev => [...prev, assistantMessage]);
      // Speak the assistant guidance using TTS
      if (assistantMessage.content) {
        speakText(assistantMessage.content);
      }
    } catch (err) {
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I could not fetch guidance right now. Please try again.',
        isVoice: false,
      };
      setMessages(prev => [...prev, assistantMessage]);
      console.error('Guide API error:', err);
    } finally {
      setIsFetchingGuide(false);
      // Auto-scroll to bottom after response
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }

    setInput("");
    setTranscribedText("");
  };

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(false);
    }
  };


  // Audio recording functions (using Web Speech API)
  const startAudioRecording = () => {
    if (isRecordingAudio) return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your question instead.');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTranscribedText(transcript);
      setInput((prev: string) => prev + (prev ? '\n\n' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecordingAudio(false);
    };

    recognition.onend = () => {
      setIsRecordingAudio(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecordingAudio(true);
  };

  const stopAudioRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecordingAudio(false);
  };

  const handlePressStart = () => {
    startAudioRecording();
  };

  const handlePressEnd = () => {
    stopAudioRecording();
  };

  const togglePlayVoice = (messageId: string) => {
    if (isPlayingVoice === messageId) {
      // Stop playing
      setIsPlayingVoice(null);
    } else {
      // Start playing (simulate)
      setIsPlayingVoice(messageId);
      setTimeout(() => {
        setIsPlayingVoice(null);
      }, 3000); // Simulate 3 second voice message
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden min-h-0">
        <DialogHeader>
          <DialogTitle>Ask Follow-up Questions</DialogTitle>
          <DialogDescription>
            Get clarification on the interview question using voice or text
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                    }`}
                >
                  <div className="space-y-2">
                    <p className="text-sm">{message.content}</p>
                    {message.isVoice && message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlayVoice(message.id)}
                        className="h-7 px-2 -ml-2"
                      >
                        {isPlayingVoice === message.id ? (
                          <>
                            <VolumeX className="w-3 h-3 mr-1" />
                            <span className="text-xs">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 mr-1" />
                            <span className="text-xs">Play Voice</span>
                          </>
                        )}
                      </Button>
                    )}
                    {message.isVoice && message.role === "user" && (
                      <Badge variant="secondary" className="text-xs">
                        Voice
                      </Badge>
                    )}
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {isRecordingAudio && (
          <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-3">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm">Recording in progress... Release to stop</span>
          </div>
        )}



        {transcribedText && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">Transcribed Text:</span>
            </div>
            <p className="text-sm text-green-800">{transcribedText}</p>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isRecordingAudio ? "destructive" : "default"}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              className="flex-1"
            >
              {isRecordingAudio ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Release to Stop
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Hold to Record
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Hold the microphone button to speak your question, or type here..."
              className="flex-1"
              disabled={isRecordingAudio}
            />
            <Button onClick={() => handleSend(false)} size="icon" disabled={isRecordingAudio || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Hold the microphone button to speak (Chrome/Edge), or type your question directly.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
