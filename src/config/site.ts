/**
 * Global Configuration for Aetheria Chat
 * Centralized settings including organization branding.
 */

export const SITE_CONFIG = {
  // Organization name is configured here in one place
  organizationName: 'AETHERIA',
  productName: 'Aetheria Chat',
  tagline: 'Quiet Intelligence. Pure Glass Architecture.',
  version: '2.5.0',
  description: 'A cinematic, Apple-inspired AI chatbot with warm brown and obsidian tones, 3D depth, and realistic liquid-glass effects.',
  storageKeyUser: 'aetheria_user_profile',
  storageKeyChats: 'aetheria_conversations',
  storageKeyPrefs: 'aetheria_preferences',
} as const;

export const STARTER_PROMPTS = [
  {
    title: 'Architectural Blueprint',
    prompt: 'Design a resilient, distributed event stream architecture for real-time spatial computing with sub-millisecond latency.',
    category: 'Architecture',
  },
  {
    title: 'Aesthetic Philosophy',
    prompt: 'Synthesize the design philosophy behind Dieter Rams, Jony Ive, and liquid-glass user interfaces.',
    category: 'Philosophy',
  },
  {
    title: 'Quantum Memory State',
    prompt: 'Explain quantum entanglement coherence times and topological qubits in elegant, intuitive language.',
    category: 'Science',
  },
  {
    title: 'Executive Briefing',
    prompt: 'Draft an executive strategy memo on balancing on-device intelligence with cryptographic data sovereignty.',
    category: 'Strategy',
  },
];
