import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Palette,
  Activity,
  Eye,
  User,
  Check,
  Volume2,
  VolumeX,
  Type,
  Download,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { UserPreferences, UserProfile, ThemePreset, MotionSpeed, GlassIntensity, FontSize, Conversation } from '../types';
import { SITE_CONFIG } from '../config/site';
import { playTactileSound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  preferences: UserPreferences;
  userProfile: UserProfile | null;
  conversations: Conversation[];
  firebaseUser?: { email?: string | null; uid?: string } | null;
  onClose: () => void;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
  onUpdateProfile: (name: string) => void;
  onClearAllChats: () => void;
  onResetSession: () => void;
  onSignInGoogle?: () => void;
  onSignOutFirebase?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  preferences,
  userProfile,
  conversations,
  firebaseUser,
  onClose,
  onUpdatePreferences,
  onUpdateProfile,
  onClearAllChats,
  onResetSession,
  onSignInGoogle,
  onSignOutFirebase,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'motion' | 'glass' | 'profile'>('appearance');
  const [tempName, setTempName] = useState(userProfile?.name || '');
  const [savedNameNotice, setSavedNameNotice] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);
  const [exportedNotice, setExportedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    playTactileSound('click', preferences.soundEffects);
    onUpdateProfile(tempName.trim());
    setSavedNameNotice(true);
    setTimeout(() => setSavedNameNotice(false), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all conversation history? This cannot be undone.')) {
      playTactileSound('click', preferences.soundEffects);
      onClearAllChats();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 2000);
    }
  };

  const handleExportData = () => {
    playTactileSound('click', preferences.soundEffects);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${SITE_CONFIG.organizationName.toLowerCase()}_dialogues_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportedNotice(true);
    setTimeout(() => setExportedNotice(false), 2500);
  };

  const themes: { id: ThemePreset; name: string; color: string; desc: string }[] = [
    { id: 'espresso', name: 'Warm Espresso', color: '#1a100a', desc: 'Warm roasted brown undertones with gentle amber-cognac glow' },
    { id: 'obsidian', name: 'Obsidian Noir', color: '#090909', desc: 'Deep minimal dark carbon with crisp platinum-silver highlights' },
    { id: 'amber', name: 'Amber Cognac', color: '#24140a', desc: 'Rich golden amber atmosphere with high thermal warmth' },
    { id: 'mocha', name: 'Velvet Mocha', color: '#150d09', desc: 'Subdued earthy cocoa with creamy champagne reflections' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl rounded-3xl bg-[#120c08]/95 backdrop-blur-3xl border border-white/[0.14] border-t-white/[0.28] shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-sm font-semibold tracking-wide text-white">
              System Preferences & Diagnostics
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              playTactileSound('click', preferences.soundEffects);
              onClose();
            }}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/[0.06] bg-black/20 text-xs overflow-x-auto">
          {[
            { id: 'appearance', label: 'Theme & Palette', icon: Palette },
            { id: 'motion', label: 'Motion & Physics', icon: Activity },
            { id: 'glass', label: 'Optics & Font', icon: Eye },
            { id: 'profile', label: 'Profile & Data', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playTactileSound('click', preferences.soundEffects);
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-amber-400 text-white bg-white/[0.04]'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* TAB 1: Theme & Palette */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider mb-1">
                  Atmospheric Color Matrix
                </h4>
                <p className="text-xs text-white/50">
                  Switch the ambient light field and optical refraction palette. Updates instantly in real-time.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {themes.map((t) => {
                  const isSelected = preferences.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playTactileSound('click', preferences.soundEffects);
                        onUpdatePreferences({ theme: t.id });
                      }}
                      className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400/80 bg-white/[0.08] shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="text-xs font-semibold text-white">{t.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                      </div>
                      <span className="text-[11px] text-white/50 leading-relaxed">
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sound Effects Audio Toggle */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white flex items-center gap-2">
                    {preferences.soundEffects ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
                    <span>Tactile Optical Sound Effects</span>
                  </div>
                  <div className="text-[11px] text-white/45">
                    Subtle synthetic Web Audio tones on message dispatch and button clicks
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.soundEffects}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    playTactileSound('toggle', checked);
                    onUpdatePreferences({ soundEffects: checked });
                  }}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Motion & Physics */}
          {activeTab === 'motion' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider mb-1">
                  Kinetic Dynamics & Animation Curves
                </h4>
                <p className="text-xs text-white/50">
                  Configure transition durations, letter zoom speed, and streaming pacing.
                </p>
              </div>

              <div className="space-y-2">
                {(
                  [
                    { id: 'cinematic', label: 'Cinematic Smooth (Recommended)', desc: 'Apple-inspired spring physics, fluid easing, full letter plunge zoom' },
                    { id: 'snappy', label: 'Snappy Minimalist', desc: 'Rapid 14ms response streaming and instant view switches' },
                    { id: 'reduced', label: 'Reduced Motion (Accessibility)', desc: 'Zero parallax or tilt effects, instantaneous screen fades' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      playTactileSound('click', preferences.soundEffects);
                      onUpdatePreferences({ motionSpeed: m.id as MotionSpeed });
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      preferences.motionSpeed === m.id
                        ? 'border-amber-400/80 bg-white/[0.08]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium text-white">{m.label}</div>
                      <div className="text-[11px] text-white/45">{m.desc}</div>
                    </div>
                    {preferences.motionSpeed === m.id && (
                      <Check className="w-3.5 h-3.5 text-amber-300 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>

              {/* 3D Tilt toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div>
                  <div className="text-xs font-medium text-white">3D Dynamic Tilt on Typing Box</div>
                  <div className="text-[11px] text-white/45">Physical perspective tilt responding to mouse hover over the glass dock</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.enable3dTilt}
                  onChange={(e) => {
                    playTactileSound('toggle', preferences.soundEffects);
                    onUpdatePreferences({ enable3dTilt: e.target.checked });
                  }}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Optics & Font Scale */}
          {activeTab === 'glass' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider mb-1">
                  Liquid Glass & Typography Calibration
                </h4>
                <p className="text-xs text-white/50">
                  Control backdrop blur density and reading font size.
                </p>
              </div>

              {/* Glass intensity */}
              <div>
                <label className="text-xs font-medium text-white/80 block mb-2">
                  Glass Blur & Dispersion Density
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['subtle', 'balanced', 'deep'] as const).map((intensity) => (
                    <button
                      key={intensity}
                      type="button"
                      onClick={() => {
                        playTactileSound('click', preferences.soundEffects);
                        onUpdatePreferences({ glassIntensity: intensity as GlassIntensity });
                      }}
                      className={`py-2 px-3 text-xs capitalize rounded-xl border transition-colors cursor-pointer ${
                        preferences.glassIntensity === intensity
                          ? 'border-amber-400 bg-white/[0.1] text-white font-medium'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs font-medium text-white/80 block mb-2 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-300" />
                  <span>Dialogue Typography Scale</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'sm', label: 'Compact (13px)' },
                      { id: 'base', label: 'Standard (15px)' },
                      { id: 'lg', label: 'Generous (17px)' },
                    ] as const
                  ).map((scale) => (
                    <button
                      key={scale.id}
                      type="button"
                      onClick={() => {
                        playTactileSound('click', preferences.soundEffects);
                        onUpdatePreferences({ fontSize: scale.id as FontSize });
                      }}
                      className={`py-2 px-3 text-xs rounded-xl border transition-colors cursor-pointer ${
                        preferences.fontSize === scale.id
                          ? 'border-amber-400 bg-white/[0.1] text-white font-medium'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                      }`}
                    >
                      {scale.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Particles toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div>
                  <div className="text-xs font-medium text-white">Atmospheric Micro-Particles</div>
                  <div className="text-[11px] text-white/45">Tiny ambient dust particles that gently float in the 3D space</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.enableParticles}
                  onChange={(e) => {
                    playTactileSound('toggle', preferences.soundEffects);
                    onUpdatePreferences({ enableParticles: e.target.checked });
                  }}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Profile & Data */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider mb-1">
                  Session Profile & Export
                </h4>
                <p className="text-xs text-white/50">
                  Manage your display identity and download or purge conversation records.
                </p>
              </div>

              <form onSubmit={handleSaveName} className="space-y-2">
                <label className="text-xs font-medium text-white/80 block">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/[0.05] border border-white/[0.12] text-white focus:border-amber-400 outline-none"
                    placeholder="Enter your name"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-medium rounded-xl bg-white/[0.1] hover:bg-white/[0.2] border border-white/[0.15] text-white transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                {savedNameNotice && (
                  <span className="text-[11px] text-emerald-400">Name updated successfully.</span>
                )}
              </form>

              {/* Firebase Cloud Sync Section */}
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                      {SITE_CONFIG.organizationName} Cloud Vault
                    </h4>
                    <p className="text-[11px] text-white/50">
                      Sync dialogues and preferences to {SITE_CONFIG.organizationName} Cloud Database
                    </p>
                  </div>
                  {firebaseUser ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/50 text-[11px] font-mono">
                      Offline Mode
                    </span>
                  )}
                </div>

                {firebaseUser ? (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-white">{firebaseUser.email || 'Authenticated User'}</div>
                      <div className="text-[10px] text-white/40 font-mono">UID: {firebaseUser.uid?.slice(0, 16)}...</div>
                    </div>
                    {onSignOutFirebase && (
                      <button
                        type="button"
                        onClick={onSignOutFirebase}
                        className="px-3 py-1 text-xs rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-white/80 hover:text-white transition-colors cursor-pointer"
                      >
                        Sign Out
                      </button>
                    )}
                  </div>
                ) : (
                  onSignInGoogle && (
                    <button
                      type="button"
                      onClick={onSignInGoogle}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-amber-700/30 hover:from-amber-600/50 hover:to-amber-700/50 border border-amber-500/40 text-amber-200 text-xs font-medium transition-all cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Connect to {SITE_CONFIG.organizationName} Cloud</span>
                    </button>
                  )
                )}
              </div>

              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                  Data Portability & Reset
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTactileSound('click', preferences.soundEffects);
                      onClose();
                      onResetSession();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white/80 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart Flow</span>
                  </button>
                </div>

                {exportedNotice && (
                  <span className="text-[11px] text-emerald-400 block">Conversation archive exported successfully.</span>
                )}
                {clearedNotice && (
                  <span className="text-[11px] text-red-300 block">All chat history cleared.</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.08] bg-black/40 text-xs text-white/40">
          <span>{SITE_CONFIG.organizationName} Engine · v{SITE_CONFIG.version}</span>
          <button
            type="button"
            onClick={() => {
              playTactileSound('click', preferences.soundEffects);
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.18] rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
