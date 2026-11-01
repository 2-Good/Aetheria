export type ScreenState = 
  | 'blank'          // Initial blank white screen with tiny "Let's begin"
  | 'human_check'    // "Are you human?" verification with Yes / No boxes
  | 'access_denied'  // Blank white screen: "You can't enter"
  | 'login'          // Apple-style Google Sign-In authentication screen for AETHERIA
  | 'signin'         // Rounded box with X & O details, name prefilled or typed
  | 'chat';          // Full cinematic liquid-glass chat interface

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  model?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  isPinned?: boolean;
  category?: 'Today' | 'Yesterday' | 'Previous 7 Days';
}

export type ThemePreset = 'espresso' | 'obsidian' | 'amber' | 'mocha';
export type MotionSpeed = 'cinematic' | 'snappy' | 'reduced';
export type GlassIntensity = 'subtle' | 'balanced' | 'deep';
export type FontSize = 'sm' | 'base' | 'lg';

export interface UserPreferences {
  theme: ThemePreset;
  motionSpeed: MotionSpeed;
  glassIntensity: GlassIntensity;
  fontSize: FontSize;
  enable3dTilt: boolean;
  enableParticles: boolean;
  soundEffects: boolean;
}

export interface UserProfile {
  name: string;
  joinedAt: number;
  avatarSeed: string;
}
