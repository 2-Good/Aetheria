import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { OpeningScreen } from './components/OpeningScreen';
import { HumanVerificationScreen } from './components/HumanVerificationScreen';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { LoginScreen } from './components/LoginScreen';
import { SignInScreen } from './components/SignInScreen';
import { BackgroundEnvironment } from './components/BackgroundEnvironment';
import { Sidebar } from './components/Sidebar';
import { LiquidGlassContainer } from './components/LiquidGlassContainer';
import { SettingsModal } from './components/SettingsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import {
  ScreenState,
  Conversation,
  UserPreferences,
  UserProfile,
  ChatMessage,
} from './types';
import { SITE_CONFIG } from './config/site';
import { INITIAL_CONVERSATIONS } from './data/mockConversations';
import {
  auth,
  signInWithGoogle,
  signOutFirebase,
  testFirestoreConnection,
} from './lib/firebase';
import {
  syncConversationToFirestore,
  deleteConversationFromFirestore,
  subscribeToUserConversations,
  syncUserProfileToFirestore,
} from './services/firestoreService';

export default function App() {
  const [screenState, setScreenState] = useState<ScreenState>('blank');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(SITE_CONFIG.storageKeyUser);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [firebaseUser, setFirebaseUser] = useState<{ email?: string | null; uid: string } | null>(null);
  const [prefilledName, setPrefilledName] = useState<string>('');

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(SITE_CONFIG.storageKeyChats);
      return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return INITIAL_CONVERSATIONS[0]?.id || null;
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(SITE_CONFIG.storageKeyPrefs);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      theme: 'espresso',
      motionSpeed: 'cinematic',
      glassIntensity: 'balanced',
      fontSize: 'base',
      enable3dTilt: true,
      enableParticles: true,
      soundEffects: true,
    };
  });

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // 1. Connection check on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // 2. Firebase Auth state listener & Real-time Firestore sync
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        setFirebaseUser({ email: user.email, uid: user.uid });
        const name = user.displayName || userProfile?.name || user.email?.split('@')[0] || 'Aetheria User';

        const updatedProfile: UserProfile = {
          name,
          joinedAt: userProfile?.joinedAt || Date.now(),
          avatarSeed: name.slice(0, 2).toUpperCase(),
        };
        setUserProfile(updatedProfile);

        // Sync profile to cloud
        syncUserProfileToFirestore(updatedProfile, preferences);

        // Subscribe to user conversations in real-time
        unsubscribeFirestore = subscribeToUserConversations((cloudConversations) => {
          if (cloudConversations && cloudConversations.length > 0) {
            setConversations(cloudConversations);
            setActiveConversationId((current) => {
              if (current && cloudConversations.some((c) => c.id === current)) {
                return current;
              }
              return cloudConversations[0]?.id || null;
            });
          }
        });
      } else {
        setFirebaseUser(null);
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Local storage persistence
  useEffect(() => {
    try {
      if (userProfile) {
        localStorage.setItem(SITE_CONFIG.storageKeyUser, JSON.stringify(userProfile));
      }
    } catch {
      // Storage unavailable
    }
  }, [userProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(SITE_CONFIG.storageKeyChats, JSON.stringify(conversations));
    } catch {
      // Storage unavailable
    }
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(SITE_CONFIG.storageKeyPrefs, JSON.stringify(preferences));
    } catch {
      // Storage unavailable
    }
  }, [preferences]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsPrivacyOpen(false);
        setIsSidebarOpenMobile(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Opening, Human Verification & Sign-In Flow
  const handleBegin = () => {
    setScreenState('human_check');
  };

  const handleConfirmHuman = () => {
    setScreenState('login');
  };

  const handleLoginSuccess = (name: string, email?: string) => {
    if (name) {
      setPrefilledName(name);
    }
    setScreenState('signin');
  };

  const handleLoginBack = () => {
    setScreenState('human_check');
  };

  const handleDenyHuman = () => {
    setScreenState('access_denied');
  };

  const handleRestart = () => {
    setScreenState('blank');
  };

  const handleSignInComplete = (name: string) => {
    const profile: UserProfile = {
      name,
      joinedAt: Date.now(),
      avatarSeed: name.slice(0, 2).toUpperCase(),
    };
    setUserProfile(profile);
    if (firebaseUser) {
      syncUserProfileToFirestore(profile, preferences);
    }
    setScreenState('chat');
  };

  // Chat Actions
  const handleNewChat = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Dialogue',
      preview: 'Start a new inquiry...',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      category: 'Today',
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);

    if (firebaseUser) {
      syncConversationToFirestore(newConv);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        setActiveConversationId(updated[0]?.id || null);
      }
      return updated;
    });

    if (firebaseUser) {
      deleteConversationFromFirestore(id);
    }
  };

  const handlePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, isPinned: !c.isPinned };
          if (firebaseUser) syncConversationToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, title: newTitle, updatedAt: Date.now() };
          if (firebaseUser) syncConversationToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const handleSendMessage = (userText: string, aiText: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: timeString,
    };

    const aiMessage: ChatMessage = {
      id: `ai-${Date.now() + 1}`,
      role: 'assistant',
      content: aiText,
      timestamp: timeString,
      model: `${SITE_CONFIG.organizationName} Optical 2.5`,
    };

    setConversations((prev) => {
      if (activeConversationId) {
        return prev.map((conv) => {
          if (conv.id === activeConversationId) {
            const isFirst = conv.messages.length === 0;
            const updatedTitle = isFirst
              ? userText.slice(0, 32) + (userText.length > 32 ? '...' : '')
              : conv.title;
            const updatedConv: Conversation = {
              ...conv,
              title: updatedTitle,
              preview: aiText.slice(0, 60) + '...',
              updatedAt: Date.now(),
              messages: [...conv.messages, userMessage, aiMessage],
            };

            if (firebaseUser) {
              syncConversationToFirestore(updatedConv);
            }

            return updatedConv;
          }
          return conv;
        });
      } else {
        const newConv: Conversation = {
          id: `conv-${Date.now()}`,
          title: userText.slice(0, 32) + (userText.length > 32 ? '...' : ''),
          preview: aiText.slice(0, 60) + '...',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [userMessage, aiMessage],
          category: 'Today',
        };
        setActiveConversationId(newConv.id);

        if (firebaseUser) {
          syncConversationToFirestore(newConv);
        }

        return [newConv, ...prev];
      }
    });
  };

  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updated };
      if (firebaseUser && userProfile) {
        syncUserProfileToFirestore(userProfile, next);
      }
      return next;
    });
  };

  const handleUpdateProfile = (name: string) => {
    setUserProfile((prev) => {
      const next: UserProfile = prev
        ? { ...prev, name }
        : { name, joinedAt: Date.now(), avatarSeed: name.slice(0, 2).toUpperCase() };
      if (firebaseUser) {
        syncUserProfileToFirestore(next, preferences);
      }
      return next;
    });
  };

  const handleClearAllChats = () => {
    if (firebaseUser) {
      conversations.forEach((c) => deleteConversationFromFirestore(c.id));
    }
    setConversations([]);
    setActiveConversationId(null);
  };

  const handleResetSession = () => {
    setScreenState('blank');
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.warn('Google sign in error:', error);
    }
  };

  const handleSignOutFirebase = async () => {
    try {
      await signOutFirebase();
    } catch (error) {
      console.warn('Sign out error:', error);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const currentUserName = userProfile?.name || (firebaseUser?.email ? firebaseUser.email.split('@')[0] : 'Guest Explorer');

  return (
    <div
      data-theme={preferences.theme}
      className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans antialiased"
    >
      {/* Onboarding and Entrance Screens */}
      <AnimatePresence mode="wait">
        {screenState === 'blank' && (
          <OpeningScreen key="opening-screen" onBegin={handleBegin} />
        )}
        {screenState === 'human_check' && (
          <HumanVerificationScreen
            key="human-check-screen"
            onConfirmHuman={handleConfirmHuman}
            onDenyHuman={handleDenyHuman}
          />
        )}
        {screenState === 'access_denied' && (
          <AccessDeniedScreen
            key="access-denied-screen"
            onRestart={handleRestart}
          />
        )}
        {screenState === 'login' && (
          <LoginScreen
            key="login-screen"
            onSuccess={handleLoginSuccess}
            onBack={handleLoginBack}
          />
        )}
        {screenState === 'signin' && (
          <SignInScreen
            key="signin-screen"
            initialName={prefilledName}
            onComplete={handleSignInComplete}
          />
        )}
      </AnimatePresence>

      {/* 3. Main Chatbot Interface */}
      {screenState === 'chat' && (
        <motion.div
          key="chat-interface"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex w-full h-full overflow-hidden"
        >
          {/* Background 3D Environment with atmospheric lighting and micro-particles */}
          <BackgroundEnvironment
            theme={preferences.theme}
            enableParticles={preferences.enableParticles && preferences.motionSpeed !== 'reduced'}
          />

          {/* Left Sidebar */}
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            userProfile={userProfile}
            firebaseUser={firebaseUser}
            theme={preferences.theme}
            soundEffects={preferences.soundEffects}
            isOpenMobile={isSidebarOpenMobile}
            onToggleMobile={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onPinConversation={handlePinConversation}
            onRenameConversation={handleRenameConversation}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenPrivacy={() => setIsPrivacyOpen(true)}
            onResetSession={handleResetSession}
            onSignInGoogle={handleGoogleSignIn}
            onSignOutFirebase={handleSignOutFirebase}
          />

          {/* Central Main Chat Area with Floating Liquid Glass Container */}
          <main className="relative flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <LiquidGlassContainer
              conversation={activeConversation}
              userName={currentUserName}
              preferences={preferences}
              onSendMessage={handleSendMessage}
              onNewChat={handleNewChat}
            />
          </main>
        </motion.div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        preferences={preferences}
        userProfile={userProfile}
        conversations={conversations}
        firebaseUser={firebaseUser}
        onClose={() => setIsSettingsOpen(false)}
        onUpdatePreferences={handleUpdatePreferences}
        onUpdateProfile={handleUpdateProfile}
        onClearAllChats={handleClearAllChats}
        onResetSession={handleResetSession}
        onSignInGoogle={handleGoogleSignIn}
        onSignOutFirebase={handleSignOutFirebase}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}
