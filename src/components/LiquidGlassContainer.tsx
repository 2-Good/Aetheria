import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  Copy,
  Check,
  Plus,
  ChevronDown,
  Volume2,
  VolumeX,
  FileCode,
  FileText,
  X,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Terminal,
  Compass,
} from 'lucide-react';
import { Conversation, UserPreferences } from '../types';
import { SITE_CONFIG, STARTER_PROMPTS } from '../config/site';
import { generateMockAiResponse } from '../utils/mockAi';
import { playTactileSound, speakText, stopSpeech } from '../utils/audio';

interface LiquidGlassContainerProps {
  conversation: Conversation | null;
  userName: string;
  preferences: UserPreferences;
  onSendMessage: (content: string, response: string) => void;
  onNewChat: () => void;
  onClearChat?: () => void;
}

interface AttachedFile {
  name: string;
  size: string;
  type: string;
}

export const LiquidGlassContainer: React.FC<LiquidGlassContainerProps> = ({
  conversation,
  userName,
  preferences,
  onSendMessage,
  onNewChat,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTypingAi, setIsTypingAi] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedTone, setSelectedTone] = useState<'Deep Thought' | 'Creative' | 'Concise' | 'Architectural'>('Deep Thought');
  const [showToneDropdown, setShowToneDropdown] = useState(false);
  const [showSparksDrawer, setShowSparksDrawer] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, 'up' | 'down'>>({});
  const [dockTilt, setDockTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 350, y: 35 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, streamingContent]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      voiceTimerRef.current = setInterval(() => {
        setVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      setVoiceSeconds(0);
    }
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [isRecording]);

  // Dynamic textarea height
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    playTactileSound('keystroke', preferences.soundEffects);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // 3D Tilt and Refraction Specular tracking
  const handleDockMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPos({ x, y });

    if (!preferences.enable3dTilt || preferences.motionSpeed === 'reduced') return;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setDockTilt({
      rotateX: -((y - centerY) / centerY) * 3.5,
      rotateY: ((x - centerX) / centerX) * 3.5,
    });
  };

  const handleDockMouseLeave = () => {
    setDockTilt({ rotateX: 0, rotateY: 0 });
    setCursorPos({ x: 350, y: 35 });
  };

  // Native & simulated file attachment handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    playTactileSound('click', preferences.soundEffects);

    const newAttachments: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sizeStr = f.size > 1024 * 1024
        ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(f.size / 1024)} KB`;
      newAttachments.push({
        name: f.name,
        size: sizeStr,
        type: f.type || 'document',
      });
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const handleQuickSampleAttachment = () => {
    playTactileSound('click', preferences.soundEffects);
    const samples: AttachedFile[] = [
      { name: 'optical_spec_v2.pdf', size: '1.4 MB', type: 'application/pdf' },
      { name: 'liquid_refraction_matrix.json', size: '42 KB', type: 'application/json' },
      { name: 'coherence_invariance.py', size: '18 KB', type: 'text/x-python' },
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    if (!attachedFiles.some((f) => f.name === pick.name)) {
      setAttachedFiles((prev) => [...prev, pick]);
    }
  };

  // Real Web Speech API with fallback
  const handleToggleVoice = () => {
    playTactileSound('toggle', preferences.soundEffects);

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      setIsRecording(false);
    } else {
      setIsRecording(true);

      // Check for browser speech recognition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript) {
              setInputValue((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
            }
          };

          recognition.onerror = () => {
            // Handled gracefully
          };

          recognition.onend = () => {
            setIsRecording(false);
          };

          recognitionRef.current = recognition;
          recognition.start();
          return;
        } catch {
          // Fall through to sample transcription
        }
      }

      // Fallback transcription sampler
      const voiceSamples = [
        'How does liquid glass disperse light at glancing refraction angles?',
        'Synthesize an architectural blueprint for sub-millisecond real-time event streaming.',
        'Deconstruct the principles of Dieter Rams and Jony Ive into modern UI architecture.',
      ];
      setTimeout(() => {
        const sample = voiceSamples[Math.floor(Math.random() * voiceSamples.length)];
        setInputValue((prev) => (prev ? `${prev} ` : '') + sample);
        setIsRecording(false);
      }, 2400);
    }
  };

  // Dispatch message with simulated streaming response
  const handleSend = (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || isTypingAi) return;

    playTactileSound('send', preferences.soundEffects);

    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const currentAttachments = [...attachedFiles];
    setAttachedFiles([]);
    setShowSparksDrawer(false);

    const promptContext = currentAttachments.length > 0
      ? `${text} [Attached: ${currentAttachments.map((f) => `${f.name} (${f.size})`).join(', ')}]`
      : text;

    // Generate response using active tone
    const fullMockResponse = generateMockAiResponse({
      userPrompt: promptContext,
      userName,
      conversationTitle: conversation?.title,
      tone: selectedTone === 'Architectural' ? 'Deep Thought' : selectedTone,
    });

    // Start streaming effect
    setIsTypingAi(true);
    setStreamingContent('');

    const words = fullMockResponse.split(' ');
    let currentIndex = 0;
    const intervalSpeed = preferences.motionSpeed === 'snappy' ? 12 : preferences.motionSpeed === 'reduced' ? 4 : 24;

    const streamTimer = setInterval(() => {
      currentIndex += 1;
      const currentText = words.slice(0, currentIndex).join(' ');
      setStreamingContent(currentText);

      if (currentIndex >= words.length) {
        clearInterval(streamTimer);
        setIsTypingAi(false);
        setStreamingContent('');
        playTactileSound('receive', preferences.soundEffects);
        onSendMessage(text, fullMockResponse);
      }
    }, intervalSpeed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string, id: string) => {
    playTactileSound('click', preferences.soundEffects);
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakToggle = (content: string, id: string) => {
    if (speakingId === id) {
      stopSpeech();
      setSpeakingId(null);
    } else {
      playTactileSound('click', preferences.soundEffects);
      setSpeakingId(id);
      speakText(content, () => setSpeakingId(null));
    }
  };

  const handleReaction = (messageId: string, type: 'up' | 'down') => {
    playTactileSound('click', preferences.soundEffects);
    setMessageReactions((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === type ? (null as unknown as 'up') : type,
    }));
  };

  const handleRegenerate = (assistantMsgId: string) => {
    if (isTypingAi || !conversation) return;
    const msgIndex = conversation.messages.findIndex((m) => m.id === assistantMsgId);
    const userMsg = msgIndex > 0 ? conversation.messages[msgIndex - 1] : null;
    const prompt = userMsg ? userMsg.content : 'Refine and expand upon the previous answer';
    handleSend(prompt);
  };

  // THEME COLOR MAPPING for Typing Box & Message Accents
  const getThemeStyles = () => {
    switch (preferences.theme) {
      case 'obsidian':
        return {
          dockBg: 'bg-[#0c0c0c]/75',
          dockBorder: 'border-white/[0.2] border-t-white/[0.4]',
          accentText: 'text-neutral-200',
          accentBg: 'bg-white/[0.12]',
          userBubble: 'bg-[#18181b]/95 text-white border-white/[0.2]',
          sendBtn: 'bg-gradient-to-r from-neutral-200 to-neutral-400 text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]',
          glowTag: 'text-neutral-300',
          activeDot: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]',
        };
      case 'amber':
        return {
          dockBg: 'bg-[#221207]/60',
          dockBorder: 'border-amber-500/35 border-t-amber-300/45',
          accentText: 'text-amber-300',
          accentBg: 'bg-amber-500/15',
          userBubble: 'bg-[#2a150a]/95 text-white border-amber-500/30',
          sendBtn: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.6)]',
          glowTag: 'text-amber-400',
          activeDot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
        };
      case 'mocha':
        return {
          dockBg: 'bg-[#18100c]/65',
          dockBorder: 'border-stone-400/25 border-t-stone-300/40',
          accentText: 'text-stone-300',
          accentBg: 'bg-stone-500/15',
          userBubble: 'bg-[#221611]/95 text-white border-stone-400/20',
          sendBtn: 'bg-gradient-to-r from-stone-400 to-amber-800 text-white shadow-[0_0_20px_rgba(168,113,90,0.5)]',
          glowTag: 'text-stone-300',
          activeDot: 'bg-stone-300 shadow-[0_0_8px_rgba(214,211,209,0.7)]',
        };
      case 'espresso':
      default:
        return {
          dockBg: 'bg-[#160e08]/55',
          dockBorder: 'border-white/[0.18] border-t-white/[0.38]',
          accentText: 'text-amber-300',
          accentBg: 'bg-white/[0.08]',
          userBubble: 'bg-[#1e130c]/95 text-white border-white/[0.12]',
          sendBtn: 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-[0_0_20px_rgba(245,158,11,0.6)]',
          glowTag: 'text-amber-400',
          activeDot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Glass blur intensity class
  const getGlassBlurClass = () => {
    switch (preferences.glassIntensity) {
      case 'subtle':
        return 'backdrop-blur-xl';
      case 'deep':
        return 'backdrop-blur-[40px] saturate-200';
      case 'balanced':
      default:
        return 'backdrop-blur-3xl';
    }
  };

  // Font size multiplier
  const getFontSizeClass = () => {
    switch (preferences.fontSize) {
      case 'sm':
        return 'text-[13px] sm:text-[14px]';
      case 'lg':
        return 'text-[16px] sm:text-[17px]';
      case 'base':
      default:
        return 'text-[14px] sm:text-[15px]';
    }
  };

  const messages = conversation?.messages ?? [];
  const isGreetingState = messages.length === 0;

  return (
    <div className="relative z-10 flex-1 flex flex-col h-full w-full bg-black text-white overflow-hidden select-none">
      {/* Hidden Real File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header Bar on Black Background */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 py-3.5 border-b border-white/[0.06] bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${themeStyles.activeDot}`} />
            <h2 className="text-[13px] sm:text-[14px] font-medium tracking-tight text-white/90 truncate max-w-xs sm:max-w-md">
              {conversation?.title || 'New Dialogue'}
            </h2>
          </div>
          <span className="hidden sm:inline text-white/20 text-xs">·</span>
          <span className="hidden sm:inline text-[11px] font-mono text-white/40 tracking-wider uppercase">
            {SITE_CONFIG.organizationName} · {selectedTone}
          </span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Tone Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                playTactileSound('click', preferences.soundEffects);
                setShowToneDropdown(!showToneDropdown);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full transition-colors cursor-pointer"
            >
              <span>{selectedTone}</span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>

            <AnimatePresence>
              {showToneDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-1.5 w-44 rounded-2xl border border-white/[0.14] bg-[#140d09]/95 backdrop-blur-3xl shadow-2xl py-1.5 z-30"
                >
                  {(['Deep Thought', 'Creative', 'Concise', 'Architectural'] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => {
                        playTactileSound('click', preferences.soundEffects);
                        setSelectedTone(tone);
                        setShowToneDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        selectedTone === tone
                          ? 'text-white bg-white/[0.12] font-medium'
                          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{tone}</span>
                      {selectedTone === tone && <Check className="w-3 h-3 text-amber-300" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => {
              playTactileSound('click', preferences.soundEffects);
              onNewChat();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/80 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] rounded-full transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {/* Main Messages Scroll Area on Pure Black Background */}
      <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 pb-6 select-text">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* Greeting State when dialogue is empty */}
          {isGreetingState && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-xl mx-auto my-auto pt-6"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.05] border border-white/[0.1] shadow-inner mb-5">
                <Sparkles className="w-5 h-5 text-amber-200/90" />
              </div>

              <h3 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
                Good day, <span className="font-semibold text-white">{userName}</span>
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-white/50 font-light tracking-wide leading-relaxed">
                Welcome to your cognitive space. What would you like to synthesize today?
              </p>

              {/* Starter Sparks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full text-left">
                {STARTER_PROMPTS.map((starter) => (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => handleSend(starter.prompt)}
                    className="group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.16] transition-all duration-300 text-left cursor-pointer"
                  >
                    <div className={`text-[10px] font-mono tracking-widest uppercase mb-1 ${themeStyles.glowTag}`}>
                      {starter.category}
                    </div>
                    <div className="text-xs font-medium text-white/90 group-hover:text-white transition-colors">
                      {starter.title}
                    </div>
                    <div className="text-[11px] text-white/40 mt-1 line-clamp-2 leading-relaxed">
                      {starter.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Rendered Messages */}
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const reaction = messageReactions[message.id];

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Sender tag & timestamp */}
                <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] font-mono text-white/35">
                  <span>{isUser ? userName : SITE_CONFIG.organizationName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{message.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[92%] sm:max-w-[85%] rounded-2xl px-5 py-4 ${
                    isUser
                      ? `${themeStyles.userBubble} shadow-lg`
                      : 'bg-white/[0.03] text-neutral-100 border border-white/[0.06]'
                  }`}
                >
                  <div className={`${getFontSizeClass()} leading-relaxed font-light break-words space-y-3`}>
                    {formatMessageContent(message.content, preferences.soundEffects)}
                  </div>

                  {!isUser && (
                    <div className="mt-3.5 pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] text-[11px] text-white/40">
                      <div className="flex items-center gap-3">
                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(message.content, message.id)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {/* Text-To-Speech Playback */}
                        <button
                          type="button"
                          onClick={() => handleSpeakToggle(message.content, message.id)}
                          title={speakingId === message.id ? 'Stop Speaking' : 'Read Aloud'}
                          className={`flex items-center gap-1 transition-colors cursor-pointer ${
                            speakingId === message.id ? 'text-amber-300 font-medium' : 'hover:text-white'
                          }`}
                        >
                          {speakingId === message.id ? (
                            <>
                              <VolumeX className="w-3 h-3 animate-pulse text-amber-300" />
                              <span className="text-amber-300">Speaking...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>

                        {/* Regenerate button */}
                        <button
                          type="button"
                          onClick={() => handleRegenerate(message.id)}
                          title="Regenerate this thought"
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>

                        {/* Feedback reaction buttons */}
                        <div className="flex items-center gap-1 pl-1 border-l border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => handleReaction(message.id, 'up')}
                            className={`p-1 rounded hover:bg-white/[0.06] transition-colors cursor-pointer ${
                              reaction === 'up' ? 'text-emerald-400' : 'text-white/30 hover:text-white'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReaction(message.id, 'down')}
                            className={`p-1 rounded hover:bg-white/[0.06] transition-colors cursor-pointer ${
                              reaction === 'down' ? 'text-red-400' : 'text-white/30 hover:text-white'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-white/30">
                        {message.model || `${SITE_CONFIG.organizationName} Optical 2.5`}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Active Streaming Response */}
          {isTypingAi && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] font-mono text-white/40">
                <span>{SITE_CONFIG.organizationName}</span>
                <span aria-hidden="true">·</span>
                <span className={`animate-pulse ${themeStyles.accentText}`}>Reflecting ({selectedTone})...</span>
              </div>

              <div className="relative max-w-[92%] sm:max-w-[85%] rounded-2xl px-5 py-4 bg-white/[0.03] text-neutral-100 border border-white/[0.06]">
                <div className={`${getFontSizeClass()} leading-relaxed font-light break-words space-y-3`}>
                  {formatMessageContent(streamingContent, preferences.soundEffects)}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-amber-400 align-middle animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* FLOATING LIQUID-GLASS TYPING BOX */}
      <div className="relative z-30 w-full p-3 sm:p-5 md:p-6 pb-5 pt-2">
        <div className="max-w-3xl mx-auto w-full">
          {/* Quick Prompt Sparks pill bar */}
          <div className="flex items-center justify-between px-2 mb-2">
            <button
              type="button"
              onClick={() => {
                playTactileSound('click', preferences.soundEffects);
                setShowSparksDrawer(!showSparksDrawer);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/45 hover:text-white/90 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400/80" />
              <span>Prompt Inspiration</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showSparksDrawer ? 'rotate-180' : ''}`} />
            </button>

            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest hidden sm:inline">
              24ms Latency · Encrypted
            </span>
          </div>

          {/* Collapsible Sparks Drawer */}
          <AnimatePresence>
            {showSparksDrawer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-2.5"
              >
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
                  {STARTER_PROMPTS.map((sp) => (
                    <button
                      key={sp.title}
                      type="button"
                      onClick={() => handleSend(sp.prompt)}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
                    >
                      {sp.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attached files pills */}
          {attachedFiles.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-2 overflow-x-auto">
              {attachedFiles.map((file, i) => (
                <div
                  key={file.name + i}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-[#1a110a]/80 backdrop-blur-xl border border-white/[0.14] rounded-xl text-white/90 shadow-sm shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                  <span className="text-[10px] text-white/40">({file.size})</span>
                  <button
                    type="button"
                    onClick={() => {
                      playTactileSound('click', preferences.soundEffects);
                      setAttachedFiles(attachedFiles.filter((_, idx) => idx !== i));
                    }}
                    className="hover:text-white cursor-pointer ml-1 text-white/40 hover:text-white/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Voice Recording Acoustic Wave Bar */}
          {isRecording && (
            <div className="flex items-center justify-between px-4 py-2.5 mb-2 rounded-2xl bg-[#26150d]/90 backdrop-blur-2xl border border-amber-500/40 text-amber-200 text-xs shadow-xl animate-pulse">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>Listening with Acoustic Filter... ({voiceSeconds}s)</span>
                {/* Visualizer wave bars */}
                <div className="flex items-center gap-0.5 h-3">
                  {[4, 12, 8, 16, 6, 14, 10, 4, 12, 6, 14].map((h, i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-amber-400 rounded-full animate-bounce"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleVoice}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-lg text-xs hover:text-white cursor-pointer font-medium"
              >
                Done
              </button>
            </div>
          )}

          {/* THE 100x LIQUID GLASS DOCK */}
          <motion.div
            ref={dockRef}
            onMouseMove={handleDockMouseMove}
            onMouseLeave={handleDockMouseLeave}
            animate={{
              rotateX: dockTilt.rotateX,
              rotateY: dockTilt.rotateY,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            style={{ transformStyle: 'preserve-3d' }}
            className={`relative rounded-3xl p-2.5 sm:p-3.5 ${getGlassBlurClass()} ${themeStyles.dockBg} ${themeStyles.dockBorder} border shadow-[0_24px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/[0.28] focus-within:border-white/[0.38] overflow-hidden`}
          >
            {/* Dynamic Cursor-Tracking Specular Glare (Physical Liquid Glass Highlight) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle 280px at ${cursorPos.x}px ${cursorPos.y}px, rgba(255, 255, 255, 0.14), transparent 70%)`,
              }}
            />

            {/* Specular sheen along upper glass bevel */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.08] via-transparent to-transparent opacity-60"
            />

            <div className="relative flex items-end gap-2">
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => {
                  playTactileSound('click', preferences.soundEffects);
                  fileInputRef.current?.click();
                }}
                title="Attach Files from Computer"
                className="p-2 text-white/55 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Quick Sample File Trigger */}
              <button
                type="button"
                onClick={handleQuickSampleAttachment}
                title="Insert Simulated Research Document"
                className="hidden sm:inline-flex p-2 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <FileCode className="w-4 h-4" />
              </button>

              {/* Voice Dictation Button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isRecording ? 'Stop Recording' : 'Voice Input'}
                className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  isRecording
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                    : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Inquire with ${SITE_CONFIG.organizationName} (${selectedTone})...`}
                rows={1}
                className="flex-1 bg-transparent py-1.5 px-2 text-[14px] sm:text-[15px] text-white placeholder:text-white/35 outline-none resize-none leading-relaxed max-h-40 min-h-[38px]"
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTypingAi}
                className={`p-2.5 rounded-2xl transition-all cursor-pointer shrink-0 ${
                  inputValue.trim() && !isTypingAi
                    ? `${themeStyles.sendBtn} hover:brightness-110 active:scale-95`
                    : 'bg-white/[0.05] text-white/20 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Minimal Bottom Label */}
          <div className="flex items-center justify-between mt-2 px-3 text-[11px] text-white/30 font-light">
            <span className="hidden sm:inline">
              Return ↵ to send · Shift+Return for new line
            </span>
            <span className="tracking-wide">
              {SITE_CONFIG.organizationName} · {preferences.theme.toUpperCase()} THEME · QUANTUM-SAFE MEMORY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dedicated Interactive Code Block Component with Copy Action
 */
interface CodeBlockProps {
  language: string;
  code: string;
  soundEffects: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, soundEffects }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    playTactileSound('click', soundEffects);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0a0705]/95 shadow-2xl text-[13px]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.08] text-[11px] font-mono text-white/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="uppercase tracking-wider font-semibold text-white/80">{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-neutral-100 leading-relaxed text-xs sm:text-[13px] bg-black/40">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * Clean formatter for message content with markdown, bolding, blockquotes, and code blocks
 */
function formatMessageContent(content: string, soundEffects = true) {
  if (!content) return null;

  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderTextParagraphs(content.slice(lastIndex, match.index), `txt-${lastIndex}`));
    }

    const language = match[1] || 'code';
    const codeBody = match[2];

    parts.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={language}
        code={codeBody}
        soundEffects={soundEffects}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(renderTextParagraphs(content.slice(lastIndex), `txt-${lastIndex}`));
  }

  return parts;
}

function renderTextParagraphs(text: string, keyPrefix: string) {
  const lines = text.split('\n');
  return (
    <div key={keyPrefix} className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-white/95 pt-1 tracking-tight">
              {trimmed.replace('### ', '')}
            </h4>
          );
        }

        if (trimmed.startsWith('> ')) {
          return (
            <div
              key={idx}
              className="pl-3.5 border-l-2 border-amber-400/70 italic text-white/80 my-2.5 bg-white/[0.015] py-1 rounded-r-lg"
            >
              {trimmed.replace('> ', '')}
            </div>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-300 mt-1 text-xs">·</span>
              <span>{renderInlineBold(trimmed.slice(2))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-mono text-xs text-amber-300/80 pt-0.5">{numMatch[1]}.</span>
              <span>{renderInlineBold(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineBold(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineBold(str: string) {
  const boldParts = str.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-mono text-xs bg-white/[0.08] px-1.5 py-0.5 rounded text-amber-200 border border-white/[0.06]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
