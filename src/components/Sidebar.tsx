import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Settings,
  Shield,
  MessageSquare,
  Search,
  Trash2,
  Pin,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
  Edit2,
  Check,
} from 'lucide-react';
import { Conversation, UserProfile, ThemePreset } from '../types';
import { SITE_CONFIG } from '../config/site';
import { playTactileSound } from '../utils/audio';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  userProfile: UserProfile | null;
  firebaseUser?: { email?: string | null; uid?: string } | null;
  theme: ThemePreset;
  soundEffects: boolean;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onPinConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  onResetSession: () => void;
  onSignInGoogle?: () => void;
  onSignOutFirebase?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  userProfile,
  firebaseUser,
  theme,
  soundEffects,
  isOpenMobile,
  onToggleMobile,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onPinConversation,
  onRenameConversation,
  onOpenSettings,
  onOpenPrivacy,
  onResetSession,
  onSignInGoogle,
  onSignOutFirebase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter conversations
  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by category with pinned items always first
  const grouped: Record<string, Conversation[]> = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  filteredConversations.forEach((conv) => {
    if (conv.isPinned) {
      grouped.Pinned.push(conv);
      return;
    }
    const diffDays = (now - conv.updatedAt) / oneDay;
    if (diffDays < 1) {
      grouped.Today.push(conv);
    } else if (diffDays < 2) {
      grouped.Yesterday.push(conv);
    } else if (diffDays < 7) {
      grouped['Previous 7 Days'].push(conv);
    } else {
      grouped.Older.push(conv);
    }
  });

  const handleStartRename = (conv: Conversation) => {
    playTactileSound('click', soundEffects);
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Theme-specific styles
  const getSidebarThemeStyle = () => {
    switch (theme) {
      case 'obsidian':
        return {
          activeItem: 'bg-white/[0.12] text-white border-white/[0.3] shadow-[0_2px_12px_rgba(255,255,255,0.15)]',
          activeIcon: 'text-neutral-100',
          logoGlow: 'from-neutral-700 to-neutral-900 border-white/25 text-white',
          avatarGradient: 'from-neutral-400 to-neutral-600',
        };
      case 'amber':
        return {
          activeItem: 'bg-amber-500/[0.15] text-amber-200 border-amber-500/40 shadow-[0_2px_12px_rgba(245,158,11,0.25)]',
          activeIcon: 'text-amber-300',
          logoGlow: 'from-amber-700 to-orange-900 border-amber-500/40 text-amber-200',
          avatarGradient: 'from-orange-500 to-amber-600',
        };
      case 'mocha':
        return {
          activeItem: 'bg-stone-500/[0.15] text-stone-200 border-stone-400/30 shadow-[0_2px_12px_rgba(168,113,90,0.25)]',
          activeIcon: 'text-stone-300',
          logoGlow: 'from-stone-800 to-amber-950 border-stone-400/30 text-stone-200',
          avatarGradient: 'from-stone-500 to-amber-800',
        };
      case 'espresso':
      default:
        return {
          activeItem: 'bg-white/[0.1] text-white border-amber-500/35 shadow-[0_2px_12px_rgba(0,0,0,0.3)]',
          activeIcon: 'text-amber-300',
          logoGlow: 'from-[#2b1910] to-[#45281a] border-white/[0.15] text-amber-200',
          avatarGradient: 'from-amber-600 to-amber-700',
        };
    }
  };

  const themeStyle = getSidebarThemeStyle();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isOpenMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggleMobile}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Mobile Hamburger Toggle */}
      <div className="fixed top-3 left-3 z-30 lg:hidden">
        <button
          type="button"
          onClick={() => {
            playTactileSound('toggle', soundEffects);
            onToggleMobile();
          }}
          aria-label="Toggle navigation menu"
          className="p-2.5 rounded-xl bg-black/85 border border-white/[0.12] text-white/90 backdrop-blur-xl shadow-lg cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col h-full bg-black/85 backdrop-blur-3xl border-r border-white/[0.08] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[10px_0_40px_rgba(0,0,0,0.6)] ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsedDesktop ? 'lg:w-[68px]' : 'lg:w-[270px]'}`}
      >
        {/* Top Header: Logo / Wordmark */}
        <div className="relative flex items-center justify-between px-4 py-4.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Custom geometric logo mark */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr ${themeStyle.logoGlow} border shadow-inner shrink-0`}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
            </div>

            {/* Wordmark (hidden if collapsed on desktop) */}
            <div
              className={`flex flex-col transition-opacity duration-200 ${
                isCollapsedDesktop ? 'lg:hidden' : 'opacity-100'
              }`}
            >
              <span className="text-[14px] font-semibold tracking-wider text-white">
                {SITE_CONFIG.organizationName}
              </span>
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                STUDIO CHAT
              </span>
            </div>
          </div>

          {/* Desktop collapse toggle & mobile close */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                playTactileSound('click', soundEffects);
                setIsCollapsedDesktop(!isCollapsedDesktop);
              }}
              title={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
            >
              {isCollapsedDesktop ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onToggleMobile}
              className="flex lg:hidden p-1.5 text-white/60 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action: New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              playTactileSound('click', soundEffects);
              onNewChat();
              if (isOpenMobile) onToggleMobile();
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.14] border border-white/[0.1] hover:border-white/[0.2] text-white/90 text-xs font-medium tracking-wide transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.2)] cursor-pointer ${
              isCollapsedDesktop ? 'lg:px-0' : ''
            }`}
          >
            <Plus className="w-4 h-4 text-amber-300 shrink-0" />
            <span className={`${isCollapsedDesktop ? 'lg:hidden' : ''} truncate`}>
              New Dialogue
            </span>
          </button>
        </div>

        {/* Search input (visible only when expanded) */}
        {!isCollapsedDesktop && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.06] text-white/40 text-xs">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-transparent text-white placeholder:text-white/30 text-[12px] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-white cursor-pointer text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {Object.entries(grouped).map(([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-1">
                {/* Section title (only when expanded) */}
                <div
                  className={`px-3 py-1 text-[10px] font-mono tracking-widest text-white/35 uppercase flex items-center justify-between ${
                    isCollapsedDesktop ? 'lg:hidden' : ''
                  }`}
                >
                  <span>{category}</span>
                  <span className="text-[9px] text-white/20">{items.length}</span>
                </div>

                {/* Items */}
                {items.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const isEditing = editingId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className="group relative flex items-center"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1 w-full px-2 py-1 bg-white/[0.08] rounded-xl border border-white/[0.2]">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="flex-1 bg-transparent text-xs text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(conv.id)}
                            className="p-1 hover:text-emerald-400 text-white/70"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            playTactileSound('click', soundEffects);
                            onSelectConversation(conv.id);
                            if (isOpenMobile) onToggleMobile();
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                            isActive
                              ? `${themeStyle.activeItem} border`
                              : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                          } ${isCollapsedDesktop ? 'lg:justify-center lg:px-0' : ''}`}
                        >
                          <MessageSquare
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? themeStyle.activeIcon : 'text-white/40 group-hover:text-white/70'
                            }`}
                          />
                          <div
                            className={`flex-1 min-w-0 ${
                              isCollapsedDesktop ? 'lg:hidden' : ''
                            }`}
                          >
                            <div className="text-[12px] font-medium truncate flex items-center gap-1.5">
                              {conv.isPinned && (
                                <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0 rotate-45" />
                              )}
                              <span className="truncate">{conv.title}</span>
                            </div>
                            <div className="text-[11px] text-white/35 truncate">
                              {conv.preview}
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Hover action icons */}
                      {!isCollapsedDesktop && !isEditing && (
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-black/90 px-1 py-0.5 rounded-lg border border-white/[0.08] transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(conv);
                            }}
                            title="Rename"
                            className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTactileSound('click', soundEffects);
                              onPinConversation(conv.id);
                            }}
                            title={conv.isPinned ? 'Unpin' : 'Pin to top'}
                            className="p-1 text-white/40 hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTactileSound('click', soundEffects);
                              onDeleteConversation(conv.id);
                            }}
                            title="Delete dialogue"
                            className="p-1 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="text-center py-6 px-3 text-xs text-white/30">
              No dialogues found
            </div>
          )}
        </div>

        {/* Bottom Section: Profile, Settings & Privacy */}
        <div className="p-3 border-t border-white/[0.06] space-y-1 bg-black/20">
          {/* User Profile Info & Firebase Sync Badge */}
          {userProfile && (
            <div
              className={`flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded-xl bg-white/[0.03] border border-white/[0.06] ${
                isCollapsedDesktop ? 'lg:justify-center lg:px-0' : ''
              }`}
            >
              <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${themeStyle.avatarGradient} text-white text-[11px] font-medium flex items-center justify-center shrink-0`}>
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div
                className={`flex-1 min-w-0 ${
                  isCollapsedDesktop ? 'lg:hidden' : ''
                }`}
              >
                <div className="text-[12px] font-medium text-white/90 truncate flex items-center justify-between">
                  <span className="truncate">{userProfile.name}</span>
                  {firebaseUser ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" title={`${SITE_CONFIG.organizationName} Cloud Synced`} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" title="Local Session" />
                  )}
                </div>
                <div className="text-[10px] text-white/40 font-mono truncate">
                  {firebaseUser ? `${SITE_CONFIG.organizationName} Cloud` : 'Local Sandbox'}
                </div>
              </div>
            </div>
          )}

          {/* Connect Cloud button if not connected */}
          {!firebaseUser && onSignInGoogle && !isCollapsedDesktop && (
            <button
              type="button"
              onClick={onSignInGoogle}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 mb-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <span>Sync with {SITE_CONFIG.organizationName} Cloud</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => {
              playTactileSound('click', soundEffects);
              onOpenSettings();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors text-xs cursor-pointer ${
              isCollapsedDesktop ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-white/50 shrink-0" />
            <span className={isCollapsedDesktop ? 'lg:hidden' : ''}>
              Settings & Preferences
            </span>
          </button>

          {/* Privacy Policy Link */}
          <button
            type="button"
            onClick={() => {
              playTactileSound('click', soundEffects);
              onOpenPrivacy();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors text-xs cursor-pointer ${
              isCollapsedDesktop ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-white/50 shrink-0" />
            <span className={isCollapsedDesktop ? 'lg:hidden' : ''}>
              Privacy & Safeguards
            </span>
          </button>

          {/* Re-enter Opening Flow / Sign Out */}
          <button
            type="button"
            onClick={() => {
              playTactileSound('click', soundEffects);
              onResetSession();
            }}
            title="Reset to Opening Screen"
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-colors text-xs cursor-pointer ${
              isCollapsedDesktop ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <span className={isCollapsedDesktop ? 'lg:hidden' : ''}>
              Restart Experience
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
