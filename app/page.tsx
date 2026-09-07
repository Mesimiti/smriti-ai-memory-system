'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  FileText,
  Check,
  UserCheck,
  Terminal,
  Copy,
  MessageSquare,
  Send,
  SlidersHorizontal,
  Eye,
  Edit3,
  Search,
  CheckSquare,
  Square,
  TrendingUp,
  Tag,
  HelpCircle,
  Lightbulb,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Headphones,
  Compass,
  Zap,
  Briefcase,
  Flame,
  BookOpen,
  HeartHandshake,
  Quote,
  User,
  Link2,
  Unlink,
  ExternalLink,
  Filter,
  Clock,
  Network,
  Share2,
  Users,
  Phone,
  Mail,
  MessageCircle,
  UserPlus,
  Award,
  Calendar,
  Milestone,
  Target,
  Activity,
} from 'lucide-react';
import {
  signInWithGoogle,
  logOut,
  subscribeToAuth,
  saveMemory,
  fetchUserMemories,
  deleteMemory,
  isFirebaseConfigured,
  fetchUserProfile,
  createUserProfileRecord,
  verifyFirestoreConnection,
  verifyCrossUserIsolation,
  saveInteraction,
  updateMemoryActionItem,
  saveWisdomEntry,
  fetchUserWisdom,
  deleteWisdomEntry,
  updateWisdomEntry,
  linkWisdomAndMemory,
  saveBookWisdom,
  fetchUserBookWisdom,
  deleteBookWisdomEntry,
  updateBookWisdomEntry,
  linkBookAndMemory,
  saveTrustedContact,
  fetchTrustedContacts,
  updateTrustedContact,
  deleteTrustedContact,
  saveGrowthInsightsReport,
  fetchLatestGrowthInsightsReport,
  saveRetrievalLog,
  getRecentRetrievalLogs,
} from '@/lib/firebase';
import {
  StructuredMemory,
  UserSession,
  UserProfile,
  Message,
  ActionItem,
  ReflectionStyle,
  WisdomEntry,
  WisdomRelationship,
  BookWisdomEntry,
  RelatedWisdomItem,
  RelatedWisdomPrompt,
  TrustedContact,
  TrustedRelationship,
  PreferredContactMethod,
  ReachoutDraftResponse,
  GrowthInsightItem,
  GrowthInsightsReport,
  GrowthInsightCategory,
  RetrievalRankingFactors,
  RetrievedMemoryItem,
  CandidateWisdomItem,
  RetrievedBookItem,
  RetrievalProvenance,
  RetrievalOrchestratorResult,
  RetrievalLog,
} from '@/lib/types';
import { rankMemories, rankWisdomCandidates, rankBookWisdom } from '@/lib/retrieval';
import { RetrievalArchitectureView } from '@/components/RetrievalArchitectureView';
import { ProvenanceInspectionModal } from '@/components/ProvenanceInspectionModal';

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

/**
 * Normalizes raw Browser Events, DOMExceptions, or unexpected errors into clean structured Error objects.
 * Prevents Next.js next-devtools coerceError from receiving raw [object Event] instances.
 */
function toStructuredError(raw: unknown, fallbackMessage: string): Error {
  if (raw instanceof Error) {
    return raw;
  }
  if (typeof raw === 'string') {
    return new Error(`${fallbackMessage}: ${raw}`);
  }
  if (raw && typeof raw === 'object') {
    const errObj = raw as any;
    const msg =
      errObj.message ||
      errObj.error ||
      errObj.reason ||
      errObj.type ||
      errObj.name ||
      fallbackMessage;
    return new Error(`${fallbackMessage}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return new Error(`${fallbackMessage}: ${String(raw)}`);
}

const FIRESTORE_RULES_SOURCE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function verifying authenticated user ownership
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // User profile document: /users/{userId}
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // User structured memories subcollection: /users/{userId}/memories/{memoryId}
    match /users/{userId}/memories/{memoryId} {
      allow read, write: if isOwner(userId);
    }

    // User interactions subcollection: /users/{userId}/interactions/{interactionId}
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if isOwner(userId);
    }

    // User conversations subcollection: /users/{userId}/conversations/{conversationId}
    match /users/{userId}/conversations/{conversationId} {
      allow read, write: if isOwner(userId);
    }

    // Catch-all for any nested subcollections under the authenticated user
    match /users/{userId}/{allSubcollections=**} {
      allow read, write: if isOwner(userId);
    }
  }
}`;

interface ReflectionModeConfig {
  id: ReflectionStyle;
  label: string;
  tagline: string;
  description: string;
  bullets: string[];
  icon: any;
  colorClass: string;
  badgeClass: string;
  starterPrompts: string[];
}

const REFLECTION_MODES: ReflectionModeConfig[] = [
  {
    id: 'coach',
    label: 'Coach',
    tagline: 'Self-Discovery & Reflection',
    description: 'Focus on self-discovery, asking thoughtful questions, and encouraging deep reflection.',
    bullets: ['Focus on self-discovery', 'Ask questions', 'Encourage reflection'],
    icon: Compass,
    colorClass: 'amber',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    starterPrompts: [
      'What makes you different from a journal, note-taking app, or chatbot?',
      'I made a challenging decision today and want to unpack the tradeoffs.',
      'I felt strong friction during a conversation and want to understand why.',
      'What blind spots might I have regarding my current direction?',
    ],
  },
  {
    id: 'practical',
    label: 'Practical',
    tagline: 'Actions & Execution',
    description: 'Focus on concrete actions, tactical execution, and systematic problem solving.',
    bullets: ['Focus on actions', 'Focus on execution', 'Focus on problem solving'],
    icon: Zap,
    colorClass: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    starterPrompts: [
      'I completed an engineering milestone and want to distill what worked.',
      'I have a complex roadblock and need to break it down into immediate action steps.',
      'What concrete routines can eliminate recurring operational friction?',
      'How do I translate this qualitative insight into measurable execution goals?',
    ],
  },
  {
    id: 'mentor',
    label: 'Mentor',
    tagline: 'Career Growth & Leadership',
    description: 'Focus on career growth, leadership presence, high-stakes decision making, and long-term development.',
    bullets: ['Focus on career growth', 'Leadership', 'Decision making', 'Long-term development'],
    icon: Briefcase,
    colorClass: 'blue',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-200',
    starterPrompts: [
      'I am evaluating two career trajectories and need a strategic decision framework.',
      'How should I navigate a complex stakeholder alignment dilemma?',
      'What leadership capabilities should I prioritize cultivating this quarter?',
      'How do I balance immediate delivery pressure with long-term capability building?',
    ],
  },
  {
    id: 'motivational',
    label: 'Motivational',
    tagline: 'Encouragement & Strengths',
    description: 'Focus on positive encouragement, celebrating progress, reinforcing strengths, and building confidence.',
    bullets: ['Focus on encouragement', 'Celebrate progress', 'Reinforce strengths', 'Build confidence'],
    icon: Flame,
    colorClass: 'orange',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-200',
    starterPrompts: [
      'I had a grueling week and want to celebrate the progress made despite the odds.',
      'I am stepping into an unfamiliar initiative and want to reinforce my core strengths.',
      'Help me reflect on the resilience I demonstrated during a recent setback.',
      'What accomplishments from today deserve genuine recognition and celebration?',
    ],
  },
  {
    id: 'philosophical',
    label: 'Philosophical',
    tagline: 'Meaning, Values & Purpose',
    description: 'Focus on deeper meaning, foundational values, personal identity, and enduring purpose.',
    bullets: ['Focus on meaning', 'Values', 'Identity', 'Purpose'],
    icon: BookOpen,
    colorClass: 'purple',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
    starterPrompts: [
      'How does my current daily routine reflect what I truly value most?',
      'I want to examine whether my career ambitions align with my core identity.',
      'What does living an intentional, well-examined life look like right now?',
      'How can I cultivate inner tranquility while pursuing ambitious goals?',
    ],
  },
];

const VOICE_STYLE_SPEECH_PARAMS: Record<
  ReflectionStyle,
  { rate: number; pitch: number; styleDesc: string }
> = {
  coach: { rate: 0.95, pitch: 1.0, styleDesc: 'Calm, patient & thoughtful pacing' },
  practical: { rate: 1.05, pitch: 1.02, styleDesc: 'Crisp, direct & solution-focused' },
  mentor: { rate: 0.92, pitch: 0.98, styleDesc: 'Grounded, warm & reflective cadence' },
  motivational: { rate: 1.08, pitch: 1.06, styleDesc: 'Energetic, uplifting & inspiring' },
  philosophical: { rate: 0.86, pitch: 0.96, styleDesc: 'Unhurried, deep & meditative cadence' },
};

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
    .replace(/\*(.*?)\*/g, '$1') // remove italics
    .replace(/#{1,6}\s+/g, '') // remove headings
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // remove code blocks
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove links
    .replace(/[-*•]\s+/g, '') // remove bullets
    .replace(/\n+/g, ' ') // collapse newlines
    .trim();
}

const STARTER_PROMPTS = [
  'What makes you different from a journal, note-taking app, or chatbot?',
  'I made a challenging decision today and want to unpack the tradeoffs.',
  'I completed an engineering milestone and want to distill what worked.',
  'I had an insight about my problem-solving approach that I want to remember.',
];

let globalIdCounter = 0;
function createId(prefix: string): string {
  globalIdCounter += 1;
  return `${prefix}_${Date.now()}_${globalIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function getIsoTimestamp(): string {
  return new Date().toISOString();
}

function getShortTime(): string {
  return new Date().toISOString().slice(11, 19);
}

export default function HomePage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'reflect' | 'vault' | 'wisdom' | 'books' | 'trusted' | 'growth' | 'retrieval' | 'verification' | 'rules'>('reflect');

  // V3 Retrieval Architecture State
  const [allowSessionWisdomOptIn, setAllowSessionWisdomOptIn] = useState<boolean>(false); // Strict Opt-In Gate (default: OFF)
  const [userConsentedWisdomIds, setUserConsentedWisdomIds] = useState<string[]>([]);
  const [latestRetrievalResult, setLatestRetrievalResult] = useState<RetrievalOrchestratorResult | null>(null);
  const [pendingWisdomConsentCandidate, setPendingWisdomConsentCandidate] = useState<CandidateWisdomItem | null>(null);
  const [retrievalLogs, setRetrievalLogs] = useState<RetrievalLog[]>([]);
  const [retrievalStudioQuery, setRetrievalStudioQuery] = useState<string>('navigating leadership friction and prioritizing deep focus');
  const [retrievalStudioMemories, setRetrievalStudioMemories] = useState<RetrievedMemoryItem[]>([]);
  const [retrievalStudioWisdom, setRetrievalStudioWisdom] = useState<CandidateWisdomItem[]>([]);
  const [retrievalStudioBooks, setRetrievalStudioBooks] = useState<RetrievedBookItem[]>([]);
  const [isTestingRetrievalStudio, setIsTestingRetrievalStudio] = useState<boolean>(false);
  const [selectedInspectionMemory, setSelectedInspectionMemory] = useState<RetrievedMemoryItem | null>(null);
  const [selectedInspectionWisdom, setSelectedInspectionWisdom] = useState<CandidateWisdomItem | null>(null);
  const [selectedInspectionProvenance, setSelectedInspectionProvenance] = useState<RetrievalProvenance | null>(null);
  const [expandedProvenanceMessageId, setExpandedProvenanceMessageId] = useState<string | null>(null);

  // Multi-Turn Conversation State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg-1',
      role: 'model',
      content:
        'Namaste. I am Smriti, your Personal Memory Agent. What experience, project milestone, or reflection would you like to unpack today?',
      timestamp: '2026-03-01T00:00:00.000Z',
    },
  ]);
  const [conversationInput, setConversationInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Reflection Style State (Coach, Practical, Mentor, Motivational, Philosophical)
  const [selectedStyle, setSelectedStyle] = useState<ReflectionStyle>('coach');

  // Voice Input (Speech-to-Text) State
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Spoken Voice Agent (TTS & Two-Way Hands-Free Session) State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const [voiceSessionOpen, setVoiceSessionOpen] = useState(false);
  const [voiceAgentState, setVoiceAgentState] = useState<'idle' | 'listening' | 'reflecting' | 'speaking'>('idle');
  const [voiceInterimTranscript, setVoiceInterimTranscript] = useState('');
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [voiceSessionError, setVoiceSessionError] = useState<string | null>(null);

  // Stale-closure refs for voice loop
  const voiceSessionOpenRef = useRef(false);
  const handsFreeModeRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const selectedStyleRef = useRef<ReflectionStyle>('coach');
  const voiceSessionRecognitionRef = useRef<any>(null);

  useEffect(() => {
    voiceSessionOpenRef.current = voiceSessionOpen;
  }, [voiceSessionOpen]);

  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  useEffect(() => {
    selectedStyleRef.current = selectedStyle;
  }, [selectedStyle]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Global Browser Event Shield to Prevent Raw [object Event] Crashes in next-devtools / iframes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGlobalError = (event: ErrorEvent) => {
      const rawError = event.error || (event as any);
      const isRawEvent =
        !(rawError instanceof Error) ||
        (rawError && typeof rawError === 'object' && ('type' in rawError || 'bubbles' in rawError));

      const isSpeechOrMediaEvent =
        event.message?.toLowerCase().includes('speech') ||
        event.message?.toLowerCase().includes('audio') ||
        event.message?.toLowerCase().includes('microphone') ||
        event.message?.toLowerCase().includes('notallowederror') ||
        (rawError &&
          (rawError.error === 'not-allowed' ||
            rawError.error === 'service-not-allowed' ||
            rawError.error === 'canceled' ||
            rawError.error === 'no-speech' ||
            rawError.name === 'NotAllowedError'));

      if (isRawEvent || isSpeechOrMediaEvent) {
        try {
          event.preventDefault?.();
          event.stopPropagation?.();
          event.stopImmediatePropagation?.();
        } catch {
          // ignore
        }
        const errorDetail =
          rawError?.message ||
          rawError?.error ||
          event.message ||
          (typeof rawError === 'string' ? rawError : 'Handled browser event');
        console.warn(`[Smriti AI Event Shield]: Handled browser event safely: ${errorDetail}`);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const isRawEvent =
        !(reason instanceof Error) ||
        (reason && typeof reason === 'object' && ('type' in reason || 'bubbles' in reason));

      if (isRawEvent) {
        try {
          event.preventDefault?.();
          event.stopPropagation?.();
          event.stopImmediatePropagation?.();
        } catch {
          // ignore
        }
        const reasonDetail =
          reason?.message ||
          reason?.error ||
          (typeof reason === 'string' ? reason : 'Handled unhandled rejection event');
        console.warn(`[Smriti AI Event Shield]: Handled unhandled promise event: ${reasonDetail}`);
      }
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  // Human Review & Approval Workflow State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [draftMemory, setDraftMemory] = useState<StructuredMemory | null>(null);
  const [isSavingApproved, setIsSavingApproved] = useState(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [newThemeInput, setNewThemeInput] = useState('');
  const [newLearningInput, setNewLearningInput] = useState('');
  const [newActionInput, setNewActionInput] = useState('');

  // Memory Vault State
  const [memories, setMemories] = useState<StructuredMemory[]>([]);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>('ALL');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('ALL');
  const [expandedExplanationId, setExpandedExplanationId] = useState<string | null>(null);

  // Wisdom Circle State (Preserve advice, wisdom, philosophies from people who shaped you)
  const [wisdomList, setWisdomList] = useState<WisdomEntry[]>([]);
  const [wisdomSearchQuery, setWisdomSearchQuery] = useState('');
  const [selectedRelationshipFilter, setSelectedRelationshipFilter] = useState<string>('ALL');
  const [wisdomModalOpen, setWisdomModalOpen] = useState(false);
  const [editingWisdomId, setEditingWisdomId] = useState<string | null>(null);
  const [wisdomForm, setWisdomForm] = useState<{
    personName: string;
    relationship: WisdomRelationship | string;
    wisdomText: string;
    situation: string;
    whyItMatters: string;
    tags: string[];
    themes: string[];
    linkedMemoryIds: string[];
  }>({
    personName: '',
    relationship: 'Mother',
    wisdomText: '',
    situation: '',
    whyItMatters: '',
    tags: [],
    themes: [],
    linkedMemoryIds: [],
  });
  const [isSavingWisdom, setIsSavingWisdom] = useState(false);
  const [wisdomFormTagInput, setWisdomFormTagInput] = useState('');
  const [wisdomFormThemeInput, setWisdomFormThemeInput] = useState('');

  // Strict Consent-Gated Retrieval State
  // NEVER automatically surface wisdom; require explicit user consent
  const [consultConsentModalOpen, setConsultConsentModalOpen] = useState(false);
  const [selectedWisdomForConsult, setSelectedWisdomForConsult] = useState<WisdomEntry | null>(null);
  const [consentedWisdomAttached, setConsentedWisdomAttached] = useState<WisdomEntry | null>(null);

  // Cross-Linking Modals (Wisdom <-> Memory Vault)
  const [linkMemoryModalWisdom, setLinkMemoryModalWisdom] = useState<WisdomEntry | null>(null);
  const [linkWisdomModalMemory, setLinkWisdomModalMemory] = useState<StructuredMemory | null>(null);

  // Book Wisdom State (Preserve ideas, lessons, quotes, and reflections from books)
  const [bookWisdomList, setBookWisdomList] = useState<BookWisdomEntry[]>([]);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [selectedBookAuthorFilter, setSelectedBookAuthorFilter] = useState<string>('ALL');
  const [selectedBookThemeFilter, setSelectedBookThemeFilter] = useState<string>('ALL');
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState<{
    bookTitle: string;
    author: string;
    keyIdea: string;
    quote: string;
    personalReflection: string;
    tags: string[];
    themes: string[];
    linkedMemoryIds: string[];
  }>({
    bookTitle: '',
    author: '',
    keyIdea: '',
    quote: '',
    personalReflection: '',
    tags: [],
    themes: [],
    linkedMemoryIds: [],
  });
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [bookFormTagInput, setBookFormTagInput] = useState('');
  const [bookFormThemeInput, setBookFormThemeInput] = useState('');

  // Cross-Linking Modals (Book <-> Memory Vault)
  const [linkMemoryModalBook, setLinkMemoryModalBook] = useState<BookWisdomEntry | null>(null);
  const [linkBookModalMemory, setLinkBookModalMemory] = useState<StructuredMemory | null>(null);

  // Related Wisdom Retrieval & Knowledge Graph State
  const [isSearchingRelatedWisdom, setIsSearchingRelatedWisdom] = useState(false);
  const [pendingWisdomPrompt, setPendingWisdomPrompt] = useState<RelatedWisdomPrompt | null>(null);
  const [isReviewingRelatedWisdom, setIsReviewingRelatedWisdom] = useState(false);
  const [activeKnowledgeGraphTab, setActiveKnowledgeGraphTab] = useState<'cards' | 'graph'>('cards');
  const [relatedWisdomCategoryFilter, setRelatedWisdomCategoryFilter] = useState<'ALL' | 'memory' | 'wisdom' | 'book'>('ALL');
  const [selectedRelatedWisdomItem, setSelectedRelatedWisdomItem] = useState<RelatedWisdomItem | null>(null);

  // Trusted Circle State (People you trust and may want to reconnect with during difficult periods)
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [trustedSearchQuery, setTrustedSearchQuery] = useState('');
  const [selectedTrustedRelFilter, setSelectedTrustedRelFilter] = useState<string>('ALL');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<{
    name: string;
    relationship: TrustedRelationship;
    whyTheyMatter: string;
    preferredMethod: PreferredContactMethod;
    contactDetail: string;
    optionalNotes: string;
    tags: string[];
  }>({
    name: '',
    relationship: 'Friend',
    whyTheyMatter: '',
    preferredMethod: 'Text / SMS',
    contactDetail: '',
    optionalNotes: '',
    tags: [],
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactFormTagInput, setContactFormTagInput] = useState('');

  // Reachout Draft Assistant State (Human Connection Bridge)
  const [reachoutModalOpen, setReachoutModalOpen] = useState(false);
  const [selectedContactForReachout, setSelectedContactForReachout] = useState<TrustedContact | null>(null);
  const [reachoutUserExperience, setReachoutUserExperience] = useState('');
  const [reachoutSupportSeeking, setReachoutSupportSeeking] = useState('');
  const [reachoutTone, setReachoutTone] = useState<'Gentle & Vulnerable' | 'Brief & Direct' | 'Warm & Casual'>('Gentle & Vulnerable');
  const [isDraftingReachout, setIsDraftingReachout] = useState(false);
  const [draftResult, setDraftResult] = useState<ReachoutDraftResponse | null>(null);
  const [editableDraftMessage, setEditableDraftMessage] = useState('');
  const [copiedDraftSuccess, setCopiedDraftSuccess] = useState(false);
  const [draftApprovedByUser, setDraftApprovedByUser] = useState(false);

  // Chat Proactive Reachout Assistance Offer Prompt
  const [reachoutOfferPrompt, setReachoutOfferPrompt] = useState<{ open: boolean; contextSnippet: string } | null>(null);

  // Interactive Verification Suite State
  const [firestoreStatus, setFirestoreStatus] = useState<{
    checked: boolean;
    success: boolean;
    message: string;
    mode: string;
  } | null>(null);

  const [userDocStatus, setUserDocStatus] = useState<{
    checked: boolean;
    success: boolean;
    message: string;
    profile?: UserProfile | null;
  } | null>(null);

  const [crossUserStatus, setCrossUserStatus] = useState<{
    checked: boolean;
    blocked: boolean;
    message: string;
  } | null>(null);

  const [writeTestStatus, setWriteTestStatus] = useState<{
    checked: boolean;
    success: boolean;
    message: string;
    path?: string;
    isPermissionDenied?: boolean;
    docId?: string;
  } | null>(null);

  const [copiedRules, setCopiedRules] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Growth Intelligence Dashboard State
  const [growthReport, setGrowthReport] = useState<GrowthInsightsReport | null>(null);
  const [isGeneratingGrowthReport, setIsGeneratingGrowthReport] = useState(false);
  const [growthError, setGrowthError] = useState<string | null>(null);
  const [growthTimelineFilter, setGrowthTimelineFilter] = useState<'ALL' | ReflectionStyle>('ALL');
  const [activeJourneyStage, setActiveJourneyStage] = useState<number>(0);
  const [expandedLearningMemoryId, setExpandedLearningMemoryId] = useState<string | null>(null);
  const [selectedGrowthThemeFilter, setSelectedGrowthThemeFilter] = useState<string | null>(null);

  // Activity & Verification Logs
  const [logs, setLogs] = useState<
    Array<{ id: string; timestamp: string; level: 'success' | 'info' | 'warn' | 'error'; text: string }>
  >([
    {
      id: 'log-0',
      timestamp: '00:00:00',
      level: 'info',
      text: 'Smriti AI initialized. Monitoring Firebase Authentication and Firestore state.',
    },
  ]);

  const addLog = (level: 'success' | 'info' | 'warn' | 'error', text: string) => {
    const timestamp = getShortTime();
    setLogs((prev) => [
      {
        id: createId('log'),
        timestamp,
        level,
        text,
      },
      ...prev.slice(0, 49),
    ]);
  };

  // Subscribe to auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (session) => {
      setUser(session);
      setLoadingAuth(false);

      if (session) {
        addLog('success', `Auth State: Active session for ${session.email} (UID: ${session.uid})`);
        try {
          const profile = await fetchUserProfile(session.uid);
          if (profile) {
            setUserProfile(profile);
            setUserDocStatus({
              checked: true,
              success: true,
              message: `User profile document confirmed at /users/${session.uid}`,
              profile,
            });
          }
        } catch (profileErr: any) {
          console.warn('Profile fetch notice:', profileErr?.message);
        }

        try {
          const userMems = await fetchUserMemories(session.uid);
          setMemories(userMems);
        } catch (memErr: any) {
          console.warn('Memories fetch notice:', memErr?.message);
        }

        try {
          const userWisdom = await fetchUserWisdom(session.uid);
          setWisdomList(userWisdom);
        } catch (wErr: any) {
          console.warn('Wisdom fetch notice:', wErr?.message);
        }

        try {
          const userBooks = await fetchUserBookWisdom(session.uid);
          setBookWisdomList(userBooks);
        } catch (bErr: any) {
          console.warn('Book wisdom fetch notice:', bErr?.message);
        }

        try {
          const userContacts = await fetchTrustedContacts(session.uid);
          setTrustedContacts(userContacts);
        } catch (cErr: any) {
          console.warn('Trusted contacts fetch notice:', cErr?.message);
        }

        try {
          const report = await fetchLatestGrowthInsightsReport(session.uid);
          if (report) {
            setGrowthReport(report);
          }
        } catch (rErr: any) {
          console.warn('Growth report fetch notice:', rErr?.message);
        }

        try {
          const logs = await getRecentRetrievalLogs(session.uid);
          setRetrievalLogs(logs);
        } catch (lErr: any) {
          console.warn('Retrieval logs fetch notice:', lErr?.message);
        }
      } else {
        addLog('info', 'Auth State: No active user session (Unauthenticated)');
        setUserProfile(null);
        setMemories([]);
        setWisdomList([]);
        setBookWisdomList([]);
        setTrustedContacts([]);
        setGrowthReport(null);
        setConsentedWisdomAttached(null);
        setUserDocStatus(null);
        setRetrievalLogs([]);
        setLatestRetrievalResult(null);
        setPendingWisdomConsentCandidate(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    try {
      setLoadingAuth(true);
      setAuthError(null);
      addLog('info', 'Initiating Google Sign-In with Firebase Auth...');

      const { session, profile } = await signInWithGoogle();
      setUser(session);
      setUserProfile(profile);

      addLog('success', `Login Successful! Signed in as ${session.displayName || session.email} (${session.uid})`);
      addLog('success', `User profile document automatically created/updated in Firestore at /users/${session.uid}`);

      setUserDocStatus({
        checked: true,
        success: true,
        message: `Profile record confirmed at /users/${session.uid}`,
        profile,
      });

      const userMems = await fetchUserMemories(session.uid);
      setMemories(userMems);

      const userWisdom = await fetchUserWisdom(session.uid);
      setWisdomList(userWisdom);

      const userBooks = await fetchUserBookWisdom(session.uid);
      setBookWisdomList(userBooks);

      const userContacts = await fetchTrustedContacts(session.uid);
      setTrustedContacts(userContacts);

      const report = await fetchLatestGrowthInsightsReport(session.uid);
      if (report) {
        setGrowthReport(report);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      const errMsg = err?.message || 'Authentication error';
      setAuthError(errMsg);
      addLog('error', `Authentication error: ${errMsg}`);
    } finally {
      setLoadingAuth(false);
    }
  };

  // Handle Sign-Out
  const handleSignOut = async () => {
    try {
      const email = user?.email;
      await logOut();
      setUser(null);
      setUserProfile(null);
      setMemories([]);
      setWisdomList([]);
      setBookWisdomList([]);
      setTrustedContacts([]);
      setGrowthReport(null);
      setConsentedWisdomAttached(null);
      setUserDocStatus(null);
      setCrossUserStatus(null);
      setFirestoreStatus(null);
      addLog('info', `Signed out ${email || 'user'}. Session destroyed and memory cleared.`);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      addLog('error', `Sign-out error: ${err.message}`);
    }
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Toggle Browser Speech-to-Text Voice Input
  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      addLog('warn', 'Speech-to-text not supported in current browser.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
      setIsListening(false);
      addLog('info', 'Voice input stopped.');
      return;
    }

    try {
      setVoiceError(null);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const initialText = conversationInput;

      recognition.onstart = () => {
        setIsListening(true);
        addLog('info', 'Microphone active. Listening for reflection speech...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        if (event && event.results) {
          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res && res[0] && typeof res[0].transcript === 'string') {
              transcript += res[0].transcript;
            }
          }
        }

        const speechText = transcript.trim();
        if (speechText) {
          const prefix = initialText ? initialText.trim() + ' ' : '';
          setConversationInput(prefix + speechText);
        }
      };

      recognition.onerror = (event: any) => {
        try {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          event?.stopImmediatePropagation?.();
        } catch {
          // ignore
        }
        const errorType = typeof event?.error === 'string' ? event.error : 'unknown';
        console.warn('Speech recognition notice:', errorType);
        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
          setVoiceError('Microphone access was not permitted. You can continue by typing your reflections.');
          addLog('warn', 'Microphone access denied or unavailable in browser.');
        } else if (errorType === 'no-speech') {
          addLog('info', 'No speech detected.');
        } else {
          setVoiceError(`Voice input event: ${errorType}`);
          addLog('warn', `Voice input event: ${errorType}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      const structErr = toStructuredError(err, 'Speech recognition start notice');
      console.warn('Speech recognition could not be started:', structErr.message);
      setIsListening(false);
      setVoiceError('Microphone input is currently unavailable. You can type freely.');
      addLog('warn', `Microphone notice: ${structErr.message}`);
    }
  };

  // -------------------------------------------------------------
  // Voice Agent: Text-to-Speech (TTS) & Interactive Voice Companion
  // -------------------------------------------------------------
  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Error cancelling speech synthesis:', e);
      }
    }
    setIsSpeaking(false);
    setCurrentlySpeakingId(null);
    if (voiceSessionOpenRef.current && voiceAgentState === 'speaking') {
      setVoiceAgentState('idle');
    }
  };

  const speakText = (text: string, msgId?: string, onEndCallback?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      addLog('warn', 'Text-to-speech is not supported in this browser.');
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const clean = cleanTextForSpeech(text);
      if (!clean) {
        if (onEndCallback) onEndCallback();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      const styleParams =
        VOICE_STYLE_SPEECH_PARAMS[selectedStyleRef.current] || { rate: 1.0, pitch: 1.0, styleDesc: 'Normal' };
      utterance.rate = styleParams.rate;
      utterance.pitch = styleParams.pitch;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Karen') ||
              v.name.includes('Serena'))
        ) || voices.find((v) => v.lang.startsWith('en'));

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (msgId) setCurrentlySpeakingId(msgId);
        if (voiceSessionOpenRef.current) {
          setVoiceAgentState('speaking');
        }
        addLog('info', `Voice Agent speaking in [${selectedStyleRef.current.toUpperCase()}] mode (${styleParams.styleDesc})...`);
      };

      // Heartbeat to prevent Chromium SpeechSynthesis 15s pause bug
      let heartbeat: any = null;
      heartbeat = setInterval(() => {
        try {
          if (!window?.speechSynthesis?.speaking) {
            if (heartbeat) clearInterval(heartbeat);
          } else {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 10000);

      const cleanupUtterance = () => {
        if (heartbeat) clearInterval(heartbeat);
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
        if (voiceSessionOpenRef.current) {
          setVoiceAgentState('idle');
        }
      };

      utterance.onend = () => {
        cleanupUtterance();
        if (onEndCallback) {
          onEndCallback();
        }
      };

      utterance.onerror = (event: any) => {
        try {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          event?.stopImmediatePropagation?.();
        } catch {
          // ignore
        }
        const errType = typeof event?.error === 'string' ? event.error : 'interrupted_or_stopped';
        if (errType !== 'canceled' && errType !== 'interrupted') {
          console.warn('Speech synthesis notice:', errType);
        }
        cleanupUtterance();
        if (onEndCallback) {
          onEndCallback();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err: unknown) {
      const structErr = toStructuredError(err, 'Speech synthesis notice');
      console.warn('Speech synthesis initialization notice:', structErr.message);
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
      if (onEndCallback) onEndCallback();
    }
  };

  const stopVoiceSessionListening = () => {
    if (voiceSessionRecognitionRef.current) {
      try {
        voiceSessionRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  };

  const startVoiceSessionListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSessionError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      addLog('error', 'Speech recognition API not supported by browser.');
      return;
    }

    if (isSpeakingRef.current) {
      stopSpeaking();
    }

    try {
      stopVoiceSessionListening();
      setVoiceSessionError(null);
      setVoiceInterimTranscript('');

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let capturedText = '';

      recognition.onstart = () => {
        setVoiceAgentState('listening');
        addLog('info', 'Voice Companion: Listening for your spoken reflection...');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        if (event && event.results) {
          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res && res[0] && typeof res[0].transcript === 'string') {
              if (res.isFinal) {
                capturedText += res[0].transcript;
              } else {
                interim += res[0].transcript;
              }
            }
          }
        }
        setVoiceInterimTranscript(interim || capturedText);
      };

      recognition.onerror = (event: any) => {
        try {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          event?.stopImmediatePropagation?.();
        } catch {
          // ignore
        }
        const errorType = typeof event?.error === 'string' ? event.error : 'unknown';
        console.warn('Voice session recognition notice:', errorType);
        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
          setVoiceSessionError('Microphone permission was denied or restricted. Please type your reflection.');
          setVoiceAgentState('idle');
        } else if (errorType === 'no-speech') {
          if (voiceSessionOpenRef.current && !isSpeakingRef.current) {
            setVoiceAgentState('idle');
          }
        } else {
          setVoiceSessionError(`Voice event: ${errorType}`);
          setVoiceAgentState('idle');
        }
      };

      recognition.onend = () => {
        const spoken = (capturedText || voiceInterimTranscript).trim();
        setVoiceInterimTranscript('');
        if (spoken && voiceSessionOpenRef.current) {
          setVoiceAgentState('reflecting');
          handleSendMessage(spoken);
        } else {
          if (voiceSessionOpenRef.current && !isSpeakingRef.current) {
            setVoiceAgentState('idle');
          }
        }
      };

      voiceSessionRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      const structErr = toStructuredError(err, 'Voice session recognition notice');
      console.warn('Voice session could not start listening:', structErr.message);
      setVoiceSessionError('Microphone is unavailable in this frame. Type your message.');
      setVoiceAgentState('idle');
    }
  };

  const startVoiceSession = () => {
    stopSpeaking();
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    }
    setVoiceSessionOpen(true);
    setVoiceSessionError(null);
    setVoiceAgentState('listening');
    addLog('info', 'Voice Companion session initiated.');
    setTimeout(() => {
      startVoiceSessionListening();
    }, 250);
  };

  const closeVoiceSession = () => {
    stopSpeaking();
    stopVoiceSessionListening();
    setVoiceSessionOpen(false);
    setVoiceAgentState('idle');
    setVoiceInterimTranscript('');
    addLog('info', 'Voice Companion session closed. Dialogue preserved in chat.');
  };

  // -------------------------------------------------------------
  // 1. Multi-Turn Conversation Handler
  // -------------------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    const text = (textToSend || conversationInput).trim();
    if (!text || isSendingMessage) return;

    const userMsg: Message = {
      id: createId('msg-user'),
      role: 'user',
      content: text,
      timestamp: getIsoTimestamp(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setConversationInput('');
    setIsSendingMessage(true);

    // Concurrently search for potentially related wisdom across Memories, Wisdom Circle, and Book Wisdom
    searchRelatedWisdom(text);

    // If user indicates feeling overwhelmed, struggling to explain, or isolated, offer to assist with Trusted Circle reachout
    const isStrugglingOrOverwhelmed = /(overwhelm|struggl|don't know how to explain|hard to talk|isolated|lonely|reach out|disconnect|can't explain|anxious|burden|alone|need someone|talk to someone)/i.test(text);
    if (isStrugglingOrOverwhelmed) {
      setReachoutOfferPrompt({
        open: true,
        contextSnippet: text,
      });
      addLog('info', 'Smriti detected communication challenge or feeling overwhelmed. Offering Trusted Circle drafting assistance.');
    }

    try {
      if (voiceSessionOpenRef.current) {
        setVoiceAgentState('reflecting');
      }
      if (consentedWisdomAttached) {
        addLog(
          'info',
          `V3 Retrieval: Sending reflection with user-consented Wisdom guidance from ${consentedWisdomAttached.personName} (${consentedWisdomAttached.relationship})...`
        );
      } else {
        addLog('info', `V3 Retrieval: Orchestrating dual-index retrieval across Memory Vault & Wisdom Circle (${selectedStyle} mode)...`);
      }

      // V3 Retrieval Orchestrator Call
      const res = await fetch('/api/agent/retrieval-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          reflectionStyle: selectedStyle,
          memories: memories,
          wisdomList: wisdomList,
          bookList: bookWisdomList,
          consentedWisdomIds: consentedWisdomAttached
            ? Array.from(new Set([consentedWisdomAttached.id, ...userConsentedWisdomIds]))
            : userConsentedWisdomIds,
          allowWisdomOptIn: allowSessionWisdomOptIn,
          userId: user?.uid,
        }),
      });

      const data: RetrievalOrchestratorResult = await res.json();
      if (!res.ok) {
        throw new Error((data as any).error || 'V3 Retrieval Orchestrator error');
      }

      setLatestRetrievalResult(data);

      // Model Message with full Retrieval Provenance
      const modelMsg: Message = {
        id: createId('msg-model'),
        role: 'model',
        content: data.reply || 'Thank you for reflecting on this experience.',
        timestamp: getIsoTimestamp(),
        provenance: data.provenance,
        retrievalLogId: data.retrievalLogId,
        candidateWisdom: data.candidateWisdom,
      };

      setMessages((prev) => [...prev, modelMsg]);

      // If there are candidate wisdom entries requiring consent:
      if (data.candidateWisdom && data.candidateWisdom.length > 0) {
        // Find the top unconsented candidate
        const unconsentedTop = data.candidateWisdom.find((w) => !w.isConsented);
        if (unconsentedTop) {
          setPendingWisdomConsentCandidate(unconsentedTop);
          addLog(
            'info',
            `Wisdom Circle Consent Gate: Discovered relevant advice from ${unconsentedTop.personName} (${unconsentedTop.relationship}). Awaiting user consent before injecting.`
          );
        } else {
          setPendingWisdomConsentCandidate(null);
        }
      } else {
        setPendingWisdomConsentCandidate(null);
      }

      // Log success with retrieval metrics
      const memCount = (data.retrievedMemories || []).length;
      const wisCount = (data.consentedWisdomInjected || []).length;
      const bookCount = (data.retrievedBooks || []).length;
      addLog(
        'success',
        `Smriti V3 Agent synthesized response via ${data.modelUsed || 'Gemini'} [${selectedStyle.toUpperCase()}] • ${memCount} memories auto-retrieved • ${wisCount} wisdom mentors consented • ${bookCount} book insights referenced`
      );

      // Save retrieval log to Firestore & local state
      if (user?.uid && data.retrievalLogId) {
        const logItem: RetrievalLog = {
          id: data.retrievalLogId,
          userId: user.uid,
          reflectionQuery: text,
          reflectionStyle: selectedStyle,
          retrievedMemoriesCount: memCount,
          retrievedMemories: (data.retrievedMemories || []).map((m) => ({
            id: m.id,
            summary: m.summary,
            relevanceScore: m.relevanceScore,
            rankingFactors: m.rankingFactors,
            automaticallyIncluded: true,
          })),
          candidateWisdomCount: (data.candidateWisdom || []).length,
          candidateWisdom: (data.candidateWisdom || []).map((w) => ({
            id: w.id,
            personName: w.personName,
            relationship: w.relationship,
            wisdomSnippet: (w.wisdomText || '').slice(0, 100),
            relevanceScore: w.relevanceScore,
            userConsented: Boolean(w.isConsented),
          })),
          consentedWisdomInjectedCount: wisCount,
          modelUsed: data.modelUsed || 'gemini-3.6-flash',
          latencyMs: data.latencyMs || 0,
          createdAt: getIsoTimestamp(),
        };

        saveRetrievalLog(user.uid, logItem)
          .then(() => {
            setRetrievalLogs((prev) => [logItem, ...prev.filter((l) => l.id !== logItem.id)].slice(0, 30));
          })
          .catch((err) => {
            console.warn('Failed to save retrieval log:', err?.message);
          });
      }

      // If Auto-Speak or Voice Session is active, vocalize response
      if (autoSpeakEnabled || voiceSessionOpenRef.current) {
        speakText(modelMsg.content, modelMsg.id, () => {
          if (voiceSessionOpenRef.current && handsFreeModeRef.current) {
            setTimeout(() => {
              if (voiceSessionOpenRef.current) {
                startVoiceSessionListening();
              }
            }, 600);
          }
        });
      }
    } catch (err: any) {
      console.error('Conversation error:', err);
      addLog('error', `V3 Retrieval error: ${err.message}`);
      const fallbackMsg: Message = {
        id: createId('msg-fallback'),
        role: 'model',
        content: `I received your thought and noted it. What is the core lesson or next step you want to carry forward from this?`,
        timestamp: getIsoTimestamp(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);

      if (autoSpeakEnabled || voiceSessionOpenRef.current) {
        speakText(fallbackMsg.content, fallbackMsg.id, () => {
          if (voiceSessionOpenRef.current && handsFreeModeRef.current) {
            setTimeout(() => {
              if (voiceSessionOpenRef.current) {
                startVoiceSessionListening();
              }
            }, 600);
          }
        });
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // -------------------------------------------------------------
  // V3 Retrieval Architecture: Strict Consent Gate & Simulation
  // -------------------------------------------------------------
  const handleGrantConsentForCandidateWisdom = async (candidate: CandidateWisdomItem) => {
    // 1. Add candidate id to user-consented set
    setUserConsentedWisdomIds((prev) => Array.from(new Set([...prev, candidate.id])));

    // 2. Attach as active wisdom context
    const wisdomEntry = wisdomList.find((w) => w.id === candidate.id);
    if (wisdomEntry) {
      setConsentedWisdomAttached(wisdomEntry);
    }
    setPendingWisdomConsentCandidate(null);

    addLog(
      'success',
      `Affirmative Consent Granted: Integrating Wisdom Circle guidance from ${candidate.personName} (${candidate.relationship}). Re-synthesizing reflection...`
    );

    // 3. Trigger reflection re-synthesis with the consented wisdom
    const consentReQuery = `Please integrate and synthesize the wisdom from ${candidate.personName} (${candidate.relationship}): "${candidate.wisdomText}" into our ongoing reflection.`;
    await handleSendMessage(consentReQuery);
  };

  const handleDeclineCandidateWisdom = (candidateId: string) => {
    setPendingWisdomConsentCandidate(null);
    addLog('info', 'User opted to keep Wisdom Circle entry private. Reflection preserved with Memory Vault context only.');
  };

  const handleRunRetrievalStudioSimulation = () => {
    if (!retrievalStudioQuery.trim()) return;
    setIsTestingRetrievalStudio(true);

    try {
      // Real user data or rich representative fallback
      const sourceMemories = memories.length > 0 ? memories : [
        {
          id: 'sample-mem-1',
          userId: user?.uid || 'demo-user',
          summary: 'Navigating stakeholder tension during critical architectural launch',
          keyLearnings: [
            'Align on the shared objective before debating implementation details',
            'Over-communicate early and transparently when timelines are at risk',
          ],
          tags: ['leadership', 'stakeholders', 'communication', 'focus'],
          themes: ['Career Growth', 'Conflict Resolution', 'Prioritization'],
          reflectionNotes: 'Learned to stay calm when priorities collide.',
          aiExplanation: 'Synthesized from deep project debrief.',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          actionItems: [{ id: 'a1', text: 'Schedule alignment check-in', completed: true }],
        },
        {
          id: 'sample-mem-2',
          userId: user?.uid || 'demo-user',
          summary: 'Overcoming cognitive overload by creating deep focus time-blocks',
          keyLearnings: [
            'Context switching destroys 80% of strategic bandwidth',
            'Defend morning hours for creative synthesis',
          ],
          tags: ['focus', 'productivity', 'habits', 'deep-work'],
          themes: ['Mindfulness', 'Personal Development', 'Productivity'],
          reflectionNotes: 'Energy is more important to manage than time.',
          aiExplanation: 'Reflected on work burnout and boundaries.',
          createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
          actionItems: [{ id: 'a2', text: 'Block 9am-11am on calendar', completed: true }],
        },
        {
          id: 'sample-mem-3',
          userId: user?.uid || 'demo-user',
          summary: 'Learning to say no gracefully to non-essential commitments',
          keyLearnings: [
            'A clear no is kinder than a delayed maybe',
            'Every yes is a no to something you deeply care about',
          ],
          tags: ['boundaries', 'decisions', 'prioritization', 'clarity'],
          themes: ['Decision Making', 'Values', 'Time Management'],
          reflectionNotes: 'Gained freedom after establishing strict personal criteria.',
          aiExplanation: 'Extracted during personal values review.',
          createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          actionItems: [{ id: 'a3', text: 'Decline volunteer committee', completed: true }],
        },
      ];

      const rankedMem = rankMemories(retrievalStudioQuery, sourceMemories, 0.2, 5);
      setRetrievalStudioMemories(rankedMem);

      const sourceWisdom = wisdomList.length > 0 ? wisdomList : [
        {
          id: 'sample-wis-1',
          userId: user?.uid || 'demo-user',
          personName: 'Professor Marcus Reed',
          relationship: 'Mentor',
          wisdomText: 'Never mistake motion for direction. When friction escalates, slow down and clarify the foundational principle.',
          situation: 'Guiding through early career decision paralysis',
          whyItMatters: 'Reminds me that urgency is often an illusion.',
          tags: ['leadership', 'clarity', 'focus', 'patience'],
          themes: ['Decision Making', 'Patience', 'Leadership'],
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        },
        {
          id: 'sample-wis-2',
          userId: user?.uid || 'demo-user',
          personName: 'Mother',
          relationship: 'Mother',
          wisdomText: 'Protect your peace of mind first; work will always expand to fill every container you give it.',
          situation: 'When I was working through the night on college submissions',
          whyItMatters: 'Helps ground my well-being above external demands.',
          tags: ['peace', 'balance', 'boundaries', 'well-being'],
          themes: ['Work-Life Balance', 'Mental Clarity', 'Values'],
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        },
        {
          id: 'sample-wis-3',
          userId: user?.uid || 'demo-user',
          personName: 'Elena Rostova',
          relationship: 'Teacher',
          wisdomText: 'Precision in language leads to precision in thought. Write what you mean before you speak it.',
          situation: 'Preparing for my first international symposium keynote',
          whyItMatters: 'Turned my scattered notes into a lucid presentation.',
          tags: ['communication', 'clarity', 'writing', 'expression'],
          themes: ['Communication', 'Clarity', 'Confidence'],
          createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        },
      ];

      const rankedWis = rankWisdomCandidates(
        retrievalStudioQuery,
        sourceWisdom,
        userConsentedWisdomIds,
        0.2,
        5
      );
      setRetrievalStudioWisdom(rankedWis);

      const sourceBooks = bookWisdomList.length > 0 ? bookWisdomList : [
        {
          id: 'sample-book-1',
          userId: user?.uid || 'demo-user',
          bookTitle: 'Essentialism: The Disciplined Pursuit of Less',
          author: 'Greg McKeown',
          keyIdea: 'The way of the Essentialist involves the relentless pursuit of less but better.',
          quote: 'If you don’t prioritize your life, someone else will.',
          personalReflection: 'Essentialism is not about how to get more things done; it’s about how to get the right things done.',
          tags: ['focus', 'priority', 'simplicity', 'boundaries'],
          themes: ['Prioritization', 'Productivity', 'Decision Making'],
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        },
        {
          id: 'sample-book-2',
          userId: user?.uid || 'demo-user',
          bookTitle: 'Thinking, Fast and Slow',
          author: 'Daniel Kahneman',
          keyIdea: 'Cognitive biases arise when fast intuitive System 1 operates unchecked by analytical System 2.',
          quote: 'A reliable way to make people believe in falsehoods is frequent repetition.',
          personalReflection: 'Helps me recognize when I am reacting out of emotional heuristics versus rational appraisal.',
          tags: ['psychology', 'bias', 'rationality', 'thinking'],
          themes: ['Cognition', 'Decision Making', 'Clarity'],
          createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
        },
        {
          id: 'sample-book-3',
          userId: user?.uid || 'demo-user',
          bookTitle: 'Deep Work: Rules for Focused Success in a Distracted World',
          author: 'Cal Newport',
          keyIdea: 'The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.',
          quote: 'Clarity about what matters provides clarity about what does not.',
          personalReflection: 'Deep work produces rare value, whereas shallow work prevents fire-drills but never builds monuments.',
          tags: ['deep-work', 'focus', 'attention', 'habits'],
          themes: ['Focus & Flow', 'Productivity', 'Mastery'],
          createdAt: new Date(Date.now() - 75 * 86400000).toISOString(),
        },
      ];

      const rankedBooks = rankBookWisdom(
        retrievalStudioQuery,
        sourceBooks,
        0.2,
        5
      );
      setRetrievalStudioBooks(rankedBooks);

      addLog(
        'info',
        `Simulated V3 Retrieval Orchestrator: evaluated ${sourceMemories.length} memories, ${sourceWisdom.length} wisdom circle mentors, and ${sourceBooks.length} book insights.`
      );
    } finally {
      setIsTestingRetrievalStudio(false);
    }
  };

  // -------------------------------------------------------------
  // Related Wisdom Retrieval & Knowledge Graph Search
  // -------------------------------------------------------------
  const searchRelatedWisdom = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    // Check if user has any stored items to search across, or use sample candidates for demo/sandbox verification
    const effectiveMemories =
      memories.length > 0
        ? memories
        : [
            {
              id: 'sample-mem-1',
              summary: 'Navigating Cross-Functional Friction and Engineering Alignment',
              keyLearnings: [
                'Clarify the root problem before debating technical solutions',
                'Slow down high-stakes decisions by 24 hours to gain emotional composure',
              ],
              tags: ['leadership', 'decisions', 'alignment', 'clarity'],
              themes: ['Decision Making', 'Communication'],
            } as any,
            {
              id: 'sample-mem-2',
              summary: 'Prioritizing Deep Work and Eliminating Shallow Reactive Tasks',
              keyLearnings: [
                'Batch communication into two dedicated daily windows',
                'Guard the first 3 hours of the morning for deep creative synthesis',
              ],
              tags: ['focus', 'deep-work', 'priority', 'time-management'],
              themes: ['Focus & Flow', 'Productivity'],
            } as any,
          ];

    const effectiveWisdom =
      wisdomList.length > 0
        ? wisdomList
        : [
            {
              id: 'sample-wis-1',
              personName: 'Professor Marcus Reed',
              relationship: 'Mentor',
              wisdomText:
                'Never mistake motion for direction. When friction escalates, slow down and clarify the foundational principle.',
              situation: 'Guiding through early career decision paralysis',
              tags: ['leadership', 'clarity', 'focus', 'patience'],
              themes: ['Decision Making', 'Patience', 'Leadership'],
            } as any,
            {
              id: 'sample-wis-2',
              personName: 'Mother',
              relationship: 'Mother',
              wisdomText:
                'Protect your peace of mind first; work will always expand to fill every container you give it.',
              situation: 'When I was working through the night on college submissions',
              tags: ['peace', 'balance', 'boundaries', 'well-being'],
              themes: ['Work-Life Balance', 'Mental Clarity', 'Values'],
            } as any,
          ];

    const effectiveBooks =
      bookWisdomList.length > 0
        ? bookWisdomList
        : [
            {
              id: 'sample-book-1',
              bookTitle: 'Essentialism: The Disciplined Pursuit of Less',
              author: 'Greg McKeown',
              keyIdea: 'The way of the Essentialist involves the relentless pursuit of less but better.',
              quote: 'If you don’t prioritize your life, someone else will.',
              personalReflection:
                'Essentialism is not about how to get more things done; it’s about how to get the right things done.',
              tags: ['focus', 'priority', 'simplicity', 'boundaries'],
              themes: ['Prioritization', 'Productivity', 'Decision Making'],
            } as any,
            {
              id: 'sample-book-2',
              bookTitle: 'Thinking, Fast and Slow',
              author: 'Daniel Kahneman',
              keyIdea:
                'Cognitive biases arise when fast intuitive System 1 operates unchecked by analytical System 2.',
              quote: 'A reliable way to make people believe in falsehoods is frequent repetition.',
              personalReflection:
                'Helps me recognize when I am reacting out of emotional heuristics versus rational appraisal.',
              tags: ['psychology', 'bias', 'rationality', 'thinking'],
              themes: ['Cognition', 'Decision Making', 'Clarity'],
            } as any,
          ];

    setIsSearchingRelatedWisdom(true);
    try {
      const res = await fetch('/api/agent/related-wisdom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          memories: effectiveMemories.map((m) => ({
            id: m.id,
            summary: m.summary,
            keyLearnings: m.keyLearnings,
            tags: m.tags,
            themes: m.themes,
          })),
          wisdomList: effectiveWisdom.map((w) => ({
            id: w.id,
            personName: w.personName,
            relationship: w.relationship,
            wisdomText: w.wisdomText,
            situation: w.situation,
            tags: w.tags,
            themes: w.themes,
          })),
          bookWisdomList: effectiveBooks.map((b) => ({
            id: b.id,
            bookTitle: b.bookTitle,
            author: b.author,
            keyIdea: b.keyIdea,
            quote: b.quote,
            personalReflection: b.personalReflection,
            tags: b.tags,
            themes: b.themes,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.items) && data.items.length > 0) {
        // "Do not automatically show results. Ask for permission first."
        setPendingWisdomPrompt({
          question: 'I found potentially relevant wisdom. Would you like to review it?',
          items: data.items,
          detectedAt: getIsoTimestamp(),
          querySnippet: trimmed.slice(0, 100),
        });
        addLog(
          'info',
          `Related Wisdom Search: Found ${data.items.length} relevant candidate(s) across Memories, Wisdom Circle, and Book Wisdom. Permission requested.`
        );
      }
    } catch (err: any) {
      console.warn('Related wisdom retrieval error:', err);
    } finally {
      setIsSearchingRelatedWisdom(false);
    }
  };

  const handleTriggerManualWisdomSearch = () => {
    const textToSearch =
      conversationInput.trim() ||
      messages
        .filter((m) => m.role === 'user')
        .slice(-3)
        .map((m) => m.content)
        .join(' ');

    if (!textToSearch) {
      addLog('warn', 'Please enter a reflection or have a conversation turn before scanning for related wisdom.');
      return;
    }

    if (memories.length === 0 && wisdomList.length === 0 && bookWisdomList.length === 0) {
      addLog(
        'info',
        'No knowledge assets found in your vault yet. Add entries to Memories, Wisdom Circle, or Book Wisdom to establish Knowledge Graph connections.'
      );
      return;
    }

    addLog('info', 'Scanning Knowledge Graph for related wisdom across Memories, Wisdom Circle, and Book Wisdom...');
    searchRelatedWisdom(textToSearch);
  };

  const handleConsultRelatedWisdomInChat = (item: RelatedWisdomItem) => {
    // Adapt into consentedWisdomAttached with explicit permission
    const adapted: WisdomEntry = {
      id: item.originalId || item.id,
      userId: user?.uid || 'local-user',
      personName:
        item.sourceType === 'book'
          ? item.sourceTitle
          : item.sourceType === 'wisdom'
          ? item.sourceTitle
          : 'Past Memory',
      relationship:
        item.sourceType === 'book'
          ? 'Author Principle'
          : item.sourceType === 'wisdom'
          ? 'Wisdom Mentor'
          : 'Self Reflection',
      wisdomText: item.contentSnippet,
      situation: item.whyRelevant,
      whyItMatters: `Knowledge Graph link: ${item.relationshipType || 'Thematic Connection'}`,
      tags: item.tags || [],
      themes: item.themes || [],
      createdAt: getIsoTimestamp(),
    };

    setConsentedWisdomAttached(adapted);
    setIsReviewingRelatedWisdom(false);
    addLog('success', `Explicit consent granted: Attached "${item.sourceTitle}" as active guidance for next reflection.`);
  };

  const handleInsertRelatedWisdomIntoInput = (item: RelatedWisdomItem) => {
    setConversationInput((prev) => {
      const quoteText = `"${item.contentSnippet}" (${item.sourceTitle})`;
      return prev ? `${prev} \n[Reflecting on: ${quoteText}] ` : `Reflecting on ${quoteText}: `;
    });
    setIsReviewingRelatedWisdom(false);
    addLog('info', `Inserted excerpt from "${item.sourceTitle}" into reflection input.`);
  };

  // -------------------------------------------------------------
  // 2. Synthesize Structured Memory (Summary, Learnings, Actions, Tags, Themes, AI Explanation)
  // -------------------------------------------------------------
  const handleSynthesizeMemory = async () => {
    if (!user) return;
    setIsSynthesizing(true);
    addLog('info', `Initiating Gemini Memory Synthesis in [${selectedStyle.toUpperCase()}] mode...`);

    try {
      const conversationTranscript = messages
        .filter((m) => m.id !== 'init-msg-1')
        .map((m) => `${m.role === 'user' ? 'User' : 'Smriti Agent'}: ${m.content}`)
        .join('\n\n');

      const res = await fetch('/api/agent/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: conversationTranscript || messages.map((m) => m.content).join('\n'),
          reflectionNotes: conversationInput.trim() || undefined,
          reflectionStyle: selectedStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to synthesize memory.');
      }

      const extracted = data.memory;
      const initialDraft: StructuredMemory = {
        id: createId('mem'),
        userId: user.uid,
        summary: extracted.summary || 'Summary of reflection session',
        keyLearnings: extracted.keyLearnings || [],
        actionItems: extracted.actionItems || [],
        tags: extracted.tags || ['reflection', 'growth'],
        themes: extracted.themes || ['Personal Growth'],
        reflectionStyle: extracted.reflectionStyle || selectedStyle,
        reflectionNotes: extracted.reflectionNotes || '',
        aiExplanation:
          extracted.aiExplanation ||
          'These insights and action steps were synthesized directly from your dialogue using Gemini. Please review, edit, or customize any field below before approving.',
        secondBrainMeta: extracted.secondBrainMeta || {
          knowledgeGraphNodes: extracted.themes || [],
          suggestedFollowUps: ['What was the primary breakthrough from this experience?'],
          confidenceScore: 0.94,
        },
        createdAt: getIsoTimestamp(),
      };

      setDraftMemory(initialDraft);
      setReviewModalOpen(true);
      addLog('success', `Memory synthesized successfully via ${data.modelUsed || 'Gemini'}. Opened Human Review Modal.`);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      addLog('error', `Synthesis error: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Human Review & Approval: Persist Approved Memory to Firestore
  // -------------------------------------------------------------
  const handleApproveAndSaveMemory = async () => {
    if (!user || !draftMemory) return;
    setIsSavingApproved(true);
    addLog('info', `Human Approval Received. Persisting structured memory to /users/${user.uid}/memories/${draftMemory.id}...`);

    try {
      // 1. Persist memory document to Firestore
      await saveMemory(user.uid, draftMemory);

      // 2. Persist audit interaction record
      await saveInteraction(user.uid, createId('int_mem'), {
        type: 'memory_synthesized_and_approved',
        memoryId: draftMemory.id,
        summary: draftMemory.summary,
        themes: draftMemory.themes,
        actionItemCount: draftMemory.actionItems.length,
      });

      // 3. Update active state
      setMemories((prev) => [draftMemory, ...prev.filter((m) => m.id !== draftMemory.id)]);

      // 4. If linked to wisdom entries, record bidirectional link
      if (draftMemory.linkedWisdomIds && draftMemory.linkedWisdomIds.length > 0) {
        for (const wId of draftMemory.linkedWisdomIds) {
          try {
            await linkWisdomAndMemory(user.uid, wId, draftMemory.id);
          } catch (linkErr) {
            console.warn('Notice while linking wisdom:', linkErr);
          }
        }
        setWisdomList((prev) =>
          prev.map((w) => {
            if (draftMemory.linkedWisdomIds?.includes(w.id)) {
              const current = w.linkedMemoryIds || [];
              if (!current.includes(draftMemory.id)) {
                return { ...w, linkedMemoryIds: [...current, draftMemory.id] };
              }
            }
            return w;
          })
        );
      }

      setReviewModalOpen(false);
      setSaveSuccessBanner(`Memory successfully approved & saved to your vault! "${draftMemory.summary.slice(0, 65)}..."`);
      addLog('success', `Document persisted at /users/${user.uid}/memories/${draftMemory.id}`);

      // Auto-switch to Memory Vault tab to view result
      setActiveTab('vault');
      setTimeout(() => setSaveSuccessBanner(null), 7000);
    } catch (err: any) {
      console.error('Save memory error:', err);
      addLog('error', `Failed to persist memory: ${err.message}`);
    } finally {
      setIsSavingApproved(false);
    }
  };

  // -------------------------------------------------------------
  // 4. Action Item Interactive Toggle (Firestore Sync)
  // -------------------------------------------------------------
  const handleToggleActionItem = async (memoryId: string, actionItemId: string, completed: boolean) => {
    if (!user) return;
    // Optimistic UI state update
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== memoryId) return m;
        return {
          ...m,
          actionItems: (m.actionItems || []).map((item) =>
            item.id === actionItemId ? { ...item, completed } : item
          ),
        };
      })
    );

    try {
      await updateMemoryActionItem(user.uid, memoryId, actionItemId, completed);
      addLog('info', `Action item marked ${completed ? 'completed' : 'pending'} in doc ${memoryId}`);
    } catch (err: any) {
      console.error('Action toggle error:', err);
      addLog('warn', `Failed to sync action item update: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Delete document
  // -------------------------------------------------------------
  const handleDeleteDocument = async (memoryId: string) => {
    if (!user) return;
    try {
      await deleteMemory(user.uid, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      addLog('info', `Deleted document /users/${user.uid}/memories/${memoryId}`);
    } catch (err: any) {
      addLog('error', `Failed to delete document: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Wisdom Circle Handlers (Preserve advice & philosophies from guides)
  // -------------------------------------------------------------
  const openCreateWisdomModal = () => {
    setEditingWisdomId(null);
    setWisdomForm({
      personName: '',
      relationship: 'Mother',
      wisdomText: '',
      situation: '',
      whyItMatters: '',
      tags: [],
      themes: [],
      linkedMemoryIds: [],
    });
    setWisdomFormTagInput('');
    setWisdomFormThemeInput('');
    setWisdomModalOpen(true);
  };

  const openEditWisdomModal = (entry: WisdomEntry) => {
    setEditingWisdomId(entry.id);
    setWisdomForm({
      personName: entry.personName,
      relationship: entry.relationship,
      wisdomText: entry.wisdomText,
      situation: entry.situation,
      whyItMatters: entry.whyItMatters,
      tags: entry.tags || [],
      themes: entry.themes || [],
      linkedMemoryIds: entry.linkedMemoryIds || [],
    });
    setWisdomFormTagInput('');
    setWisdomFormThemeInput('');
    setWisdomModalOpen(true);
  };

  const handleSaveWisdom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      addLog('warn', 'You must be signed in to preserve advice in your Wisdom Circle.');
      return;
    }

    const { personName, relationship, wisdomText, situation, whyItMatters, tags, themes, linkedMemoryIds } = wisdomForm;

    if (!personName.trim() || !wisdomText.trim()) {
      addLog('warn', 'Please provide both the person’s name and their advice/wisdom.');
      return;
    }

    setIsSavingWisdom(true);
    try {
      if (editingWisdomId) {
        const updatedEntry: WisdomEntry = {
          id: editingWisdomId,
          userId: user.uid,
          personName: personName.trim(),
          relationship: relationship as WisdomRelationship,
          wisdomText: wisdomText.trim(),
          situation: situation.trim() || 'Shared during mentorship or life milestone',
          whyItMatters: whyItMatters.trim() || 'Core personal principle and guiding value',
          tags: tags.length > 0 ? tags : ['wisdom', 'philosophy'],
          themes: themes.length > 0 ? themes : ['Personal Growth'],
          linkedMemoryIds: linkedMemoryIds || [],
          updatedAt: getIsoTimestamp(),
          createdAt:
            wisdomList.find((w) => w.id === editingWisdomId)?.createdAt || getIsoTimestamp(),
        };

        await updateWisdomEntry(user.uid, editingWisdomId, updatedEntry);
        setWisdomList((prev) =>
          prev.map((w) => (w.id === editingWisdomId ? updatedEntry : w))
        );
        addLog('success', `Wisdom from ${personName.trim()} updated in /users/${user.uid}/wisdom/${editingWisdomId}`);
      } else {
        const newEntry: WisdomEntry = {
          id: createId('wsd'),
          userId: user.uid,
          personName: personName.trim(),
          relationship: relationship as WisdomRelationship,
          wisdomText: wisdomText.trim(),
          situation: situation.trim() || 'Shared during mentorship or life milestone',
          whyItMatters: whyItMatters.trim() || 'Core personal principle and guiding value',
          tags: tags.length > 0 ? tags : ['wisdom', 'philosophy'],
          themes: themes.length > 0 ? themes : ['Personal Growth'],
          linkedMemoryIds: linkedMemoryIds || [],
          createdAt: getIsoTimestamp(),
          updatedAt: getIsoTimestamp(),
        };

        await saveWisdomEntry(user.uid, newEntry);
        setWisdomList((prev) => [newEntry, ...prev]);
        addLog('success', `Wisdom from ${personName.trim()} preserved in /users/${user.uid}/wisdom/${newEntry.id}`);
      }

      setWisdomModalOpen(false);
      setEditingWisdomId(null);
    } catch (err: any) {
      console.error('Error saving wisdom entry:', err);
      addLog('error', `Failed to save wisdom entry: ${err.message}`);
    } finally {
      setIsSavingWisdom(false);
    }
  };

  const handleDeleteWisdom = async (wisdomId: string, personName: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to remove the wisdom entry from ${personName}?`)) return;

    try {
      await deleteWisdomEntry(user.uid, wisdomId);
      setWisdomList((prev) => prev.filter((w) => w.id !== wisdomId));
      if (consentedWisdomAttached?.id === wisdomId) {
        setConsentedWisdomAttached(null);
      }
      addLog('info', `Removed wisdom entry /users/${user.uid}/wisdom/${wisdomId}`);
    } catch (err: any) {
      console.error('Error deleting wisdom entry:', err);
      addLog('error', `Failed to delete wisdom entry: ${err.message}`);
    }
  };

  // Explicit User Consent Gateway for Consulting Wisdom
  // Zero-Auto-Surface: Wisdom is NEVER automatically queried or attached without explicit consent
  const handleOpenConsultConsentModal = (entry?: WisdomEntry) => {
    if (entry) {
      setSelectedWisdomForConsult(entry);
    } else if (wisdomList.length > 0) {
      setSelectedWisdomForConsult(wisdomList[0]);
    }
    setConsultConsentModalOpen(true);
  };

  const handleGrantConsentAndConsult = (entry?: WisdomEntry) => {
    const target = entry || selectedWisdomForConsult;
    if (!target) return;
    setConsentedWisdomAttached(target);
    setConsultConsentModalOpen(false);
    setActiveTab('reflect');
    addLog(
      'success',
      `Explicit consent granted: Wisdom from ${target.personName} (${target.relationship}) attached for reflection.`
    );
  };

  const handleRevokeWisdomConsent = () => {
    const prevName = consentedWisdomAttached?.personName || 'Guide';
    setConsentedWisdomAttached(null);
    addLog('info', `Revoked wisdom consultation for ${prevName}. Agent reflection restored to default.`);
  };

  // Cross-Link Wisdom and Memory
  const handleLinkWisdomToMemory = async (wisdomId: string, memoryId: string) => {
    if (!user) return;
    try {
      await linkWisdomAndMemory(user.uid, wisdomId, memoryId);

      // Update wisdom list state
      setWisdomList((prev) =>
        prev.map((w) => {
          if (w.id === wisdomId) {
            const current = w.linkedMemoryIds || [];
            if (!current.includes(memoryId)) {
              return { ...w, linkedMemoryIds: [...current, memoryId] };
            }
          }
          return w;
        })
      );

      // Update memories list state
      setMemories((prev) =>
        prev.map((m) => {
          if (m.id === memoryId) {
            const current = m.linkedWisdomIds || [];
            if (!current.includes(wisdomId)) {
              return { ...m, linkedWisdomIds: [...current, wisdomId] };
            }
          }
          return m;
        })
      );

      setLinkMemoryModalWisdom(null);
      setLinkWisdomModalMemory(null);
      addLog('success', `Linked wisdom doc ${wisdomId} to memory doc ${memoryId}`);
    } catch (err: any) {
      console.error('Error linking wisdom and memory:', err);
      addLog('error', `Failed to link: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Book Wisdom Handlers (Human-in-the-loop Pre-persistence)
  // -------------------------------------------------------------
  const openCreateBookModal = () => {
    setEditingBookId(null);
    setBookForm({
      bookTitle: '',
      author: '',
      keyIdea: '',
      quote: '',
      personalReflection: '',
      tags: [],
      themes: [],
      linkedMemoryIds: [],
    });
    setBookFormTagInput('');
    setBookFormThemeInput('');
    setBookModalOpen(true);
  };

  const openEditBookModal = (entry: BookWisdomEntry) => {
    setEditingBookId(entry.id);
    setBookForm({
      bookTitle: entry.bookTitle,
      author: entry.author,
      keyIdea: entry.keyIdea,
      quote: entry.quote,
      personalReflection: entry.personalReflection,
      tags: [...(entry.tags || [])],
      themes: [...(entry.themes || [])],
      linkedMemoryIds: [...(entry.linkedMemoryIds || [])],
    });
    setBookFormTagInput('');
    setBookFormThemeInput('');
    setBookModalOpen(true);
  };

  const handleApplyBookTemplate = (template: {
    bookTitle: string;
    author: string;
    keyIdea: string;
    quote: string;
    personalReflection: string;
    tags: string[];
    themes: string[];
  }) => {
    setBookForm((prev) => ({
      ...prev,
      ...template,
    }));
    addLog('info', `Loaded template for "${template.bookTitle}" by ${template.author} into human review editor.`);
  };

  const handleSaveBookWisdom = async () => {
    if (!user) {
      addLog('error', 'Sign in required to save book wisdom.');
      return;
    }

    const { bookTitle, author, keyIdea, quote, personalReflection, tags, themes, linkedMemoryIds } = bookForm;

    if (!bookTitle.trim()) {
      addLog('warn', 'Please provide a Book Title before saving.');
      return;
    }
    if (!author.trim()) {
      addLog('warn', 'Please provide the Author before saving.');
      return;
    }
    if (!keyIdea.trim() && !quote.trim() && !personalReflection.trim()) {
      addLog('warn', 'Please enter at least a Key Idea, Quote, or Personal Reflection.');
      return;
    }

    setIsSavingBook(true);
    try {
      if (editingBookId) {
        const updatedEntry: BookWisdomEntry = {
          id: editingBookId,
          userId: user.uid,
          bookTitle: bookTitle.trim(),
          author: author.trim(),
          keyIdea: keyIdea.trim() || 'Core thesis of the text',
          quote: quote.trim() || 'No quote specified',
          personalReflection: personalReflection.trim() || 'Personal application and reflection',
          tags: tags.length > 0 ? tags : ['reading', 'wisdom'],
          themes: themes.length > 0 ? themes : ['Personal Growth'],
          linkedMemoryIds: linkedMemoryIds || [],
          updatedAt: getIsoTimestamp(),
          createdAt:
            bookWisdomList.find((b) => b.id === editingBookId)?.createdAt || getIsoTimestamp(),
        };

        await updateBookWisdomEntry(user.uid, editingBookId, updatedEntry);
        setBookWisdomList((prev) =>
          prev.map((b) => (b.id === editingBookId ? updatedEntry : b))
        );
        addLog('success', `Book Wisdom for "${bookTitle.trim()}" updated in /users/${user.uid}/books/${editingBookId}`);
      } else {
        const newEntry: BookWisdomEntry = {
          id: createId('bk'),
          userId: user.uid,
          bookTitle: bookTitle.trim(),
          author: author.trim(),
          keyIdea: keyIdea.trim() || 'Core thesis of the text',
          quote: quote.trim() || 'No quote specified',
          personalReflection: personalReflection.trim() || 'Personal application and reflection',
          tags: tags.length > 0 ? tags : ['reading', 'wisdom'],
          themes: themes.length > 0 ? themes : ['Personal Growth'],
          linkedMemoryIds: linkedMemoryIds || [],
          createdAt: getIsoTimestamp(),
          updatedAt: getIsoTimestamp(),
        };

        await saveBookWisdom(newEntry);
        setBookWisdomList((prev) => [newEntry, ...prev]);
        addLog('success', `Book Wisdom for "${bookTitle.trim()}" preserved in /users/${user.uid}/books/${newEntry.id}`);
      }

      setBookModalOpen(false);
      setEditingBookId(null);
    } catch (err: any) {
      console.error('Error saving book wisdom entry:', err);
      addLog('error', `Failed to save book wisdom: ${err.message}`);
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleDeleteBookWisdom = async (bookId: string, title: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to remove the book entry "${title}"?`)) return;

    try {
      await deleteBookWisdomEntry(user.uid, bookId);
      setBookWisdomList((prev) => prev.filter((b) => b.id !== bookId));
      addLog('info', `Removed book wisdom entry /users/${user.uid}/books/${bookId}`);
    } catch (err: any) {
      console.error('Error deleting book wisdom entry:', err);
      addLog('error', `Failed to delete book entry: ${err.message}`);
    }
  };

  // Cross-Link Book Wisdom and Memory
  const handleLinkBookToMemory = async (bookId: string, memoryId: string) => {
    if (!user) return;
    try {
      await linkBookAndMemory(user.uid, bookId, memoryId);

      // Update book wisdom state
      setBookWisdomList((prev) =>
        prev.map((b) => {
          if (b.id === bookId) {
            const current = b.linkedMemoryIds || [];
            if (!current.includes(memoryId)) {
              return { ...b, linkedMemoryIds: [...current, memoryId] };
            }
          }
          return b;
        })
      );

      // Update memories state
      setMemories((prev) =>
        prev.map((m) => {
          if (m.id === memoryId) {
            const current = m.linkedBookIds || [];
            if (!current.includes(bookId)) {
              return { ...m, linkedBookIds: [...current, bookId] };
            }
          }
          return m;
        })
      );

      setLinkMemoryModalBook(null);
      setLinkBookModalMemory(null);
      addLog('success', `Linked book wisdom ${bookId} to memory doc ${memoryId}`);
    } catch (err: any) {
      console.error('Error linking book and memory:', err);
      addLog('error', `Failed to link book to memory: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Trusted Circle Handlers (Human Connection Bridge)
  // -------------------------------------------------------------
  const openCreateContactModal = () => {
    setEditingContactId(null);
    setContactForm({
      name: '',
      relationship: 'Friend',
      whyTheyMatter: '',
      preferredMethod: 'Text / SMS',
      contactDetail: '',
      optionalNotes: '',
      tags: [],
    });
    setContactFormTagInput('');
    setContactModalOpen(true);
  };

  const openEditContactModal = (contact: TrustedContact) => {
    setEditingContactId(contact.id);
    setContactForm({
      name: contact.name,
      relationship: contact.relationship,
      whyTheyMatter: contact.whyTheyMatter,
      preferredMethod: contact.preferredMethod,
      contactDetail: contact.contactDetail || '',
      optionalNotes: contact.optionalNotes || '',
      tags: [...(contact.tags || [])],
    });
    setContactFormTagInput('');
    setContactModalOpen(true);
  };

  const handleSaveContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      addLog('error', 'Sign in required to save a contact to your Trusted Circle.');
      return;
    }

    const { name, relationship, whyTheyMatter, preferredMethod, contactDetail, optionalNotes, tags } = contactForm;

    if (!name.trim()) {
      addLog('warn', 'Please provide a Contact Name before saving.');
      return;
    }
    if (!whyTheyMatter.trim()) {
      addLog('warn', 'Please specify Why This Person Matters before saving.');
      return;
    }

    setIsSavingContact(true);
    try {
      if (editingContactId) {
        const updatedContact: TrustedContact = {
          id: editingContactId,
          userId: user.uid,
          name: name.trim(),
          relationship,
          whyTheyMatter: whyTheyMatter.trim(),
          preferredMethod,
          contactDetail: contactDetail.trim() || undefined,
          optionalNotes: optionalNotes.trim() || undefined,
          tags: tags.length > 0 ? tags : ['trusted'],
          updatedAt: getIsoTimestamp(),
          createdAt:
            trustedContacts.find((c) => c.id === editingContactId)?.createdAt || getIsoTimestamp(),
        };

        await updateTrustedContact(user.uid, editingContactId, updatedContact);
        setTrustedContacts((prev) =>
          prev.map((c) => (c.id === editingContactId ? updatedContact : c))
        );
        addLog('success', `Trusted contact "${name.trim()}" updated in /users/${user.uid}/trusted_circle/${editingContactId}`);
      } else {
        const newContact: TrustedContact = {
          id: createId('tc'),
          userId: user.uid,
          name: name.trim(),
          relationship,
          whyTheyMatter: whyTheyMatter.trim(),
          preferredMethod,
          contactDetail: contactDetail.trim() || undefined,
          optionalNotes: optionalNotes.trim() || undefined,
          tags: tags.length > 0 ? tags : ['trusted'],
          createdAt: getIsoTimestamp(),
          updatedAt: getIsoTimestamp(),
        };

        await saveTrustedContact(newContact);
        setTrustedContacts((prev) => [newContact, ...prev]);
        addLog('success', `Trusted contact "${name.trim()}" saved in /users/${user.uid}/trusted_circle/${newContact.id}`);
      }

      setContactModalOpen(false);
      setEditingContactId(null);
    } catch (err: any) {
      console.error('Error saving trusted contact:', err);
      addLog('error', `Failed to save trusted contact: ${err.message}`);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string, name: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to remove "${name}" from your Trusted Circle?`)) return;

    try {
      await deleteTrustedContact(user.uid, contactId);
      setTrustedContacts((prev) => prev.filter((c) => c.id !== contactId));
      addLog('info', `Removed contact /users/${user.uid}/trusted_circle/${contactId}`);
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      addLog('error', `Failed to remove contact: ${err.message}`);
    }
  };

  // Open Reachout Assistant Modal
  const openReachoutModal = (contact?: TrustedContact, prefilledContext?: string) => {
    const targetContact = contact || (trustedContacts.length > 0 ? trustedContacts[0] : null);
    setSelectedContactForReachout(targetContact);
    setReachoutUserExperience(prefilledContext || '');
    setReachoutSupportSeeking('');
    setReachoutTone('Gentle & Vulnerable');
    setDraftResult(null);
    setEditableDraftMessage('');
    setCopiedDraftSuccess(false);
    setDraftApprovedByUser(false);
    setReachoutModalOpen(true);
    setReachoutOfferPrompt(null);
  };

  // Call /api/agent/draft-reachout to generate message
  const handleGenerateReachoutDraft = async () => {
    if (!selectedContactForReachout) {
      addLog('warn', 'Please select a Trusted Person to draft a message for.');
      return;
    }

    setIsDraftingReachout(true);
    setCopiedDraftSuccess(false);
    setDraftApprovedByUser(false);
    addLog(
      'info',
      `Smriti Agent generating reachout draft for ${selectedContactForReachout.name} (${selectedContactForReachout.relationship}) with [${reachoutTone}] tone...`
    );

    try {
      const res = await fetch('/api/agent/draft-reachout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: selectedContactForReachout,
          userExperience: reachoutUserExperience,
          supportSeeking: reachoutSupportSeeking,
          tone: reachoutTone,
        }),
      });

      const data: ReachoutDraftResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as any).error || 'Failed to draft reachout message');
      }

      setDraftResult(data);
      setEditableDraftMessage(data.draftMessage);
      addLog('success', `Draft generated via ${data.modelUsed || 'AI Assistant'}. Smriti strictly requires your review before sending.`);
    } catch (err: any) {
      console.error('Draft generation error:', err);
      addLog('error', `Reachout drafting error: ${err.message}`);
      // Algorithmic fallback
      const fallbackDraft = `Hey ${selectedContactForReachout.name}, thinking of you. ${
        reachoutUserExperience.trim()
          ? `I've been going through a bit of a rough patch lately (${reachoutUserExperience.trim()}) and things have felt a bit overwhelming.`
          : `I've been feeling a bit overwhelmed lately and having a hard time sorting through things.`
      } ${
        reachoutSupportSeeking.trim()
          ? `I'd really appreciate ${reachoutSupportSeeking.trim().toLowerCase()} whenever you have a free moment.`
          : `No pressure at all to reply right away, but I'd love to connect when you have time.`
      } You've always been someone I trust, and it means a lot having you in my corner.`;

      setDraftResult({
        draftMessage: fallbackDraft,
        whatYouAreExperiencing: reachoutUserExperience || 'Going through a demanding period',
        supportSeeking: reachoutSupportSeeking || 'Connection & listening ear',
        whyReachingOut: `Because ${selectedContactForReachout.name} matters: ${selectedContactForReachout.whyTheyMatter}`,
        recommendedMethod: selectedContactForReachout.preferredMethod,
        modelUsed: 'deterministic-fallback',
      });
      setEditableDraftMessage(fallbackDraft);
    } finally {
      setIsDraftingReachout(false);
    }
  };

  const handleCopyDraftMessage = async () => {
    if (!editableDraftMessage) return;
    try {
      await navigator.clipboard.writeText(editableDraftMessage);
      setCopiedDraftSuccess(true);
      addLog('info', 'Reachout message copied to clipboard. You can paste and send directly.');
      setTimeout(() => setCopiedDraftSuccess(false), 4000);
    } catch (err: any) {
      console.error('Clipboard copy error:', err);
      addLog('warn', 'Failed to copy to clipboard automatically.');
    }
  };

  // -------------------------------------------------------------
  // Verification Suite Handlers
  // -------------------------------------------------------------
  const handleTestFirestoreConnection = async () => {
    setIsRunningTest('connection');
    addLog('info', 'Checking Cloud Firestore connection...');
    try {
      const res = await verifyFirestoreConnection();
      setFirestoreStatus({
        checked: true,
        success: res.success,
        message: res.message,
        mode: res.mode,
      });
      addLog(res.success ? 'success' : 'error', `Firestore ping: ${res.message} (${res.mode})`);
    } catch (err: any) {
      setFirestoreStatus({
        checked: true,
        success: false,
        message: err.message,
        mode: 'Error',
      });
      addLog('error', `Firestore ping error: ${err.message}`);
    } finally {
      setIsRunningTest(null);
    }
  };

  const handleVerifyUserDocument = async () => {
    if (!user) return;
    setIsRunningTest('userdoc');
    addLog('info', `Querying Firestore for document /users/${user.uid}...`);
    try {
      const { profile: updatedProfile, firestoreSynced, error } = await createUserProfileRecord(user);
      setUserProfile(updatedProfile);
      if (firestoreSynced) {
        setUserDocStatus({
          checked: true,
          success: true,
          message: `Document verified and active at /users/${user.uid}`,
          profile: updatedProfile,
        });
        addLog('success', `User document /users/${user.uid} verified in Firestore.`);
      } else {
        setUserDocStatus({
          checked: true,
          success: false,
          message: `Firestore rejected document write: ${error || 'Permission Denied'}. Update rules in Firebase Console.`,
          profile: updatedProfile,
        });
        addLog('warn', `User document write was rejected by Firestore rules: ${error}. Profile preserved in local storage.`);
      }
    } catch (err: any) {
      setUserDocStatus({
        checked: true,
        success: false,
        message: `Error verifying document: ${err.message}`,
      });
      addLog('error', `User document check failed: ${err.message}`);
    } finally {
      setIsRunningTest(null);
    }
  };

  const handleVerifyCrossUserIsolation = async () => {
    if (!user) return;
    setIsRunningTest('isolation');
    addLog('info', 'Attempting unauthorized read on /users/unauthorized-foreign-victim-999 to test rules...');
    try {
      const res = await verifyCrossUserIsolation(user.uid, 'unauthorized-foreign-victim-999');
      setCrossUserStatus({
        checked: true,
        blocked: res.blocked,
        message: res.message,
      });
      if (res.blocked) {
        addLog('success', `[PASS] ${res.message}`);
      } else {
        addLog('warn', `[FAIL] Security rules permitted cross-user read! Check firestore.rules.`);
      }
    } catch (err: any) {
      setCrossUserStatus({
        checked: true,
        blocked: true,
        message: `Cross-user access denied by security layer: ${err.message}`,
      });
      addLog('success', `[PASS] Security rules actively rejected cross-user read.`);
    } finally {
      setIsRunningTest(null);
    }
  };

  const handleCopyRules = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(FIRESTORE_RULES_SOURCE);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 3000);
      addLog('info', 'Firestore security rules copied to clipboard.');
    }
  };

  // Active Reflection Style Configuration
  const activeModeConfig =
    REFLECTION_MODES.find((m) => m.id === selectedStyle) || REFLECTION_MODES[0];

  // Filtered Vault Memories
  const allThemes = Array.from(new Set(memories.flatMap((m) => m.themes || []))).filter(Boolean);
  const filteredMemories = memories.filter((m) => {
    const q = (vaultSearchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (m.summary || '').toLowerCase().includes(q) ||
      (m.reflectionNotes && m.reflectionNotes.toLowerCase().includes(q)) ||
      (Array.isArray(m.keyLearnings) && m.keyLearnings.some((k) => (k || '').toLowerCase().includes(q))) ||
      (Array.isArray(m.tags) && m.tags.some((t) => (t || '').toLowerCase().includes(q)));

    const matchesTheme = selectedThemeFilter === 'ALL' || (Array.isArray(m.themes) && m.themes.includes(selectedThemeFilter));
    const matchesStyle = selectedStyleFilter === 'ALL' || m.reflectionStyle === selectedStyleFilter;
    return matchesSearch && matchesTheme && matchesStyle;
  });

  // Filtered Wisdom Circle entries
  const filteredWisdomList = wisdomList.filter((w) => {
    const q = (wisdomSearchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (w.personName || '').toLowerCase().includes(q) ||
      (w.wisdomText || '').toLowerCase().includes(q) ||
      (w.situation || '').toLowerCase().includes(q) ||
      (w.whyItMatters || '').toLowerCase().includes(q) ||
      (Array.isArray(w.themes) && w.themes.some((t) => (t || '').toLowerCase().includes(q))) ||
      (Array.isArray(w.tags) && w.tags.some((t) => (t || '').toLowerCase().includes(q)));

    const matchesRel =
      selectedRelationshipFilter === 'ALL' ||
      (w.relationship || '').toLowerCase() === (selectedRelationshipFilter || '').toLowerCase();

    return matchesSearch && matchesRel;
  });

  // Filtered Book Wisdom entries
  const allBookAuthors = Array.from(new Set(bookWisdomList.map((b) => (b.author || '').trim()))).filter(Boolean);
  const allBookThemes = Array.from(new Set(bookWisdomList.flatMap((b) => b.themes || []))).filter(Boolean);
  const filteredBookWisdomList = bookWisdomList.filter((b) => {
    const q = (bookSearchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (b.bookTitle || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q) ||
      (b.keyIdea || '').toLowerCase().includes(q) ||
      (b.quote || '').toLowerCase().includes(q) ||
      (b.personalReflection || '').toLowerCase().includes(q) ||
      (Array.isArray(b.themes) && b.themes.some((t) => (t || '').toLowerCase().includes(q))) ||
      (Array.isArray(b.tags) && b.tags.some((t) => (t || '').toLowerCase().includes(q)));

    const matchesAuthor =
      selectedBookAuthorFilter === 'ALL' ||
      (b.author || '').toLowerCase() === (selectedBookAuthorFilter || '').toLowerCase();

    const matchesTheme =
      selectedBookThemeFilter === 'ALL' ||
      (Array.isArray(b.themes) && b.themes.includes(selectedBookThemeFilter));

    return matchesSearch && matchesAuthor && matchesTheme;
  });

  // =============================================================
  // 10 GROWTH DASHBOARD METRIC CALCULATIONS
  // =============================================================
  // 1. Total Memories Created
  const totalMemoriesCount = memories.length;

  // 2. Key Learnings Captured
  const totalKeyLearningsCount = memories.reduce((acc, m) => acc + (m.keyLearnings?.length || 0), 0);
  const allKeyLearningsList = memories.flatMap((m) =>
    (m.keyLearnings || []).map((kl) => ({
      learning: kl,
      memoryId: m.id,
      memorySummary: m.summary,
      date: m.createdAt,
      style: m.reflectionStyle || 'coach',
    }))
  );

  // 3. Action Items Completed
  const totalActionItems = memories.reduce((acc, m) => acc + (m.actionItems?.length || 0), 0);
  const completedActionItems = memories.reduce(
    (acc, m) => acc + (m.actionItems?.filter((a) => a.completed).length || 0),
    0
  );
  const completionRate = totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0;
  const allCompletedActionItems = memories.flatMap((m) =>
    (m.actionItems || []).filter((a) => a.completed).map((a) => a.text)
  );
  const allPendingActionItems = memories.flatMap((m) =>
    (m.actionItems || []).filter((a) => !a.completed).map((a) => a.text)
  );

  // 4. Reflection Style Distribution
  const styleDistribution: Record<ReflectionStyle, number> = {
    coach: memories.filter((m) => (m.reflectionStyle || 'coach') === 'coach').length,
    practical: memories.filter((m) => m.reflectionStyle === 'practical').length,
    mentor: memories.filter((m) => m.reflectionStyle === 'mentor').length,
    motivational: memories.filter((m) => m.reflectionStyle === 'motivational').length,
    philosophical: memories.filter((m) => m.reflectionStyle === 'philosophical').length,
  };

  // 5. Most Common Themes
  const themeFrequencyMap = memories
    .flatMap((m) => m.themes || [])
    .reduce<Record<string, number>>((acc, t) => {
      const clean = t.trim();
      if (clean) acc[clean] = (acc[clean] || 0) + 1;
      return acc;
    }, {});
  const topThemesSorted = Object.entries(themeFrequencyMap)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);

  // 6. Most Common Tags
  const tagFrequencyMap = memories
    .flatMap((m) => m.tags || [])
    .reduce<Record<string, number>>((acc, t) => {
      const clean = t.trim().toLowerCase();
      if (clean) acc[clean] = (acc[clean] || 0) + 1;
      return acc;
    }, {});
  const topTagsSorted = Object.entries(tagFrequencyMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // 7. Wisdom Circle Contributions (People who influenced user most often)
  const wisdomContributions = wisdomList
    .map((w) => {
      const linkedCount = memories.filter(
        (m) => (m.linkedWisdomIds && m.linkedWisdomIds.includes(w.id)) || (w.linkedMemoryIds && w.linkedMemoryIds.includes(m.id))
      ).length;
      return { ...w, count: linkedCount };
    })
    .sort((a, b) => b.count - a.count);

  // 8. Book Wisdom Contributions (Books referenced most often)
  const bookContributions = bookWisdomList
    .map((b) => {
      const linkedCount = memories.filter(
        (m) => (m.linkedBookIds && m.linkedBookIds.includes(b.id)) || (b.linkedMemoryIds && b.linkedMemoryIds.includes(m.id))
      ).length;
      return { ...b, count: linkedCount };
    })
    .sort((a, b) => b.count - a.count);

  // 9. Personal Growth Timeline (Sorted chronological/reverse, filterable by style)
  const sortedTimelineMemories = [...memories].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const filteredTimelineMemories = sortedTimelineMemories.filter((m) => {
    if (growthTimelineFilter === 'ALL') return true;
    return (m.reflectionStyle || 'coach') === growthTimelineFilter;
  });

  // 10. Conversation → Reflection → Memory → Knowledge → Growth Journey Stages
  const journeyStages = [
    {
      stage: 1,
      name: 'Conversation',
      subtitle: 'Raw Human Experience',
      metric: `${messages.filter((msg) => msg.role === 'user').length} dialogues`,
      metricLabel: 'Dialogue turns shared',
      description: 'You share raw thoughts, dilemmas, personal feelings, or milestones with Smriti in a secure space.',
      status: messages.filter((msg) => msg.role === 'user').length > 0 ? 'Active' : 'Awaiting dialogue',
    },
    {
      stage: 2,
      name: 'Reflection',
      subtitle: 'Mindful Inquiry',
      metric: `${Object.values(styleDistribution).reduce((a, b) => a + b, 0)} sessions`,
      metricLabel: 'Reflective dialogues synthesized',
      description: 'Smriti guides you with targeted questions across Coach, Practical, Mentor, Motivational, and Philosophical modes.',
      status: memories.length > 0 ? 'Active' : 'Pending reflections',
    },
    {
      stage: 3,
      name: 'Structured Memory',
      subtitle: 'Distilled Vault Artifacts',
      metric: `${totalMemoriesCount} memories`,
      metricLabel: `${totalKeyLearningsCount} learnings captured`,
      description: 'Human-approved memories committed to owner-bound Firestore with explicit key learnings, action items, tags, and themes.',
      status: totalMemoriesCount > 0 ? 'Active' : 'Empty vault',
    },
    {
      stage: 4,
      name: 'Knowledge Graph',
      subtitle: 'Cross-Linked Wisdom Assets',
      metric: `${wisdomList.length + bookWisdomList.length} assets`,
      metricLabel: `${wisdomContributions.filter((w) => w.count > 0).length + bookContributions.filter((b) => b.count > 0).length} actively linked`,
      description: 'Memories are connected to your Wisdom Circle guides and Book Vault principles, creating an enduring Second Brain.',
      status: (wisdomList.length + bookWisdomList.length) > 0 ? 'Connected' : 'Unlinked',
    },
    {
      stage: 5,
      name: 'Personal Growth',
      subtitle: 'Execution & Self-Evolution',
      metric: `${completedActionItems} actions done`,
      metricLabel: `${completionRate}% follow-through rate`,
      description: 'Completed action milestones, synthesized growth insights, and transparent observations power continuous self-evolution.',
      status: completedActionItems > 0 ? 'Thriving' : 'In progress',
    },
  ];

  // Handler for Generating Growth Insights via API
  const handleGenerateGrowthInsights = async () => {
    if (!user) {
      addLog('warn', 'Sign in required to synthesize growth insights.');
      return;
    }
    if (memories.length === 0) {
      setGrowthError('Create at least one structured memory in your vault before synthesizing growth insights.');
      return;
    }

    setIsGeneratingGrowthReport(true);
    setGrowthError(null);
    addLog('info', 'Growth Intelligence Engine: Synthesizing personal development patterns...');

    try {
      const response = await fetch('/api/agent/growth-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          memories,
          styleDistribution,
          topThemes: topThemesSorted.slice(0, 8),
          topTags: topTagsSorted.slice(0, 8),
          completedActionItems: allCompletedActionItems.slice(0, 10),
          pendingActionItems: allPendingActionItems.slice(0, 10),
          wisdomMentors: wisdomContributions.slice(0, 5).map((w) => ({ name: w.personName, relationship: w.relationship, count: w.count })),
          bookReferences: bookContributions.slice(0, 5).map((b) => ({ title: b.bookTitle, author: b.author, count: b.count })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate growth report (${response.status})`);
      }

      const report: GrowthInsightsReport = await response.json();
      setGrowthReport(report);
      await saveGrowthInsightsReport(user.uid, report);
      addLog('success', `Growth Intelligence Report generated via ${report.modelUsed || 'Gemini'} and saved to Firestore.`);
    } catch (err: any) {
      console.error('Error generating growth insights:', err);
      setGrowthError(err?.message || 'Could not generate growth report.');
      addLog('error', `Growth report generation notice: ${err?.message}`);
    } finally {
      setIsGeneratingGrowthReport(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER: Unauthenticated Landing Screen
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div id="smriti-landing-container" className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-950">
        <header id="landing-header" className="w-full border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-700/10 text-amber-800 flex items-center justify-center border border-amber-800/20 shadow-xs">
                <Brain className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-stone-900 block leading-tight">Smriti AI</span>
                <span className="text-[11px] font-medium text-stone-700 tracking-wider block">स्मृति • SECOND BRAIN</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                id="header-sign-in-btn"
                onClick={handleSignIn}
                disabled={loadingAuth}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold px-4.5 py-2.2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{loadingAuth ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 pt-14 pb-20 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-amber-700/10 border border-amber-800/20 text-amber-900 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-amber-800" />
            <span>Personal Memory Agent with Human Oversight</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-stone-900 max-w-3xl leading-[1.15] mb-5">
            Remember. Reflect. Grow.
          </h1>

          <p className="text-lg text-stone-700 max-w-2xl leading-relaxed mb-8">
            Transform conversations into structured memories and reusable knowledge. Smriti AI extracts key learnings, actionable commitments, tags, and themes with transparent AI rationale and owner-isolated Cloud Firestore security.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 w-full sm:w-auto">
            <button
              id="hero-sign-in-btn"
              onClick={handleSignIn}
              disabled={loadingAuth}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-stone-900 hover:bg-stone-800 text-white font-medium text-base px-7 py-3.5 rounded-xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingAuth ? 'Connecting to Firebase...' : 'Continue with Google Sign-In'}</span>
              <ArrowRight className="w-4 h-4 text-amber-300 ml-1" />
            </button>
          </div>

          {authError && (
            <div className="mb-6 p-4 max-w-lg w-full bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1 text-red-950">Authentication Notice: Unauthorized Domain</p>
                <p className="leading-relaxed mb-2 text-red-800">{authError}</p>
                <div className="bg-white/80 border border-red-200 rounded-lg p-2.5 text-[11px] font-mono text-stone-900">
                  <div className="text-[10px] uppercase font-bold text-stone-500 mb-1">Preview Domain to Authorize:</div>
                  <div className="font-bold text-amber-900 select-all break-all">
                    {typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-d5y6syaamkhzelnwzly74l-512463036716.asia-east1.run.app'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-amber-700/10 text-amber-800 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">Memory Synthesis Agent</h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                Multi-turn reflective dialogue synthesizes key learnings, action items, tags, and theme taxonomy.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-700/10 text-emerald-800 flex items-center justify-center mb-4">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">Human Review & Approval</h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                Review, edit, and approve all AI-generated outputs before anything commits to your permanent vault.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-blue-700/10 text-blue-800 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-2">Owner-Bound Firestore Vault</h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                Strict path rules (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded text-amber-900">request.auth.uid == userId</code>) ensure your memories are isolated and private.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Authenticated Smriti AI Workspace
  // -------------------------------------------------------------
  return (
    <div id="smriti-app-container" className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-950">
      {/* Top Navigation Bar */}
      <header id="app-header" className="w-full border-b border-stone-200 bg-[#FAF8F5]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-700/10 text-amber-800 flex items-center justify-center border border-amber-800/20 shadow-xs">
              <Brain className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-stone-900 block leading-tight">Smriti AI</span>
              <span className="text-[10px] font-semibold text-stone-600 tracking-wider block">PERSONAL MEMORY AGENT</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-stone-200/70 p-1 rounded-xl gap-1">
            <button
              id="tab-reflect-btn"
              onClick={() => setActiveTab('reflect')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'reflect' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-800" />
              <span>Agent Reflection</span>
            </button>
            <button
              id="tab-vault-btn"
              onClick={() => setActiveTab('vault')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'vault' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-800" />
              <span>Memory Vault</span>
              <span className="bg-amber-700/15 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {memories.length}
              </span>
            </button>
            <button
              id="tab-wisdom-btn"
              onClick={() => setActiveTab('wisdom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'wisdom' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-700" />
              <span>Wisdom Circle</span>
              <span className="bg-rose-700/15 text-rose-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {wisdomList.length}
              </span>
            </button>
            <button
              id="tab-books-btn"
              onClick={() => setActiveTab('books')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'books' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
              <span>Book Wisdom</span>
              <span className="bg-indigo-700/15 text-indigo-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {bookWisdomList.length}
              </span>
            </button>
            <button
              id="tab-trusted-btn"
              onClick={() => setActiveTab('trusted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'trusted' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-700" />
              <span>Trusted Circle</span>
              <span className="bg-teal-700/15 text-teal-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {trustedContacts.length}
              </span>
            </button>
            <button
              id="tab-growth-btn"
              onClick={() => setActiveTab('growth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'growth' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-800" />
              <span>Growth Dashboard</span>
            </button>
            <button
              id="tab-retrieval-btn"
              onClick={() => setActiveTab('retrieval')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'retrieval' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-800" />
              <span>Retrieval Architecture (V3)</span>
              <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                V3
              </span>
            </button>
            <button
              id="tab-verification-btn"
              onClick={() => setActiveTab('verification')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'verification' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
              <span>Verification</span>
            </button>
            <button
              id="tab-rules-btn"
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'rules' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              Security Rules
            </button>
          </nav>

          {/* User Status and Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-stone-900">{user.displayName || 'Authenticated User'}</span>
              <span className="text-[10px] text-stone-600 truncate max-w-[180px]">{user.email}</span>
            </div>
            <button
              id="logout-btn"
              onClick={handleSignOut}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Save Success Banner */}
      {saveSuccessBanner && (
        <div className="w-full bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-6 py-2.5 flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{saveSuccessBanner}</span>
          </div>
          <button onClick={() => setSaveSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ========================================================= */}
        {/* TAB 1: AGENT REFLECTION (Multi-Turn Gemini Dialogue)       */}
        {/* ========================================================= */}
        {activeTab === 'reflect' && (
          <div className="space-y-6">
            {/* Reflection Style Selector Component */}
            <div id="reflection-style-selector" className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-800" />
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">Reflection Style</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      5 Modes Available
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Select a reflective persona to guide Gemini inquiries, conversational style, and memory extraction.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl self-start sm:self-auto text-xs">
                  <span className="text-stone-500 font-medium">Active Style:</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-950">
                    <activeModeConfig.icon className="w-3.5 h-3.5 text-amber-800" />
                    <span>{activeModeConfig.label} Mode</span>
                  </span>
                </div>
              </div>

              {/* 5 Modes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {REFLECTION_MODES.map((mode) => {
                  const isSelected = selectedStyle === mode.id;
                  const ModeIcon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      id={`style-mode-btn-${mode.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(mode.id);
                        addLog('info', `Switched Reflection Style to ${mode.label} Mode: ${mode.tagline}`);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-50/90 border-amber-800 ring-2 ring-amber-800/20 shadow-xs'
                          : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-amber-800 text-white shadow-xs' : 'bg-stone-200/80 text-stone-700'
                            }`}
                          >
                            <ModeIcon className="w-3.5 h-3.5" />
                          </div>
                          {isSelected ? (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded-md">
                              Active
                            </span>
                          ) : (
                            <span className="text-[9px] text-stone-400 font-medium uppercase">Select</span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-stone-900 mb-0.5">{mode.label}</div>
                        <div className="text-[11px] text-stone-600 font-medium leading-tight mb-2.5">
                          {mode.tagline}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200/60 space-y-1">
                        {mode.bullets.map((bullet, idx) => (
                          <div key={idx} className="text-[10px] text-stone-600 flex items-start gap-1.5 leading-snug">
                            <span
                              className={`w-1 h-1 rounded-full shrink-0 mt-1.5 ${
                                isSelected ? 'bg-amber-800' : 'bg-stone-400'
                              }`}
                            />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* V3 RETRIEVAL ARCHITECTURE ORCHESTRATION BAR */}
            <div id="v3-retrieval-orchestrator-banner" className="bg-stone-900 text-stone-100 rounded-2xl p-4 border border-stone-800 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white tracking-wide">V3 RETRIEVAL LAYER ACTIVE</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Dual-Index Engine
                      </span>
                      {latestRetrievalResult && (
                        <span className="text-[10px] font-mono text-stone-400">
                          Last: {latestRetrievalResult.latencyMs}ms ({latestRetrievalResult.modelUsed})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-300 mt-0.5">
                      Memory Vault retrieval is <strong>automatic</strong> • Wisdom Circle retrieval is <strong>strict opt-in with affirmative consent</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {/* Status Indicator: Vault */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-stone-300">Vault:</span>
                    <span className="text-emerald-300 font-semibold font-mono">{memories.length} Indexed</span>
                  </div>

                  {/* Status Indicator: Wisdom Consent Gate */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-stone-300">Wisdom:</span>
                    <span className="text-rose-300 font-semibold font-mono">Consent-Gated</span>
                  </div>

                  {/* Session Opt-In Toggle for Wisdom Circle */}
                  <label className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-stone-800 border border-stone-700 text-[11px] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={allowSessionWisdomOptIn}
                      onChange={(e) => {
                        setAllowSessionWisdomOptIn(e.target.checked);
                        addLog('info', `Wisdom Circle session opt-in changed to: ${e.target.checked ? 'ENABLED (Auto-inject top matches)' : 'DISABLED (Strict affirmative consent per advice)'}`);
                      }}
                      className="rounded border-stone-600 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span className="text-stone-200 font-medium">Session Wisdom Opt-In</span>
                  </label>

                  {/* Quick Link to Retrieval Architecture Studio */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('retrieval')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-amber-600/60 shrink-0"
                  >
                    <span>Retrieval Studio</span>
                    <ArrowRight className="w-3 h-3 text-amber-300" />
                  </button>
                </div>
              </div>

              {/* Latest Provenance Summary Bar if available */}
              {latestRetrievalResult && (latestRetrievalResult.retrievedMemories.length > 0 || latestRetrievalResult.consentedWisdomInjected.length > 0) && (
                <div className="mt-2.5 pt-2.5 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-stone-400 font-medium">Latest Reflection Provenance:</span>
                    {latestRetrievalResult.retrievedMemories.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/80">
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span>{latestRetrievalResult.retrievedMemories.length} Memories Auto-Injected (Top: {Math.round(latestRetrievalResult.retrievedMemories[0].relevanceScore * 100)}%)</span>
                      </span>
                    )}
                    {latestRetrievalResult.consentedWisdomInjected.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-300 bg-rose-950/70 px-2 py-0.5 rounded border border-rose-800/80">
                        <HeartHandshake className="w-3 h-3 text-rose-400" />
                        <span>Guided by {latestRetrievalResult.consentedWisdomInjected.map(w => w.personName).join(', ')}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedInspectionProvenance(latestRetrievalResult.provenance)}
                    className="text-amber-400 hover:text-amber-300 underline underline-offset-2 text-[11px] font-medium cursor-pointer"
                  >
                    Inspect Provenance & Ranking Factors →
                  </button>
                </div>
              )}
            </div>

            {/* Conversation and Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Interactive Conversation Thread */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col h-[740px]">
                {/* Conversation Header */}
                <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-stone-900">Smriti Reflection Agent</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <activeModeConfig.icon className="w-3 h-3 text-amber-800" />
                          <span>{activeModeConfig.label} Mode</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">{activeModeConfig.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Auto-Speak Toggle */}
                    <button
                      id="btn-toggle-autospeak"
                      type="button"
                      onClick={() => {
                        const nextVal = !autoSpeakEnabled;
                        setAutoSpeakEnabled(nextVal);
                        if (!nextVal) stopSpeaking();
                        addLog('info', `Auto-speak responses ${nextVal ? 'enabled' : 'disabled'}`);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        autoSpeakEnabled
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                          : 'bg-white hover:bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                      title="Automatically vocalize agent responses"
                    >
                      {autoSpeakEnabled ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-amber-800 animate-pulse" />
                          <span className="hidden sm:inline">Auto-Speak ON</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                          <span className="hidden sm:inline">Auto-Speak OFF</span>
                        </>
                      )}
                    </button>

                    {/* Open Voice Agent Session */}
                    <button
                      id="btn-open-voice-session"
                      type="button"
                      onClick={startVoiceSession}
                      className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-3 py-1.8 rounded-lg transition-all shadow-xs border border-stone-850 cursor-pointer"
                      title="Start Two-Way Voice Dialogue"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Headphones className="w-3.5 h-3.5 text-amber-300" />
                      <span>Voice Agent</span>
                    </button>

                    {/* Scan Related Wisdom across Memories, Wisdom Circle, and Book Wisdom */}
                    <button
                      id="btn-scan-related-wisdom"
                      type="button"
                      onClick={handleTriggerManualWisdomSearch}
                      disabled={isSearchingRelatedWisdom}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        pendingWisdomPrompt
                          ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-200'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200 shadow-xs'
                      }`}
                      title="Search Related Wisdom across Memories, Wisdom Circle, and Book Wisdom"
                    >
                      <Compass className={`w-3.5 h-3.5 text-amber-800 ${isSearchingRelatedWisdom ? 'animate-spin' : ''}`} />
                      <span>
                        {isSearchingRelatedWisdom
                          ? 'Searching...'
                          : pendingWisdomPrompt
                          ? `Wisdom (${pendingWisdomPrompt.items.length})`
                          : 'Related Wisdom'}
                      </span>
                    </button>

                    {/* Synthesize Structured Memory */}
                    <button
                      id="btn-synthesize-top"
                      onClick={handleSynthesizeMemory}
                      disabled={isSynthesizing || messages.length <= 1}
                      className="inline-flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold px-3.5 py-1.8 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{isSynthesizing ? 'Synthesizing...' : 'Synthesize Memory'}</span>
                    </button>
                  </div>
                </div>

                {/* User-Consented Wisdom Attached Banner (Strict Consent-Gated) */}
                {consentedWisdomAttached && (
                  <div
                    id="consented-wisdom-banner"
                    className="mx-4 mt-3 bg-rose-50/90 border border-rose-200 rounded-xl p-3 flex items-start justify-between gap-3 text-left animate-fadeIn"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                        <HeartHandshake className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-rose-950">
                            Consulting Wisdom: {consentedWisdomAttached.personName}
                          </span>
                          <span className="text-[10px] font-semibold bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded-md">
                            {consentedWisdomAttached.relationship}
                          </span>
                          <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                            Explicit Consent Granted
                          </span>
                        </div>
                        <p className="text-xs text-rose-900 mt-0.5 italic line-clamp-1">
                          &ldquo;{consentedWisdomAttached.wisdomText}&rdquo;
                        </p>
                      </div>
                    </div>
                    <button
                      id="revoke-wisdom-consent-btn"
                      type="button"
                      onClick={handleRevokeWisdomConsent}
                      title="Detach Wisdom"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:text-rose-950 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                      <span>Detach</span>
                    </button>
                  </div>
                )}

              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'model' && (
                      <div className="w-7 h-7 rounded-lg bg-amber-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                        स्म
                      </div>
                    )}
                    <div
                      className={`max-w-2xl rounded-2xl px-4.5 py-3.5 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-stone-900 text-white rounded-tr-none'
                          : 'bg-stone-100/90 text-stone-900 rounded-tl-none border border-stone-200/70 shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed space-y-2">{m.content}</div>

                      {/* V3 Retrieval Provenance Trace for Model Messages */}
                      {m.role === 'model' && m.provenance && (m.provenance.memoriesUsed.length > 0 || m.provenance.wisdomUsed.length > 0) && (
                        <div className="mt-2.5 pt-2 border-t border-stone-200/70 space-y-1.5 text-left">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setExpandedProvenanceMessageId(expandedProvenanceMessageId === m.id ? null : m.id)}
                              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 px-2 py-0.8 rounded-md transition-colors cursor-pointer"
                            >
                              <Compass className="w-3 h-3 text-amber-800" />
                              <span>
                                Grounded in {m.provenance.memoriesUsed.length} memories
                                {m.provenance.wisdomUsed.length > 0 ? ` • ${m.provenance.wisdomUsed.length} wisdom mentor` : ''}
                              </span>
                              {expandedProvenanceMessageId === m.id ? (
                                <ChevronUp className="w-3 h-3 text-stone-400" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-stone-400" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedInspectionProvenance(m.provenance || null)}
                              className="text-[10px] text-amber-900 hover:text-amber-950 font-medium underline underline-offset-2 cursor-pointer"
                            >
                              Full Ranking Audit
                            </button>
                          </div>

                          {/* Expanded In-Place Provenance Drawer */}
                          {expandedProvenanceMessageId === m.id && (
                            <div className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-2 text-[11px] animate-fadeIn">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                Retrieval Trace & Grounding Context:
                              </div>
                              {m.provenance.memoriesUsed.map((mem) => (
                                <div key={mem.id} className="p-2 rounded-lg bg-stone-50 border border-stone-200/80 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-stone-900 line-clamp-1">{mem.summary}</span>
                                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                                      {mem.relevancePercent || Math.round((mem.relevanceScore || 0) * 100)}% match
                                    </span>
                                  </div>
                                  {mem.rankingFactors && (
                                    <div className="text-[10px] text-stone-600">
                                      <span className="font-medium text-stone-700">Formula factors: </span>
                                      lex: {(mem.rankingFactors.lexicalScore ?? 0).toFixed(2)} • thm: {(mem.rankingFactors.thematicScore ?? mem.rankingFactors.thematicBonus ?? 0).toFixed(2)} • rec: {(mem.rankingFactors.recencyScore ?? mem.rankingFactors.recencyWeight ?? 0).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {m.provenance.wisdomUsed.map((wis) => (
                                <div key={wis.id} className="p-2 rounded-lg bg-rose-50/80 border border-rose-200 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-rose-950">
                                      {wis.personName} ({wis.relationship})
                                    </span>
                                    <span className="text-[10px] font-bold text-rose-800 bg-rose-200 px-1.5 py-0.2 rounded shrink-0">
                                      Consented Wisdom
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-rose-900 italic line-clamp-2">
                                    &ldquo;{wis.wisdomText}&rdquo;
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Spoken Audio Controls for Model Messages */}
                      {m.role === 'model' && (
                        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-stone-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              if (currentlySpeakingId === m.id) {
                                stopSpeaking();
                              } else {
                                speakText(m.content, m.id);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              currentlySpeakingId === m.id
                                ? 'bg-amber-800 text-white shadow-xs'
                                : 'bg-white hover:bg-stone-200/80 text-stone-700 border border-stone-200 shadow-2xs'
                            }`}
                          >
                            {currentlySpeakingId === m.id ? (
                              <>
                                <VolumeX className="w-3 h-3 animate-pulse" />
                                <span>Stop Voice</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-amber-800" />
                                <span>Listen ({selectedStyle})</span>
                              </>
                            )}
                          </button>
                          <span className="text-[10px] text-stone-400">
                            {VOICE_STYLE_SPEECH_PARAMS[selectedStyle]?.styleDesc || 'Spoken Voice'}
                          </span>
                        </div>
                      )}

                      <div className={`text-[9px] mt-2 ${m.role === 'user' ? 'text-stone-400' : 'text-stone-500'}`}>
                        {m.timestamp.slice(11, 16)} • {m.role === 'user' ? 'You' : 'Smriti Agent'}
                      </div>
                    </div>
                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-stone-300 text-stone-800 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
                        {user.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                ))}

                {isSendingMessage && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-amber-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold animate-pulse">
                      स्म
                    </div>
                    <div className="bg-stone-100 text-stone-600 rounded-2xl rounded-tl-none px-4 py-3 text-xs border border-stone-200 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-800" />
                      <span>Smriti is reflecting on your thoughts...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Starter Prompts */}
              {messages.length <= 2 && (
                <div className="px-4 pb-2">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
                    Starter Inquiries ({activeModeConfig.label} Mode):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModeConfig.starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-[11px] bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200 px-2.5 py-1 rounded-lg transition-colors text-left cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 border-t border-stone-100 bg-white rounded-b-2xl">
                {/* Voice Listening Active Status Banner */}
                {isListening && (
                  <div className="flex items-center justify-between px-3.5 py-2 mb-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      <span className="font-semibold">Listening... Speak your reflection now</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer ml-2"
                    >
                      Done speaking
                    </button>
                  </div>
                )}

                {/* Voice Error Notification */}
                {voiceError && (
                  <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    <span className="text-[11px] leading-tight">{voiceError}</span>
                    <button
                      type="button"
                      onClick={() => setVoiceError(null)}
                      className="text-red-500 hover:text-red-700 ml-2 shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* V3 WISDOM CIRCLE AFFIRMATIVE CONSENT GATE (Strict Opt-In) */}
                {pendingWisdomConsentCandidate && (
                  <div
                    id="v3-wisdom-consent-gate"
                    className="mb-3 p-3.5 bg-gradient-to-br from-rose-50 via-white to-amber-50/50 border-2 border-rose-300 rounded-2xl shadow-xs text-left animate-fadeIn"
                  >
                    <div className="flex items-start justify-between gap-2.5 mb-2 pb-2 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                          <HeartHandshake className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-rose-950">
                              Wisdom Circle Guidance Available: {pendingWisdomConsentCandidate.personName}
                            </span>
                            <span className="text-[10px] font-semibold bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded-md">
                              {pendingWisdomConsentCandidate.relationship}
                            </span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-md">
                              {Math.round(pendingWisdomConsentCandidate.relevanceScore * 100)}% Match
                            </span>
                          </div>
                          <span className="text-[10px] text-rose-700 font-medium">
                            Strict Opt-In Gate: Smriti withheld this counsel from synthesis until you approve.
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeclineCandidateWisdom(pendingWisdomConsentCandidate.id)}
                        className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-white/90 border border-rose-200/80 rounded-xl p-2.5 mb-2.5 flex items-start gap-2">
                      <Quote className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-950 font-serif italic leading-relaxed">
                        &ldquo;{pendingWisdomConsentCandidate.wisdomText}&rdquo;
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-stone-600">
                        Would you like Smriti to integrate this mentor&apos;s guidance into your reflection?
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeclineCandidateWisdom(pendingWisdomConsentCandidate.id)}
                          className="px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Keep Private
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGrantConsentForCandidateWisdom(pendingWisdomConsentCandidate)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.2 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Grant Consent & Weave In Wisdom</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Permission-Gated Related Wisdom Retrieval Notification */}
                {pendingWisdomPrompt && (
                  <div
                    id="related-wisdom-consent-banner"
                    className="mb-2.5 p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 border border-amber-200/90 rounded-xl shadow-xs animate-fadeIn"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-800 text-amber-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-amber-950">Related Wisdom Discovered</span>
                            <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Network className="w-3 h-3 text-amber-800" />
                              <span>
                                {pendingWisdomPrompt.items.length} Asset
                                {pendingWisdomPrompt.items.length > 1 ? 's' : ''}
                              </span>
                            </span>
                            <span className="text-[10px] text-stone-500 font-medium">Consent-Gated</span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-stone-900 font-bold">
                              I found potentially relevant wisdom.
                            </p>
                            <p className="text-xs text-amber-950 font-medium">
                              Would you like to review it?
                            </p>
                          </div>
                          <p className="text-[11px] text-stone-600 mt-0.5">
                            Searched across your <strong>Memories</strong>, <strong>Wisdom Circle</strong>, and <strong>Book Wisdom</strong>. Results are private and require your consent to display.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          id="btn-review-related-wisdom"
                          type="button"
                          onClick={() => {
                            setIsReviewingRelatedWisdom(true);
                            addLog('info', 'User granted permission to review related wisdom.');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Yes, Review Wisdom ({pendingWisdomPrompt.items.length})</span>
                        </button>
                        <button
                          id="btn-dismiss-related-wisdom"
                          type="button"
                          onClick={() => {
                            setPendingWisdomPrompt(null);
                            addLog('info', 'User dismissed related wisdom notification. Results withheld.');
                          }}
                          className="px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                        >
                          Not now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proactive Trusted Circle Reachout Assistance Banner */}
                {reachoutOfferPrompt && reachoutOfferPrompt.open && (
                  <div
                    id="trusted-circle-offer-banner"
                    className="mb-2.5 p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50/50 to-teal-50 border border-teal-200/90 rounded-xl shadow-xs animate-fadeIn"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-800 text-teal-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <HeartHandshake className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-teal-950">
                              Human Connection Bridge
                            </span>
                            <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded-md">
                              Trusted Circle
                            </span>
                          </div>
                          <p className="text-xs text-teal-900 mt-0.5 font-medium">
                            &ldquo;I can help you draft a message to someone in your Trusted Circle. Would you like to do that?&rdquo;
                          </p>
                          <p className="text-[11px] text-teal-700 mt-0.5">
                            Smriti will assist by structuring your experience and needs into a warm, low-pressure draft. You retain complete control and consent.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          id="btn-accept-reachout-draft"
                          type="button"
                          onClick={() => openReachoutModal(undefined, reachoutOfferPrompt.contextSnippet)}
                          className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Draft Message</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReachoutOfferPrompt(null)}
                          className="px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-teal-100/60 rounded-lg transition-colors cursor-pointer"
                        >
                          Not now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isListening) {
                      try {
                        recognitionRef.current?.stop();
                      } catch {
                        // ignore
                      }
                      setIsListening(false);
                    }
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="chat-reflection-input"
                      value={conversationInput}
                      onChange={(e) => setConversationInput(e.target.value)}
                      placeholder={
                        isListening
                          ? 'Listening... Speak your reflection (transcribing live)...'
                          : 'Share what happened, an insight, or a decision...'
                      }
                      className={`w-full text-xs px-3.5 py-2.5 pr-8 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-800 transition-colors ${
                        isListening
                          ? 'border-amber-400 bg-amber-50/50 text-stone-900 font-medium'
                          : 'border-stone-200'
                      }`}
                    />
                    {conversationInput && (
                      <button
                        type="button"
                        onClick={() => setConversationInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                        title="Clear text"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Consult Wisdom Circle (Strict Consent-Gated) Button */}
                  <button
                    type="button"
                    id="btn-consult-wisdom"
                    onClick={() => handleOpenConsultConsentModal()}
                    title="Consult Wisdom Circle (Requires your explicit consent)"
                    className={`inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
                      consentedWisdomAttached
                        ? 'bg-rose-100 text-rose-900 border-rose-300 ring-2 ring-rose-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    <HeartHandshake className="w-4 h-4 text-rose-700" />
                    <span className="hidden sm:inline">
                      {consentedWisdomAttached ? 'Wisdom Active' : 'Consult Wisdom'}
                    </span>
                  </button>

                  {/* Microphone Speech-to-Text Button */}
                  <button
                    type="button"
                    id="btn-voice-input"
                    onClick={toggleVoiceInput}
                    title={
                      isListening
                        ? 'Stop listening'
                        : 'Start voice input (Speech-to-Text)'
                    }
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0 cursor-pointer ${
                      isListening
                        ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-100 shadow-xs animate-pulse'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4 text-white animate-pulse" />
                    ) : (
                      <Mic className="w-4 h-4 text-stone-700" />
                    )}
                  </button>

                  {/* Send Reflection Button */}
                  <button
                    type="submit"
                    id="btn-send-reflection"
                    disabled={isSendingMessage || !conversationInput.trim()}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
                    title="Send reflection"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-stone-400">
                  <span>Press Enter or click Send</span>
                  <span>Tap Mic for voice reflection (editable before sending)</span>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Agent Context & Synthesis Panel */}
            <div className="space-y-6">
              {/* Agent Persona Card */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-900 flex items-center justify-center">
                    <activeModeConfig.icon className="w-4 h-4 text-amber-900" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">{activeModeConfig.label} Reflection Mode</h4>
                    <span className="text-[11px] text-stone-500">{activeModeConfig.tagline}</span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mb-3">
                  {activeModeConfig.description}
                </p>

                {/* Mode Directives */}
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/70 mb-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Mode Focus Directives:
                  </span>
                  {activeModeConfig.bullets.map((b, i) => (
                    <div key={i} className="text-xs text-stone-700 flex items-center gap-1.5">
                      <span className="text-amber-800 font-bold">•</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-stone-100 pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Messages in Active Thread:</span>
                    <span className="font-bold text-stone-900">{messages.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Memories in Vault:</span>
                    <span className="font-bold text-emerald-700">{memories.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Isolation Target:</span>
                    <span className="font-mono text-[10px] text-amber-900 truncate max-w-[140px]">
                      /users/{user.uid.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <button
                    id="btn-trigger-synthesis"
                    onClick={handleSynthesizeMemory}
                    disabled={isSynthesizing || messages.length <= 1}
                    className="w-full inline-flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
                    <span>{isSynthesizing ? 'Synthesizing with Gemini...' : 'Synthesize into Structured Memory'}</span>
                  </button>
                  <p className="text-[10px] text-stone-500 text-center mt-2">
                    Launches the Human Review & Approval Modal before writing to Firestore.
                  </p>
                </div>
              </div>

              {/* Responsible AI Transparency Guidelines */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-semibold text-stone-900">Responsible AI Directives</h4>
                </div>
                <ul className="text-xs text-stone-600 space-y-2">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Human Oversight:</strong> No memory is saved without your explicit review and approval.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Full Editability:</strong> You can edit summaries, learnings, actions, and tags prior to persistence.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>AI Transparency:</strong> Every output includes the rationale explaining why tags and actions were inferred.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MEMORY VAULT (Search, Filter & Action Tracking)     */}
        {/* ========================================================= */}
        {activeTab === 'vault' && (
          <div className="space-y-6">
            {/* Vault Controls Bar */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    id="vault-search-input"
                    value={vaultSearchQuery}
                    onChange={(e) => setVaultSearchQuery(e.target.value)}
                    placeholder="Search summaries, learnings, tags, or themes..."
                    className="w-full text-xs pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-800"
                  />
                </div>

                {/* Theme Filter */}
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <select
                    id="theme-filter-select"
                    value={selectedThemeFilter}
                    onChange={(e) => setSelectedThemeFilter(e.target.value)}
                    className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-amber-800 text-stone-800 cursor-pointer"
                  >
                    <option value="ALL">All Themes ({memories.length})</option>
                    {allThemes.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reflection Style Filter */}
                <div className="flex items-center gap-1.5">
                  <select
                    id="style-filter-select"
                    value={selectedStyleFilter}
                    onChange={(e) => setSelectedStyleFilter(e.target.value)}
                    className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-amber-800 text-stone-800 cursor-pointer"
                  >
                    <option value="ALL">All Styles ({memories.length})</option>
                    {REFLECTION_MODES.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label} Style
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-new-reflection-vault"
                  onClick={() => setActiveTab('reflect')}
                  className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Reflection</span>
                </button>
              </div>
            </div>

            {/* Memories List */}
            {filteredMemories.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <Brain className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-stone-800 mb-1">
                  {memories.length === 0 ? 'Your Memory Vault is Empty' : 'No Matching Memories Found'}
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto mb-4">
                  {memories.length === 0
                    ? 'Start a reflective dialogue in the Agent Reflection tab to synthesize your first structured memory.'
                    : 'Try clearing your search query or theme filter to see all saved memories.'}
                </p>
                {memories.length === 0 && (
                  <button
                    onClick={() => setActiveTab('reflect')}
                    className="inline-flex items-center gap-1.5 bg-amber-800 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start First Reflection</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-amber-700/30 transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {mem.reflectionStyle && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              {mem.reflectionStyle === 'coach' && <Compass className="w-3 h-3 text-amber-800" />}
                              {mem.reflectionStyle === 'practical' && <Zap className="w-3 h-3 text-emerald-800" />}
                              {mem.reflectionStyle === 'mentor' && <Briefcase className="w-3 h-3 text-blue-800" />}
                              {mem.reflectionStyle === 'motivational' && <Flame className="w-3 h-3 text-orange-800" />}
                              {mem.reflectionStyle === 'philosophical' && <BookOpen className="w-3 h-3 text-purple-800" />}
                              <span className="capitalize">{mem.reflectionStyle}</span>
                            </span>
                          )}
                          {mem.themes?.map((th, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md"
                            >
                              {th}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-500 font-mono">{formatDisplayDate(mem.createdAt)}</span>
                          <button
                            onClick={() => handleDeleteDocument(mem.id)}
                            title="Delete memory"
                            className="text-stone-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Summary */}
                      <h4 className="text-sm font-semibold text-stone-900 leading-snug mb-3">{mem.summary}</h4>

                      {/* Key Learnings */}
                      {mem.keyLearnings && mem.keyLearnings.length > 0 && (
                        <div className="mb-3.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                            Key Learnings
                          </span>
                          <ul className="space-y-1 text-xs text-stone-700">
                            {mem.keyLearnings.map((learning, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-amber-800 font-bold">•</span>
                                <span>{learning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Items Checklist */}
                      {mem.actionItems && mem.actionItems.length > 0 && (
                        <div className="mb-3.5 bg-stone-50/80 p-3 rounded-xl border border-stone-200/70">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                              Action Items
                            </span>
                            <span className="text-[10px] text-stone-600 font-mono">
                              {mem.actionItems.filter((a) => a.completed).length} / {mem.actionItems.length}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {mem.actionItems.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleToggleActionItem(mem.id, item.id, !item.completed)}
                                className="w-full flex items-start gap-2 text-left text-xs py-0.5 hover:text-amber-950 transition-colors cursor-pointer group"
                              >
                                {item.completed ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-stone-400 group-hover:text-stone-600 shrink-0 mt-0.5" />
                                )}
                                <span className={item.completed ? 'line-through text-stone-400' : 'text-stone-800'}>
                                  {item.text}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {mem.tags && mem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {mem.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                      {/* Linked Wisdom Circle Attribution */}
                      <div className="mb-3 pt-2.5 border-t border-stone-100 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                            <HeartHandshake className="w-3 h-3 text-rose-600" />
                            <span>Wisdom Circle Attribution</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setLinkWisdomModalMemory(mem)}
                            className="text-[10px] font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-0.5 cursor-pointer"
                            title="Link a wisdom entry to this memory"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Link Advice</span>
                          </button>
                        </div>
                        {mem.linkedWisdomIds && mem.linkedWisdomIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {mem.linkedWisdomIds.map((wid) => {
                              const wEntry = wisdomList.find((w) => w.id === wid);
                              return (
                                <div
                                  key={wid}
                                  className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-900 border border-rose-200/80 rounded-lg px-2 py-1 text-[11px]"
                                >
                                  <span className="font-semibold">{wEntry?.personName || 'Wisdom Entry'}</span>
                                  {wEntry && (
                                    <span className="text-[10px] text-rose-600">({wEntry.relationship})</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenConsultConsentModal(wEntry)}
                                    className="text-[10px] font-bold text-rose-700 hover:underline ml-1 cursor-pointer"
                                    title="Consult this wisdom in agent reflection"
                                  >
                                    Consult
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-stone-400 italic">No Wisdom Circle entry linked yet.</p>
                        )}
                      </div>

                      {/* Linked Book Wisdom */}
                      <div className="mb-3 pt-2.5 border-t border-stone-100 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-indigo-600" />
                            <span>Linked Book Wisdom</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setLinkBookModalMemory(mem)}
                            className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 cursor-pointer"
                            title="Link a book wisdom entry to this memory"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Link Book</span>
                          </button>
                        </div>
                        {mem.linkedBookIds && mem.linkedBookIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {mem.linkedBookIds.map((bid) => {
                              const bEntry = bookWisdomList.find((b) => b.id === bid);
                              return (
                                <div
                                  key={bid}
                                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200/80 rounded-lg px-2 py-1 text-[11px]"
                                >
                                  <span className="font-semibold">{bEntry?.bookTitle || 'Book Entry'}</span>
                                  {bEntry && (
                                    <span className="text-[10px] text-indigo-600">by {bEntry.author}</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('books');
                                      setBookSearchQuery(bEntry?.bookTitle || '');
                                    }}
                                    className="text-[10px] font-bold text-indigo-700 hover:underline ml-1 cursor-pointer"
                                    title="View in Book Wisdom vault"
                                  >
                                    View
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-stone-400 italic">No Book Wisdom linked yet.</p>
                        )}
                      </div>

                    {/* Collapsible AI Transparency Explanation */}
                    <div className="pt-2 border-t border-stone-100">
                      <button
                        onClick={() =>
                          setExpandedExplanationId(expandedExplanationId === mem.id ? null : mem.id)
                        }
                        className="w-full flex items-center justify-between text-[11px] text-stone-500 hover:text-stone-800 py-1"
                      >
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-amber-700" />
                          <span>AI Transparency Rationale</span>
                        </span>
                        {expandedExplanationId === mem.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedExplanationId === mem.id && (
                        <div className="mt-2 p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-950 leading-relaxed">
                          <p className="mb-1.5">{mem.aiExplanation}</p>
                          {mem.secondBrainMeta?.suggestedFollowUps && mem.secondBrainMeta.suggestedFollowUps.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-amber-200/50 text-[10px] text-stone-600">
                              <span className="font-semibold text-amber-900 block">Suggested Future Reflection:</span>
                              <span>{mem.secondBrainMeta.suggestedFollowUps[0]}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2.5: WISDOM CIRCLE (Life Philosophies & Mentors)      */}
        {/* ========================================================= */}
        {activeTab === 'wisdom' && (
          <div className="space-y-6">
            {/* Wisdom Circle Header & Actions */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-stone-900 tracking-tight">Wisdom Circle</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                        {wisdomList.length} {wisdomList.length === 1 ? 'Entry' : 'Entries'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Preserve timeless advice, lessons, and life philosophies from mentors, family, and figures who shaped you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  id="btn-add-wisdom"
                  type="button"
                  onClick={openCreateWisdomModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-800 hover:bg-rose-900 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Preserve Wisdom</span>
                </button>
              </div>
            </div>

            {/* Zero-Auto-Surface & Consent Gate Privacy Banner */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-amber-900">
                  Zero-Auto-Surface Privacy Standard & Sovereign Retrieval
                </span>
                <p className="text-stone-700 leading-relaxed">
                  Wisdom Circle entries are strictly user-isolated in your personal Firestore vault. In accordance with your explicit directive, Smriti AI will <strong>never automatically surface, scan, or inject</strong> this wisdom into conversations without your explicit, opt-in consent via the &ldquo;Consult Wisdom&rdquo; action.
                </p>
              </div>
            </div>

            {/* Search and Relationship Filter Controls */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="wisdom-search-input"
                    value={wisdomSearchQuery}
                    onChange={(e) => setWisdomSearchQuery(e.target.value)}
                    placeholder="Search by mentor name, advice, situation, why it matters, or tags..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-800"
                  />
                  {wisdomSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWisdomSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Relationship Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(['ALL', 'Mother', 'Father', 'Teacher', 'Mentor', 'Friend', 'Sibling', 'Grandparent', 'Colleague', 'Partner', 'Other'] as const).map(
                  (rel) => {
                    const isSelected = selectedRelationshipFilter === rel;
                    const count =
                      rel === 'ALL'
                        ? wisdomList.length
                        : wisdomList.filter((w) => (w.relationship || '').toLowerCase() === rel.toLowerCase()).length;
                    return (
                      <button
                        key={rel}
                        id={`filter-relationship-${rel.toLowerCase()}`}
                        type="button"
                        onClick={() => setSelectedRelationshipFilter(rel)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-rose-800 text-white font-semibold shadow-2xs'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        <span>{rel === 'ALL' ? 'All Roles' : rel}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected ? 'bg-rose-950 text-rose-200' : 'bg-stone-150 text-stone-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Wisdom Cards Grid */}
            {filteredWisdomList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-800 mx-auto flex items-center justify-center">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-stone-900 mb-1">
                    {wisdomSearchQuery || selectedRelationshipFilter !== 'ALL'
                      ? 'No matching wisdom entries found'
                      : 'Preserve your first life philosophy or mentor advice'}
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    {wisdomSearchQuery || selectedRelationshipFilter !== 'ALL'
                      ? 'Try adjusting your search terms or clearing the relationship filter.'
                      : 'Record guidance from a Mother, Father, Teacher, Mentor, Friend, Sibling, or Grandparent to preserve it forever.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateWisdomModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-800 hover:bg-rose-900 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Preserve First Wisdom Entry</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredWisdomList.map((entry) => {
                  const linkedMems = memories.filter((m) =>
                    entry.linkedMemoryIds?.includes(m.id) || m.linkedWisdomIds?.includes(entry.id)
                  );
                  const isCurrentlyConsented = consentedWisdomAttached?.id === entry.id;

                  return (
                    <div
                      key={entry.id}
                      id={`wisdom-card-${entry.id}`}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-all group"
                    >
                      <div>
                        {/* Card Header: Person & Relationship */}
                        <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-stone-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold text-xs">
                              {entry.personName.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-stone-900 leading-tight">
                                {entry.personName}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100/80 text-rose-900 border border-rose-200">
                                  {entry.relationship}
                                </span>
                                <span className="text-[10px] text-stone-500 font-mono">
                                  {formatDisplayDate(entry.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions: Edit & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              id={`edit-wisdom-${entry.id}`}
                              onClick={() => openEditWisdomModal(entry)}
                              title="Edit wisdom entry"
                              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              id={`delete-wisdom-${entry.id}`}
                              onClick={() => handleDeleteWisdom(entry.id, entry.personName)}
                              title="Delete wisdom entry"
                              className="text-stone-400 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Wisdom / Advice Quote Block */}
                        <div className="mb-3.5 bg-rose-50/60 border-l-3 border-rose-600 p-3.5 rounded-r-xl">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block mb-1">
                            Wisdom / Advice:
                          </span>
                          <p className="text-xs text-stone-900 leading-relaxed font-serif italic">
                            &ldquo;{entry.wisdomText}&rdquo;
                          </p>
                        </div>

                        {/* Situation Context */}
                        <div className="mb-2.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-0.5">
                            Situation / Context When Given:
                          </span>
                          <p className="text-xs text-stone-700 leading-relaxed">
                            {entry.situation}
                          </p>
                        </div>

                        {/* Why It Matters */}
                        <div className="mb-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-0.5">
                            Why It Endures & Shapes You:
                          </span>
                          <p className="text-xs text-stone-700 leading-relaxed">
                            {entry.whyItMatters}
                          </p>
                        </div>

                        {/* Themes & Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {entry.themes?.map((theme, i) => (
                            <span
                              key={`theme-${i}`}
                              className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md"
                            >
                              {theme}
                            </span>
                          ))}
                          {entry.tags?.map((tag, i) => (
                            <span
                              key={`tag-${i}`}
                              className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-mono"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Linked Memory Vault Entries */}
                        <div className="pt-2 border-t border-stone-100 mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-emerald-800" />
                              <span>Linked Vault Memories ({linkedMems.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setLinkMemoryModalWisdom(entry)}
                              className="text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer"
                              title="Link an existing memory to this wisdom entry"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Link Memory</span>
                            </button>
                          </div>

                          {linkedMems.length > 0 ? (
                            <div className="space-y-1">
                              {linkedMems.map((m) => (
                                <div
                                  key={m.id}
                                  className="text-[11px] text-stone-700 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/60 flex items-center justify-between"
                                >
                                  <span className="truncate max-w-[260px] font-medium">{m.summary}</span>
                                  <span className="text-[10px] text-stone-500 font-mono shrink-0 ml-2">
                                    {formatDisplayDate(m.createdAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-stone-400 italic">No memories linked yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Consent-Gated Consult Action */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-stone-400" />
                          <span>Consent-Gated</span>
                        </span>

                        {isCurrentlyConsented ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-semibold border border-emerald-300">
                            <Check className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Active in Reflection</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`consult-btn-${entry.id}`}
                            onClick={() => handleOpenConsultConsentModal(entry)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-900 hover:text-white bg-rose-50 hover:bg-rose-800 border border-rose-200 hover:border-rose-800 transition-all cursor-pointer"
                            title="Require your consent to bring this wisdom into an active reflection"
                          >
                            <HeartHandshake className="w-3.5 h-3.5" />
                            <span>Consult in Reflection</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: BOOK WISDOM MODULE                                   */}
        {/* ========================================================= */}
        {activeTab === 'books' && (
          <div className="space-y-6">
            {/* Book Wisdom Header & Actions */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-stone-900 tracking-tight">Book Wisdom</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                        {bookWisdomList.length} {bookWisdomList.length === 1 ? 'Book' : 'Books'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Preserve core ideas, memorable quotes, principles, and personal reflections from books that shaped your thinking.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {bookWisdomList.length === 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyBookTemplate({
                          bookTitle: 'Atomic Habits',
                          author: 'James Clear',
                          keyIdea: 'Small, 1% incremental improvements compound over time into massive personal and professional transformations. Systems beat goals.',
                          quote: 'You do not rise to the level of your goals. You fall to the level of your systems.',
                          personalReflection: 'Focus less on distant targets and more on designing frictionless daily routines. When building Smriti AI, daily incremental commits matter more than waiting for a giant release.',
                          tags: ['habits', 'productivity', 'systems-thinking'],
                          themes: ['Personal Growth', 'Discipline'],
                        });
                        setBookModalOpen(true);
                      }}
                      className="text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                    >
                      Sample: Atomic Habits
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyBookTemplate({
                          bookTitle: 'Meditations',
                          author: 'Marcus Aurelius',
                          keyIdea: 'You have power over your mind—not outside events. Realize this, and you will find great strength.',
                          quote: 'The impediment to action advances action. What stands in the way becomes the way.',
                          personalReflection: 'Every engineering roadblock or constraint is an invitation to refine architectural discipline and security hygiene.',
                          tags: ['stoicism', 'philosophy', 'resilience'],
                          themes: ['Emotional Clarity', 'Mindset'],
                        });
                        setBookModalOpen(true);
                      }}
                      className="text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                    >
                      Sample: Meditations
                    </button>
                  </div>
                )}
                <button
                  id="btn-add-book-wisdom"
                  type="button"
                  onClick={openCreateBookModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Preserve Book Wisdom</span>
                </button>
              </div>
            </div>

            {/* Architecture & Security Notice Banner */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-indigo-800 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-indigo-900">
                  User-Isolated Cloud Firestore Persistence & Human-in-the-Loop Curation
                </span>
                <p className="text-stone-700 leading-relaxed">
                  All book wisdom entries are strictly isolated at <code className="bg-indigo-100/70 text-indigo-950 px-1 py-0.5 rounded font-mono">/users/{user.uid}/books/{'{bookId}'}</code> with owner-only access controls. Every entry is editable and human-reviewed prior to storage and can be bidirectionally linked with your Memory Vault.
                </p>
              </div>
            </div>

            {/* Search and Filters Controls */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="book-search-input"
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    placeholder="Search by book title, author, key idea, quote, reflection, theme, or tags..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-700"
                  />
                  {bookSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBookSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Author Filter Pills */}
              {allBookAuthors.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0 mr-1">
                    Authors:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedBookAuthorFilter('ALL')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer text-xs ${
                      selectedBookAuthorFilter === 'ALL'
                        ? 'bg-indigo-700 text-white font-semibold'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    <span>All Authors</span>
                    <span className="text-[10px] opacity-80">({bookWisdomList.length})</span>
                  </button>
                  {allBookAuthors.map((author) => {
                    const isSelected = (selectedBookAuthorFilter || '').toLowerCase() === (author || '').toLowerCase();
                    const count = bookWisdomList.filter((b) => (b.author || '').toLowerCase() === (author || '').toLowerCase()).length;
                    return (
                      <button
                        key={author}
                        type="button"
                        onClick={() => setSelectedBookAuthorFilter(author)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-indigo-700 text-white font-semibold'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        <span>{author}</span>
                        <span className="text-[10px] opacity-80">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Theme Filter Pills */}
              {allBookThemes.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0 mr-1">
                    Themes:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedBookThemeFilter('ALL')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer text-xs ${
                      selectedBookThemeFilter === 'ALL'
                        ? 'bg-purple-800 text-white font-semibold'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    <span>All Themes</span>
                  </button>
                  {allBookThemes.map((theme) => {
                    const isSelected = selectedBookThemeFilter === theme;
                    const count = bookWisdomList.filter((b) => b.themes?.includes(theme)).length;
                    return (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setSelectedBookThemeFilter(theme)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-purple-800 text-white font-semibold'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        <span>{theme}</span>
                        <span className="text-[10px] opacity-80">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Book Cards Grid */}
            {filteredBookWisdomList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 mx-auto flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-stone-900 mb-1">
                    {bookSearchQuery || selectedBookAuthorFilter !== 'ALL' || selectedBookThemeFilter !== 'ALL'
                      ? 'No matching book wisdom entries found'
                      : 'Preserve ideas, quotes, and reflections from your favorite books'}
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    {bookSearchQuery || selectedBookAuthorFilter !== 'ALL' || selectedBookThemeFilter !== 'ALL'
                      ? 'Try adjusting your search keywords or resetting your author and theme filters.'
                      : 'Capture principles, memorable lines, and your personal reflections to integrate them into your second brain.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={openCreateBookModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Preserve First Book</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredBookWisdomList.map((entry) => {
                  const linkedMems = memories.filter(
                    (m) => entry.linkedMemoryIds?.includes(m.id) || m.linkedBookIds?.includes(entry.id)
                  );

                  return (
                    <div
                      key={entry.id}
                      id={`book-card-${entry.id}`}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all group"
                    >
                      <div>
                        {/* Card Header: Title & Author */}
                        <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-stone-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-stone-900 leading-tight">
                                {entry.bookTitle}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-900 border border-indigo-200">
                                  by {entry.author}
                                </span>
                                <span className="text-[10px] text-stone-500 font-mono">
                                  {formatDisplayDate(entry.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions: Edit & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              id={`edit-book-${entry.id}`}
                              onClick={() => openEditBookModal(entry)}
                              title="Edit book wisdom entry"
                              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              id={`delete-book-${entry.id}`}
                              onClick={() => handleDeleteBookWisdom(entry.id, entry.bookTitle)}
                              title="Delete book entry"
                              className="text-stone-400 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Key Idea Callout */}
                        <div className="mb-3 bg-indigo-50/60 border-l-3 border-indigo-600 p-3 rounded-r-xl">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block mb-1">
                            Key Idea & Core Principle:
                          </span>
                          <p className="text-xs text-stone-900 leading-relaxed font-medium">
                            {entry.keyIdea}
                          </p>
                        </div>

                        {/* Memorable Quote */}
                        {entry.quote && entry.quote !== 'No quote specified' && (
                          <div className="mb-3 bg-stone-50/90 p-3 rounded-xl border border-stone-200/80 relative">
                            <Quote className="w-3.5 h-3.5 text-stone-400 absolute top-2.5 right-2.5 opacity-60" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                              Notable Quote:
                            </span>
                            <p className="text-xs text-stone-800 leading-relaxed font-serif italic pr-4">
                              &ldquo;{entry.quote}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Personal Reflection */}
                        {entry.personalReflection && (
                          <div className="mb-3 bg-amber-50/40 p-3 rounded-xl border border-amber-200/60">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
                              Personal Reflection & Application:
                            </span>
                            <p className="text-xs text-stone-800 leading-relaxed">
                              {entry.personalReflection}
                            </p>
                          </div>
                        )}

                        {/* Themes & Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {entry.themes?.map((theme, i) => (
                            <span
                              key={`theme-${i}`}
                              className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md"
                            >
                              {theme}
                            </span>
                          ))}
                          {entry.tags?.map((tag, i) => (
                            <span
                              key={`tag-${i}`}
                              className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-mono"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Linked Memory Vault Entries */}
                        <div className="pt-2 border-t border-stone-100 mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-emerald-800" />
                              <span>Linked Vault Memories ({linkedMems.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setLinkMemoryModalBook(entry)}
                              className="text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer"
                              title="Link an existing memory to this book entry"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Link Memory</span>
                            </button>
                          </div>

                          {linkedMems.length > 0 ? (
                            <div className="space-y-1">
                              {linkedMems.map((m) => (
                                <div
                                  key={m.id}
                                  className="text-[11px] text-stone-700 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/60 flex items-center justify-between"
                                >
                                  <span className="truncate max-w-[260px] font-medium">{m.summary}</span>
                                  <span className="text-[10px] text-stone-500 font-mono shrink-0 ml-2">
                                    {formatDisplayDate(m.createdAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-stone-400 italic">No vault memories linked yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-stone-400" />
                          <span>Owner-Isolated</span>
                        </span>

                        <button
                          type="button"
                          id={`reflect-book-${entry.id}`}
                          onClick={() => {
                            setActiveTab('reflect');
                            setConversationInput(
                              `I've been reflecting on "${entry.bookTitle}" by ${entry.author}. The key idea is: "${entry.keyIdea}". My personal reflection: "${entry.personalReflection}". How can I integrate this into my current habits and projects?`
                            );
                            addLog('info', `Transferred reflection prompt for "${entry.bookTitle}" to agent conversation.`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-900 hover:text-white bg-indigo-50 hover:bg-indigo-700 border border-indigo-200 hover:border-indigo-700 transition-all cursor-pointer"
                          title="Unpack this book principle in a new reflection with Smriti"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reflect on Book</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TRUSTED CIRCLE (HUMAN CONNECTION BRIDGE)           */}
        {/* ========================================================= */}
        {activeTab === 'trusted' && (
          <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs border border-teal-100">
                  <Users className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-stone-900">
                      Trusted Circle
                    </h3>
                    <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                      Human Connection Bridge
                    </span>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                      Strengthen, Not Replace
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
                    Identify people you trust and may want to reconnect with during difficult periods of life. Smriti assists by drafting thoughtful messages when you struggle to communicate.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
                <button
                  id="btn-open-reachout-assistant"
                  type="button"
                  onClick={() => openReachoutModal()}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-100 text-teal-800 border border-teal-300 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-teal-700" />
                  <span>Reachout Assistant</span>
                </button>
                <button
                  id="btn-add-trusted-contact"
                  type="button"
                  onClick={openCreateContactModal}
                  className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Trusted Person</span>
                </button>
              </div>
            </div>

            {/* Core Principle & Responsible AI Safeguards Banner */}
            <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-teal-50/90 border border-teal-200/90 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-800 text-teal-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-teal-100" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-teal-950 text-sm">
                      Core Philosophy & Responsible AI Safeguards
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      Human in the Loop
                    </span>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      Zero Auto-Contact
                    </span>
                  </div>
                  <p className="text-teal-900 leading-relaxed text-xs">
                    <strong>Philosophy:</strong> Smriti AI exists to strengthen human relationships rather than replace them. When you struggle to find the right words, Smriti helps draft messages to people you trust—such as a <strong>Friend</strong>, <strong>Parent</strong>, <strong>Mentor</strong>, <strong>Therapist</strong>, <strong>Partner</strong>, or <strong>Sibling</strong>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    <div className="bg-white/80 rounded-xl p-2 border border-teal-100/80 text-[11px] text-teal-950 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      <span>Never contact anyone automatically</span>
                    </div>
                    <div className="bg-white/80 rounded-xl p-2 border border-teal-100/80 text-[11px] text-teal-950 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      <span>No automatic emails, SMS, or alerts</span>
                    </div>
                    <div className="bg-white/80 rounded-xl p-2 border border-teal-100/80 text-[11px] text-teal-950 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      <span>Always requires explicit user approval</span>
                    </div>
                    <div className="bg-white/80 rounded-xl p-2 border border-teal-100/80 text-[11px] text-teal-950 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      <span>Never assumes you want help</span>
                    </div>
                    <div className="bg-white/80 rounded-xl p-2 border border-teal-100/80 text-[11px] text-teal-950 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      <span>Never manipulates into reaching out</span>
                    </div>
                    <div className="bg-white/80 rounded-xl p-2 border border-teal-100/80 text-[11px] text-teal-950 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      <span>User remains fully in control</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Relationship Filter Bar */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="trusted-search-input"
                    value={trustedSearchQuery}
                    onChange={(e) => setTrustedSearchQuery(e.target.value)}
                    placeholder="Search by name, relationship, why they matter, notes, or tags..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                  {trustedSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTrustedSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Relationship Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0 mr-1">
                  Relationship:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTrustedRelFilter('ALL')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer text-xs ${
                    selectedTrustedRelFilter === 'ALL'
                      ? 'bg-teal-800 text-white font-semibold'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                  }`}
                >
                  <span>All Contacts</span>
                  <span className="text-[10px] opacity-80">({trustedContacts.length})</span>
                </button>
                {(['Friend', 'Parent', 'Mentor', 'Therapist', 'Partner', 'Sibling', 'Teacher', 'Other'] as TrustedRelationship[]).map((rel) => {
                  const count = trustedContacts.filter((c) => c.relationship === rel).length;
                  const isSelected = selectedTrustedRelFilter === rel;
                  return (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => setSelectedTrustedRelFilter(rel)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-teal-800 text-white font-semibold'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      <span>{rel}</span>
                      {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contacts Grid */}
            {(() => {
              const q = (trustedSearchQuery || '').toLowerCase().trim();
              const filtered = trustedContacts.filter((c) => {
                const matchesQuery =
                  !q ||
                  (c.name || '').toLowerCase().includes(q) ||
                  (c.relationship || '').toLowerCase().includes(q) ||
                  (c.whyTheyMatter || '').toLowerCase().includes(q) ||
                  (c.contactDetail && c.contactDetail.toLowerCase().includes(q)) ||
                  (c.optionalNotes && c.optionalNotes.toLowerCase().includes(q)) ||
                  (Array.isArray(c.tags) && c.tags.some((t) => (t || '').toLowerCase().includes(q)));

                const matchesRel =
                  selectedTrustedRelFilter === 'ALL' ||
                  (c.relationship || '').toLowerCase() === (selectedTrustedRelFilter || '').toLowerCase();

                return matchesQuery && matchesRel;
              });

              if (filtered.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-stone-900 mb-1">
                        {trustedSearchQuery || selectedTrustedRelFilter !== 'ALL'
                          ? 'No matching trusted contacts found'
                          : 'Strengthen human connection with your Trusted Circle'}
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        {trustedSearchQuery || selectedTrustedRelFilter !== 'ALL'
                          ? 'Try adjusting your search terms or selecting "All Contacts".'
                          : 'Identify parents, close friends, mentors, therapists, or partners who bring you comfort and grounded perspective when life feels overwhelming.'}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={openCreateContactModal}
                        className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Your First Trusted Person</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((contact) => (
                    <div
                      key={contact.id}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-all group"
                    >
                      <div className="space-y-3.5">
                        {/* Header: Avatar, Name, Relationship, Preferred Method */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-100/80 text-teal-900 font-bold flex items-center justify-center text-sm shadow-2xs border border-teal-200/60">
                              {contact.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-stone-900 leading-tight">
                                {contact.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.2 rounded-md">
                                  {contact.relationship}
                                </span>
                                <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                                  {contact.preferredMethod === 'Text / SMS' && <MessageSquare className="w-2.5 h-2.5" />}
                                  {contact.preferredMethod === 'Phone Call' && <Phone className="w-2.5 h-2.5" />}
                                  {contact.preferredMethod === 'Email' && <Mail className="w-2.5 h-2.5" />}
                                  {contact.preferredMethod === 'In-Person' && <UserCheck className="w-2.5 h-2.5" />}
                                  {contact.preferredMethod === 'Video Call' && <Radio className="w-2.5 h-2.5" />}
                                  <span>{contact.preferredMethod}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Edit/Delete Actions */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEditContactModal(contact)}
                              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Contact"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(contact.id, contact.name)}
                              className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Why This Person Matters */}
                        <div className="bg-teal-50/70 border border-teal-200/60 rounded-xl p-3 text-xs text-stone-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block mb-1">
                            Why this person matters:
                          </span>
                          <p className="italic text-teal-950 leading-relaxed font-serif">
                            &ldquo;{contact.whyTheyMatter}&rdquo;
                          </p>
                        </div>

                        {/* Optional Notes */}
                        {contact.optionalNotes && (
                          <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 leading-relaxed">
                            <span className="text-[10px] font-semibold text-stone-500 block mb-0.5">
                              Personal Notes:
                            </span>
                            <p className="text-[11px] line-clamp-3">{contact.optionalNotes}</p>
                          </div>
                        )}

                        {/* Contact Detail if available */}
                        {contact.contactDetail && (
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-mono">
                            <Lock className="w-3 h-3 text-stone-400" />
                            <span>{contact.contactDetail}</span>
                          </div>
                        )}

                        {/* Tags */}
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {contact.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Primary CTA to Draft Reachout */}
                      <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400 font-mono">
                          {formatDisplayDate(contact.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openReachoutModal(contact)}
                          className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold px-3 py-1.8 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Draft Reachout</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GROWTH DASHBOARD & SECOND BRAIN METRICS             */}
        {/* ========================================================= */}
        {activeTab === 'growth' && (
          <div className="space-y-8">
            {/* Header & Vision Banner */}
            <div id="growth-dashboard-header" className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center border border-purple-200">
                      <TrendingUp className="w-4 h-4 text-purple-800" />
                    </span>
                    <h2 className="text-xl font-bold text-stone-900 tracking-tight">Personal Growth Dashboard</h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                      Second Brain Intelligence
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
                    Visualize how raw conversations become reflections, reflections distill into structured memories, and memories evolve into lasting personal growth. Smriti AI emphasizes personal development and inner wisdom over cold productivity metrics.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <button
                    id="synthesize-growth-insights-btn"
                    type="button"
                    onClick={handleGenerateGrowthInsights}
                    disabled={isGeneratingGrowthReport || memories.length === 0}
                    className="inline-flex items-center justify-center gap-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingGrowthReport ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-200" />
                        <span>Synthesizing Growth Engine...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Synthesize Growth Insights</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {growthError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                  <span>{growthError}</span>
                </div>
              )}
            </div>

            {/* 10. JOURNEY VISUALIZATION: Conversation → Reflection → Memory → Knowledge → Growth */}
            <div id="growth-journey-pipeline" className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-800" />
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      The Smriti Second Brain Journey
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Continuous pipeline showing how daily life experiences transform into structured knowledge and self-evolution.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-lg">
                  Click any stage to inspect transformation mechanics
                </span>
              </div>

              {/* 5 Interactive Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative">
                {journeyStages.map((stage, idx) => {
                  const isSelected = activeJourneyStage === idx;
                  return (
                    <button
                      key={stage.stage}
                      id={`journey-stage-btn-${stage.stage}`}
                      type="button"
                      onClick={() => setActiveJourneyStage(idx)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-purple-50/80 border-purple-800 ring-2 ring-purple-800/20 shadow-xs'
                          : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected ? 'bg-purple-900 text-white shadow-xs' : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {stage.stage}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              stage.status === 'Active' || stage.status === 'Thriving' || stage.status === 'Connected'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'bg-stone-200/70 text-stone-700'
                            }`}
                          >
                            {stage.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-900">{stage.name}</h4>
                        <span className="text-[11px] text-purple-900 font-medium block">{stage.subtitle}</span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-stone-200/70">
                        <span className="text-xs font-bold text-stone-900 block">{stage.metric}</span>
                        <span className="text-[10px] text-stone-600 truncate block">{stage.metricLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Stage Explanation Drawer */}
              <div className="bg-purple-50/40 border border-purple-200/80 rounded-xl p-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {journeyStages[activeJourneyStage].stage}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">
                        Stage {journeyStages[activeJourneyStage].stage}: {journeyStages[activeJourneyStage].name}
                      </span>
                      <span className="text-purple-900 font-medium">({journeyStages[activeJourneyStage].subtitle})</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed">
                      {journeyStages[activeJourneyStage].description}
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-stone-600">
                      <span className="font-semibold text-stone-800">Current Milestone:</span>
                      <span>{journeyStages[activeJourneyStage].metric} — {journeyStages[activeJourneyStage].metricLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CORE METRICS: 1. Total Memories, 2. Key Learnings, 3. Action Items Completed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Total Memories Created */}
              <div id="metric-card-memories" className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      1. Total Memories Created
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-amber-800" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-stone-900 tracking-tight">{totalMemoriesCount}</span>
                    <span className="text-xs text-stone-500 font-medium">vault artifacts</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    Personal experiences reviewed and committed to your owner-bound Firestore database.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <span className="text-[11px] font-semibold text-stone-700 block mb-1.5">Style Distribution Breakdown:</span>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {REFLECTION_MODES.map((mode) => (
                      <div key={mode.id} className="bg-stone-50 rounded p-1 border border-stone-200/70">
                        <span className="text-[10px] text-stone-500 block truncate">{mode.label.slice(0, 3)}</span>
                        <span className="text-xs font-bold text-stone-900">{styleDistribution[mode.id]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Key Learnings Captured */}
              <div id="metric-card-learnings" className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      2. Key Learnings Captured
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-emerald-800" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-emerald-900 tracking-tight">{totalKeyLearningsCount}</span>
                    <span className="text-xs text-stone-500 font-medium">distilled insights</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    Actionable takeaways and principles extracted from reflective inquiries to prevent repeating past missteps.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600 font-medium">Avg Learnings Per Memory:</span>
                    <span className="font-bold text-emerald-900">
                      {totalMemoriesCount > 0 ? (totalKeyLearningsCount / totalMemoriesCount).toFixed(1) : 0} insights
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-stone-600 font-medium">Unique Theme Clusters:</span>
                    <span className="font-bold text-stone-900">{topThemesSorted.length} themes</span>
                  </div>
                </div>
              </div>

              {/* 3. Action Items Completed */}
              <div id="metric-card-actions" className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      3. Action Items Completed
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-blue-800" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-blue-900 tracking-tight">{completedActionItems}</span>
                    <span className="text-xs text-stone-500 font-medium">of {totalActionItems} committed ({completionRate}%)</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-600 font-medium">Pending Follow-Throughs:</span>
                  <span className="font-bold text-amber-900 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                    {totalActionItems - completedActionItems} open actions
                  </span>
                </div>
              </div>
            </div>

            {/* INSIGHTS ENGINE: Responsible AI Grounded Personal Development Observations */}
            <div id="growth-insights-engine-panel" className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-800" />
                    <h3 className="text-base font-bold text-stone-900 tracking-tight">
                      Growth Insights Engine
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                      Evidence-Grounded AI
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">
                    Smriti analyzes your memory corpus to observe emerging themes, recurring goals, growth patterns, action execution, and reflection habits.
                  </p>
                </div>

                {/* Responsible AI Safeguards Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                  <span>Observations only • No diagnoses • Grounded in evidence</span>
                </div>
              </div>

              {/* If no report generated yet */}
              {!growthReport && !isGeneratingGrowthReport && (
                <div className="p-8 text-center bg-stone-50/70 rounded-2xl border border-dashed border-stone-300 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-800" />
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">Discover Your Growth Patterns</h4>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                    Click below to trigger the Growth Insights Engine. Smriti will synthesize your structured memories, reflection modes, action completion, and wisdom links to provide transparent, evidence-based observations.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateGrowthInsights}
                    disabled={memories.length === 0}
                    className="inline-flex items-center gap-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold px-4 py-2.2 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Generate Growth Insights Report</span>
                  </button>
                  {memories.length === 0 && (
                    <p className="text-[11px] text-stone-500">Tip: Create at least one structured memory in the Memory Vault first.</p>
                  )}
                </div>
              )}

              {/* Generating Spinner State */}
              {isGeneratingGrowthReport && (
                <div className="p-8 text-center bg-purple-50/40 rounded-2xl border border-purple-200 space-y-3 animate-pulse">
                  <RefreshCw className="w-8 h-8 text-purple-800 mx-auto animate-spin" />
                  <h4 className="text-sm font-bold text-purple-950">Synthesizing Personal Development Insights...</h4>
                  <p className="text-xs text-purple-800 max-w-md mx-auto">
                    Evaluating vault memories, reflection modes, wisdom contributions, and executed action items using the Gemini resilient fallback ladder.
                  </p>
                </div>
              )}

              {/* Generated Insights Report Display */}
              {growthReport && (
                <div className="space-y-6">
                  {/* Growth Motto & Reflection Overview */}
                  <div className="bg-gradient-to-r from-purple-50/90 via-amber-50/70 to-stone-50 rounded-2xl p-5 border border-purple-200/80 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-900" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-950">
                        Growth Guiding Principle
                      </span>
                    </div>
                    <blockquote className="text-base sm:text-lg font-serif italic text-stone-900 leading-snug">
                      &ldquo;{growthReport.growthMotto}&rdquo;
                    </blockquote>
                    <p className="text-xs text-stone-700 leading-relaxed pt-1">
                      {growthReport.reflectionSummary}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] text-stone-500 border-t border-purple-100">
                      <span>Synthesized: {formatDisplayDate(growthReport.generatedAt)}</span>
                      <span>•</span>
                      <span>Model: {growthReport.modelUsed || 'Gemini 3.6 Flash Fallback Ladder'}</span>
                      <span>•</span>
                      <span>Based on {growthReport.totalMemoriesAnalyzed} memories in vault</span>
                    </div>
                  </div>

                  {/* 5 Categories Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Category 1: Emerging Themes */}
                    <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                        <Tag className="w-3.5 h-3.5 text-amber-800" />
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Emerging Themes
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {growthReport.insights
                          .filter((item) => item.category === 'Emerging Themes')
                          .map((item, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg border border-stone-200/80 space-y-1 shadow-2xs">
                              <span className="text-xs font-bold text-stone-900 block">{item.title}</span>
                              <p className="text-xs text-stone-700 leading-relaxed">{item.observation}</p>
                              <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded inline-block font-mono mt-1">
                                Evidence: {item.evidence}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Category 2: Recurring Goals */}
                    <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                        <Target className="w-3.5 h-3.5 text-blue-800" />
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Recurring Goals
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {growthReport.insights
                          .filter((item) => item.category === 'Recurring Goals')
                          .map((item, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg border border-stone-200/80 space-y-1 shadow-2xs">
                              <span className="text-xs font-bold text-stone-900 block">{item.title}</span>
                              <p className="text-xs text-stone-700 leading-relaxed">{item.observation}</p>
                              <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded inline-block font-mono mt-1">
                                Evidence: {item.evidence}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Category 3: Growth Patterns */}
                    <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-800" />
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Growth Patterns
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {growthReport.insights
                          .filter((item) => item.category === 'Growth Patterns')
                          .map((item, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg border border-stone-200/80 space-y-1 shadow-2xs">
                              <span className="text-xs font-bold text-stone-900 block">{item.title}</span>
                              <p className="text-xs text-stone-700 leading-relaxed">{item.observation}</p>
                              <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded inline-block font-mono mt-1">
                                Evidence: {item.evidence}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Category 4: Frequently Completed Actions */}
                    <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-800" />
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Frequently Completed Actions
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {growthReport.insights
                          .filter((item) => item.category === 'Frequently Completed Actions')
                          .map((item, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg border border-stone-200/80 space-y-1 shadow-2xs">
                              <span className="text-xs font-bold text-stone-900 block">{item.title}</span>
                              <p className="text-xs text-stone-700 leading-relaxed">{item.observation}</p>
                              <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded inline-block font-mono mt-1">
                                Evidence: {item.evidence}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Category 5: Reflection Habits */}
                    <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200 space-y-3 md:col-span-2 lg:col-span-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-800" />
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Reflection Habits & Cognitive Style
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {growthReport.insights
                          .filter((item) => item.category === 'Reflection Habits')
                          .map((item, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg border border-stone-200/80 space-y-1 shadow-2xs">
                              <span className="text-xs font-bold text-stone-900 block">{item.title}</span>
                              <p className="text-xs text-stone-700 leading-relaxed">{item.observation}</p>
                              <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded inline-block font-mono mt-1">
                                Evidence: {item.evidence}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Responsible AI Notice */}
                  <div className="p-3.5 rounded-xl bg-stone-100/80 border border-stone-200 text-stone-700 text-xs flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900">Responsible AI Disclaimer: </span>
                      These insights represent observational patterns detected across your self-authored reflections and notes. They are designed to foster self-reflection, not clinical assessment or fixed truth. Smriti AI encourages you to interpret them in light of your lived experience.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. REFLECTION STYLE DISTRIBUTION */}
            <div id="growth-style-distribution" className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-800" />
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      4. Reflection Style Distribution
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    How you approach self-inquiry across Coach, Practical, Mentor, Motivational, and Philosophical modes.
                  </p>
                </div>
                <span className="text-xs font-medium text-stone-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  Active Session: {activeModeConfig.label} Mode
                </span>
              </div>

              {/* Distribution Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {REFLECTION_MODES.map((mode) => {
                  const count = styleDistribution[mode.id];
                  const percentage = totalMemoriesCount > 0 ? Math.round((count / totalMemoriesCount) * 100) : 0;
                  const ModeIcon = mode.icon;
                  const isCurrent = selectedStyle === mode.id;

                  return (
                    <div
                      key={mode.id}
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-amber-50/70 border-amber-800/60 ring-1 ring-amber-800/20'
                          : 'bg-stone-50/60 border-stone-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="w-7 h-7 rounded-lg bg-stone-200 flex items-center justify-center text-stone-700">
                            <ModeIcon className="w-3.5 h-3.5 text-stone-800" />
                          </span>
                          <span className="text-xs font-bold text-stone-900">{percentage}%</span>
                        </div>
                        <h4 className="text-xs font-bold text-stone-900">{mode.label} Mode</h4>
                        <span className="text-[10px] text-stone-500 block line-clamp-1">{mode.tagline}</span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-stone-200/60">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-stone-600">Memories:</span>
                          <span className="font-bold text-stone-900">{count}</span>
                        </div>
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-800 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5 & 6. MOST COMMON THEMES & MOST COMMON TAGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 5. Most Common Themes */}
              <div id="growth-themes-panel" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-800" />
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      5. Most Common Themes
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500">{topThemesSorted.length} detected</span>
                </div>

                {topThemesSorted.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 text-center">
                    Themes will emerge as you conduct reflective dialogues and save memories.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topThemesSorted.slice(0, 8).map(({ theme, count }) => {
                      const percentage = totalMemoriesCount > 0 ? Math.round((count / totalMemoriesCount) * 100) : 0;
                      return (
                        <div key={theme} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-800" />
                            <span className="font-semibold text-stone-900">{theme}</span>
                          </div>
                          <div className="flex items-center gap-2 font-medium">
                            <span className="text-stone-500">{percentage}%</span>
                            <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px] border border-amber-200">
                              {count} {count === 1 ? 'memory' : 'memories'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6. Most Common Tags */}
              <div id="growth-tags-panel" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-800" />
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      6. Most Common Tags
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500">{topTagsSorted.length} tags</span>
                </div>

                {topTagsSorted.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 text-center">
                    Tags will appear as you tag memories during synthesis.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topTagsSorted.slice(0, 16).map(({ tag, count }) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-medium"
                      >
                        <span>#{tag}</span>
                        <span className="bg-purple-200/80 text-purple-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 7 & 8. WISDOM CIRCLE & BOOK WISDOM CONTRIBUTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 7. Wisdom Circle Contributions */}
              <div id="growth-wisdom-contributions" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-rose-700" />
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      7. Wisdom Circle Contributions
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500">
                    {wisdomContributions.length} mentors
                  </span>
                </div>

                <p className="text-xs text-stone-600">
                  People who influenced your reflections and decision-making most often.
                </p>

                {wisdomContributions.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 text-center">
                    Add mentors and trusted advisors in the Wisdom Circle tab to link their advice to your memories.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {wisdomContributions.slice(0, 5).map((mentor) => (
                      <div key={mentor.id} className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-stone-900">{mentor.personName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-900 font-medium">
                              {mentor.relationship}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded-full">
                            {mentor.count} {mentor.count === 1 ? 'memory linked' : 'memories linked'}
                          </span>
                        </div>
                        <p className="text-xs italic text-stone-700 font-serif line-clamp-2">
                          &ldquo;{mentor.wisdomText}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 8. Book Wisdom Contributions */}
              <div id="growth-book-contributions" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-700" />
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      8. Book Wisdom Contributions
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500">
                    {bookContributions.length} books
                  </span>
                </div>

                <p className="text-xs text-stone-600">
                  Books and literary principles referenced most often in your life reflections.
                </p>

                {bookContributions.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 text-center">
                    Add books and reading highlights in the Book Wisdom tab to link literary principles to your memories.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bookContributions.slice(0, 5).map((book) => (
                      <div key={book.id} className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-stone-900">{book.bookTitle}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-900 font-medium">
                              {book.author}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">
                            {book.count} {book.count === 1 ? 'memory linked' : 'memories linked'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-700 line-clamp-2">
                          <span className="font-semibold text-stone-800">Key Idea: </span>
                          {book.keyIdea}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 9. PERSONAL GROWTH TIMELINE */}
            <div id="growth-timeline-panel" className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-800" />
                    <h3 className="text-base font-bold text-stone-900 tracking-tight">
                      9. Personal Growth Timeline
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Chronological journey of your memory creation, learning milestones, and self-commitments over time.
                  </p>
                </div>

                {/* Filter by Reflection Style */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setGrowthTimelineFilter('ALL')}
                    className={`px-3 py-1.2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      growthTimelineFilter === 'ALL'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    All Modes ({memories.length})
                  </button>
                  {REFLECTION_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setGrowthTimelineFilter(mode.id)}
                      className={`px-3 py-1.2 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                        growthTimelineFilter === mode.id
                          ? 'bg-amber-900 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {mode.label} ({styleDistribution[mode.id]})
                    </button>
                  ))}
                </div>
              </div>

              {filteredTimelineMemories.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-xs">
                  No memories found for this filter. Switch to another reflection mode or synthesize a new memory.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {filteredTimelineMemories.map((mem) => {
                    const styleConfig =
                      REFLECTION_MODES.find((m) => m.id === mem.reflectionStyle) || REFLECTION_MODES[0];
                    const StyleIcon = styleConfig.icon;
                    const isExpanded = expandedLearningMemoryId === mem.id;

                    return (
                      <div key={mem.id} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-amber-800 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-amber-800" />
                        </div>

                        {/* Milestone Card */}
                        <div className="bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200 p-4 transition-all shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-200">
                                <StyleIcon className="w-3 h-3 text-amber-800" />
                                <span>{styleConfig.label} Mode</span>
                              </span>
                              <span className="text-xs text-stone-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-stone-400" />
                                <span>{formatDisplayDate(mem.createdAt)}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {mem.themes && mem.themes.length > 0 && (
                                <span className="text-[10px] bg-stone-200/80 text-stone-800 px-2 py-0.5 rounded-full font-medium">
                                  {mem.themes[0]}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Summary */}
                          <p className="text-xs font-semibold text-stone-900 leading-relaxed">
                            {mem.summary}
                          </p>

                          {/* Reflection Notes preview if any */}
                          {mem.reflectionNotes && (
                            <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 italic font-serif">
                              &ldquo;{mem.reflectionNotes}&rdquo;
                            </p>
                          )}

                          {/* Key Learnings List */}
                          {mem.keyLearnings && mem.keyLearnings.length > 0 && (
                            <div className="pt-2 border-t border-stone-200/70 space-y-1.5">
                              <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-emerald-800" />
                                <span>Key Learnings Captured:</span>
                              </span>
                              <ul className="space-y-1 pl-4 list-disc text-xs text-stone-700 marker:text-emerald-700">
                                {mem.keyLearnings.map((kl, i) => (
                                  <li key={i}>{kl}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Items List */}
                          {mem.actionItems && mem.actionItems.length > 0 && (
                            <div className="pt-2 border-t border-stone-200/70 space-y-1.5">
                              <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5 text-blue-800" />
                                <span>Self-Commitments & Action Items:</span>
                              </span>
                              <div className="space-y-1">
                                {mem.actionItems.map((act) => (
                                  <div
                                    key={act.id}
                                    className="flex items-center gap-2 text-xs text-stone-700"
                                  >
                                    {act.completed ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                    )}
                                    <span className={act.completed ? 'line-through text-stone-400' : ''}>
                                      {act.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Linked Wisdom & Books */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {mem.linkedWisdomIds && mem.linkedWisdomIds.length > 0 && (
                              <span className="text-[10px] text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <HeartHandshake className="w-3 h-3" />
                                <span>{mem.linkedWisdomIds.length} Wisdom Circle Link</span>
                              </span>
                            )}
                            {mem.linkedBookIds && mem.linkedBookIds.length > 0 && (
                              <span className="text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>{mem.linkedBookIds.length} Book Wisdom Link</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: V3 RETRIEVAL ARCHITECTURE                            */}
        {/* ========================================================= */}
        {activeTab === 'retrieval' && (
          <RetrievalArchitectureView
            memories={memories}
            wisdomList={wisdomList}
            bookWisdomList={bookWisdomList}
            retrievalLogs={retrievalLogs}
            studioQuery={retrievalStudioQuery}
            setStudioQuery={setRetrievalStudioQuery}
            studioResults={
              retrievalStudioMemories.length > 0 || retrievalStudioWisdom.length > 0 || retrievalStudioBooks.length > 0
                ? {
                    retrievedMemories: retrievalStudioMemories,
                    candidateWisdom: retrievalStudioWisdom.filter((w) => !w.isConsented),
                    consentedWisdomInjected: retrievalStudioWisdom.filter((w) => w.isConsented),
                    retrievedBooks: retrievalStudioBooks,
                    latencyMs: 14,
                    modelUsed: 'Hybrid Ranking Formula (S_lex, S_thm, S_tag, S_rec, S_act)',
                  }
                : null
            }
            isSimulatingRetrieval={isTestingRetrievalStudio}
            onRunSimulation={async (customQuery?: string) => {
              if (customQuery) {
                setRetrievalStudioQuery(customQuery);
              }
              handleRunRetrievalStudioSimulation();
            }}
            onSelectProvenance={(prov) => setSelectedInspectionProvenance(prov || null)}
            onGrantConsentCandidate={handleGrantConsentForCandidateWisdom}
            allowSessionWisdomOptIn={allowSessionWisdomOptIn}
            setAllowSessionWisdomOptIn={setAllowSessionWisdomOptIn}
            onSwitchToReflect={() => setActiveTab('reflect')}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 4: VERIFICATION SUITE                                  */}
        {/* ========================================================= */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Authentication & Firestore Active</h2>
                  <p className="text-xs text-stone-600">
                    User session is authenticated and owner-bound security rules protect user documents at{' '}
                    <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">/users/{user.uid}</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="run-all-tests-btn"
                  onClick={async () => {
                    await handleTestFirestoreConnection();
                    await handleVerifyUserDocument();
                    await handleVerifyCrossUserIsolation();
                  }}
                  disabled={Boolean(isRunningTest)}
                  className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningTest ? 'animate-spin' : ''}`} />
                  <span>Run Complete Verification Suite</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Check 1: User Profile Document */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-stone-900">1. User Document in Firestore</h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        userDocStatus?.success ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {userDocStatus?.success ? 'Document Verified' : 'Pending Verification'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mb-3">
                    Validates profile existence at <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded">/users/{user.uid}</code>.
                  </p>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-mono text-stone-800 space-y-1 overflow-x-auto mb-4">
                    <div><span className="text-stone-600">Path:</span> /users/{user.uid}</div>
                    <div><span className="text-stone-600">UID:</span> {user.uid}</div>
                    <div><span className="text-stone-600">Email:</span> {user.email || 'N/A'}</div>
                    <div><span className="text-stone-600">Display Name:</span> {userProfile?.displayName || user.displayName || 'N/A'}</div>
                    <div><span className="text-stone-600">Created:</span> {userProfile?.createdAt ? formatDisplayDate(userProfile.createdAt) : 'Initial'}</div>
                  </div>
                </div>

                <button
                  id="btn-verify-user-doc"
                  onClick={handleVerifyUserDocument}
                  disabled={isRunningTest === 'userdoc'}
                  className="w-full inline-flex items-center justify-center gap-2 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningTest === 'userdoc' ? 'animate-spin' : ''}`} />
                  <span>Re-fetch / Verify User Document</span>
                </button>
              </div>

              {/* Check 2: Cross-User Data Isolation */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-stone-900">2. Cross-User Data Isolation</h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        crossUserStatus?.blocked
                          ? 'bg-emerald-100 text-emerald-800'
                          : crossUserStatus
                          ? 'bg-red-100 text-red-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {crossUserStatus?.blocked ? 'Access Denied (Secure)' : 'Unchecked'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mb-3">
                    Asserts that attempting to read another user&apos;s isolated documents is actively rejected by Firestore Security Rules.
                  </p>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-mono text-stone-800 space-y-1 mb-4">
                    <div><span className="text-stone-600">Target:</span> /users/unauthorized-foreign-victim-999</div>
                    <div><span className="text-stone-600">Result:</span> {crossUserStatus?.message || 'Ready for test run.'}</div>
                  </div>
                </div>

                <button
                  id="btn-verify-cross-user"
                  onClick={handleVerifyCrossUserIsolation}
                  disabled={isRunningTest === 'isolation'}
                  className="w-full inline-flex items-center justify-center gap-2 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningTest === 'isolation' ? 'animate-spin' : ''}`} />
                  <span>Execute Cross-User Security Test</span>
                </button>
              </div>
            </div>

            {/* Event Audit Stream */}
            <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 shadow-sm font-mono text-xs">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-stone-200">Verification Audit & Security Event Stream</span>
                </div>
                <span className="text-[10px] text-stone-500">{logs.length} events logged</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-stone-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`shrink-0 font-semibold uppercase text-[10px] px-1 rounded ${
                        log.level === 'success'
                          ? 'bg-emerald-950 text-emerald-400'
                          : log.level === 'warn'
                          ? 'bg-amber-950 text-amber-400'
                          : log.level === 'error'
                          ? 'bg-red-950 text-red-400'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className={log.level === 'error' ? 'text-red-300' : 'text-stone-300'}>
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SECURITY RULES AUDIT                                */}
        {/* ========================================================= */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900">Cloud Firestore Security Rules</h3>
                    <p className="text-xs text-stone-600">
                      Hardened owner-bound rules protecting <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">/users/{'{userId}'}/memories</code>
                    </p>
                  </div>
                </div>

                <button
                  id="btn-copy-rules-tab"
                  onClick={handleCopyRules}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRules ? 'Copied to Clipboard!' : 'Copy Rules for Firebase Console'}</span>
                </button>
              </div>

              <div className="bg-stone-900 text-stone-100 rounded-xl p-4 font-mono text-xs overflow-x-auto leading-relaxed mb-4">
                <pre>{FIRESTORE_RULES_SOURCE}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-700">
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-900 block mb-1">1. Subcollection Coverage</span>
                  <p>Explicitly matches <code className="text-amber-900">/memories/{'{memoryId}'}</code> and <code className="text-amber-900">/interactions/{'{interactionId}'}</code>.</p>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-900 block mb-1">2. Owner-Bound Guard</span>
                  <p><code className="text-amber-900">request.auth.uid == userId</code> strictly isolates each user&apos;s data.</p>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-900 block mb-1">3. Zero Insecure Defaults</span>
                  <p>Unauthenticated access and cross-user read/write requests are completely rejected.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 8. HUMAN REVIEW & APPROVAL MODAL                          */}
      {/* ========================================================= */}
      {reviewModalOpen && draftMemory && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-800" />
                    <span>AI-Generated Memory • Human Review Required</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">gemini-3.6-flash</span>
                </div>
                <h3 className="text-base font-bold text-stone-900">Inspect & Approve Structured Memory</h3>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs">
              {/* AI Transparency Banner */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-amber-950 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Transparency Rationale:</span>
                  <p className="leading-relaxed text-[11px] text-amber-900">{draftMemory.aiExplanation}</p>
                </div>
              </div>

              {/* Reflection Style Lens in Review Modal */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
                <label className="font-semibold text-stone-800 block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-800" />
                    <span>Reflection Style Lens</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-normal">Persona used during dialogue & extraction</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {REFLECTION_MODES.map((mode) => {
                    const isSelected = (draftMemory.reflectionStyle || selectedStyle) === mode.id;
                    const ModeIcon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDraftMemory({ ...draftMemory, reflectionStyle: mode.id })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-800 text-white border-amber-800 shadow-xs font-semibold'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <ModeIcon className="w-3 h-3" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. Editable Memory Summary */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1.5 flex items-center justify-between">
                  <span>1. Memory Summary</span>
                  <span className="text-[10px] text-stone-500 font-normal">Edit if needed</span>
                </label>
                <textarea
                  rows={3}
                  value={draftMemory.summary}
                  onChange={(e) => setDraftMemory({ ...draftMemory, summary: e.target.value })}
                  className="w-full text-xs p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-800 leading-relaxed"
                />
              </div>

              {/* 2. Editable Key Learnings */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1.5">
                  2. Key Learnings ({draftMemory.keyLearnings.length})
                </label>
                <div className="space-y-2">
                  {draftMemory.keyLearnings.map((learning, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={learning}
                        onChange={(e) => {
                          const updated = [...draftMemory.keyLearnings];
                          updated[idx] = e.target.value;
                          setDraftMemory({ ...draftMemory, keyLearnings: updated });
                        }}
                        className="flex-1 text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = draftMemory.keyLearnings.filter((_, i) => i !== idx);
                          setDraftMemory({ ...draftMemory, keyLearnings: updated });
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600"
                        title="Remove learning"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Learning input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add an additional key learning..."
                      value={newLearningInput}
                      onChange={(e) => setNewLearningInput(e.target.value)}
                      className="flex-1 text-xs p-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newLearningInput.trim()) return;
                        setDraftMemory({
                          ...draftMemory,
                          keyLearnings: [...draftMemory.keyLearnings, newLearningInput.trim()],
                        });
                        setNewLearningInput('');
                      }}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Editable Action Items */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1.5">
                  3. Action Items ({draftMemory.actionItems.length})
                </label>
                <div className="space-y-2">
                  {draftMemory.actionItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          const updated = [...draftMemory.actionItems];
                          updated[idx] = { ...updated[idx], text: e.target.value };
                          setDraftMemory({ ...draftMemory, actionItems: updated });
                        }}
                        className="flex-1 text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = draftMemory.actionItems.filter((_, i) => i !== idx);
                          setDraftMemory({ ...draftMemory, actionItems: updated });
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600"
                        title="Remove action item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Action Item input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add an actionable commitment..."
                      value={newActionInput}
                      onChange={(e) => setNewActionInput(e.target.value)}
                      className="flex-1 text-xs p-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newActionInput.trim()) return;
                        const newItem: ActionItem = {
                          id: createId('act'),
                          text: newActionInput.trim(),
                          completed: false,
                        };
                        setDraftMemory({
                          ...draftMemory,
                          actionItems: [...draftMemory.actionItems, newItem],
                        });
                        setNewActionInput('');
                      }}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Themes & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Themes */}
                <div>
                  <label className="font-semibold text-stone-800 block mb-1.5">Themes</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {draftMemory.themes.map((theme, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200 px-2 py-1 rounded-md text-[11px]"
                      >
                        <span>{theme}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = draftMemory.themes.filter((_, i) => i !== idx);
                            setDraftMemory({ ...draftMemory, themes: updated });
                          }}
                          className="hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Add theme..."
                      value={newThemeInput}
                      onChange={(e) => setNewThemeInput(e.target.value)}
                      className="flex-1 text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newThemeInput.trim()) return;
                        setDraftMemory({
                          ...draftMemory,
                          themes: [...draftMemory.themes, newThemeInput.trim()],
                        });
                        setNewThemeInput('');
                      }}
                      className="px-2 py-1.5 bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="font-semibold text-stone-800 block mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {draftMemory.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-1 rounded-md text-[11px] font-mono"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = draftMemory.tags.filter((_, i) => i !== idx);
                            setDraftMemory({ ...draftMemory, tags: updated });
                          }}
                          className="hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="flex-1 text-xs p-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTagInput.trim()) return;
                        const cleaned = newTagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                        if (cleaned) {
                          setDraftMemory({
                            ...draftMemory,
                            tags: [...draftMemory.tags, cleaned],
                          });
                        }
                        setNewTagInput('');
                      }}
                      className="px-2 py-1.5 bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Wisdom Circle Attribution (Optional) */}
                {wisdomList.length > 0 && (
                  <div className="pt-2 border-t border-stone-100">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block mb-1.5 flex items-center gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-700" />
                      <span>Link Wisdom Circle Mentor / Guide (Optional)</span>
                    </label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      {wisdomList.map((w) => {
                        const isLinked = (draftMemory.linkedWisdomIds || []).includes(w.id);
                        return (
                          <label
                            key={w.id}
                            className={`flex items-start gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isLinked ? 'bg-rose-100/80 text-rose-950 font-medium' : 'hover:bg-stone-100 text-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isLinked}
                              onChange={(e) => {
                                const currentLinked = draftMemory.linkedWisdomIds || [];
                                if (e.target.checked) {
                                  setDraftMemory({
                                    ...draftMemory,
                                    linkedWisdomIds: [...currentLinked, w.id],
                                  });
                                } else {
                                  setDraftMemory({
                                    ...draftMemory,
                                    linkedWisdomIds: currentLinked.filter((id) => id !== w.id),
                                  });
                                }
                              }}
                              className="accent-rose-700 mt-0.5 rounded"
                            />
                            <div className="flex-1">
                              <span className="font-semibold">{w.personName}</span>{' '}
                              <span className="text-[10px] text-stone-500">({w.relationship})</span>
                              <p className="text-[11px] text-stone-600 italic line-clamp-1">
                                &ldquo;{w.wisdomText}&rdquo;
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                Revise Dialogue
              </button>

              <button
                type="button"
                id="btn-approve-and-commit"
                onClick={handleApproveAndSaveMemory}
                disabled={isSavingApproved}
                className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className={`w-4 h-4 ${isSavingApproved ? 'animate-spin' : ''}`} />
                <span>{isSavingApproved ? 'Persisting to Firestore...' : 'Approve & Commit to Smriti Vault'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.5. WISDOM CIRCLE MODAL: PRESERVE OR EDIT ENTRY          */}
      {/* ========================================================= */}
      {wisdomModalOpen && (
        <div id="wisdom-modal" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {editingWisdomId ? 'Edit Wisdom Entry' : 'Preserve Timeless Wisdom'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Capture advice, philosophies, and lessons from people who shaped you.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWisdomModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Person Name */}
                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Person Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="wisdom-person-name"
                    value={wisdomForm.personName}
                    onChange={(e) => setWisdomForm({ ...wisdomForm, personName: e.target.value })}
                    placeholder="e.g., Mother, Dr. Eleanor Vance, Professor Rao"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-800"
                  />
                </div>

                {/* Relationship */}
                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Relationship <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="wisdom-relationship"
                    value={wisdomForm.relationship}
                    onChange={(e) =>
                      setWisdomForm({
                        ...wisdomForm,
                        relationship: e.target.value as WisdomRelationship,
                      })
                    }
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-800"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Friend">Friend</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Partner">Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Wisdom / Advice */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Wisdom / Advice <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="wisdom-text"
                  rows={3}
                  value={wisdomForm.wisdomText}
                  onChange={(e) => setWisdomForm({ ...wisdomForm, wisdomText: e.target.value })}
                  placeholder="The advice, core lesson, life philosophy, or timeless words they shared with you..."
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-800 leading-relaxed font-serif"
                />
              </div>

              {/* Situation */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Situation / Context When Given <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="wisdom-situation"
                  rows={2}
                  value={wisdomForm.situation}
                  onChange={(e) => setWisdomForm({ ...wisdomForm, situation: e.target.value })}
                  placeholder="What was happening? Why was this advice given at that particular moment in your life?"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-800"
                />
              </div>

              {/* Why It Matters */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Why It Matters / How It Shapes You <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="wisdom-why-it-matters"
                  rows={2}
                  value={wisdomForm.whyItMatters}
                  onChange={(e) => setWisdomForm({ ...wisdomForm, whyItMatters: e.target.value })}
                  placeholder="Why has this advice stayed with you? How does it influence your values, decisions, and mindset today?"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-800"
                />
              </div>

              {/* Themes */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">Themes (e.g. Integrity, Resilience, Leadership)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {wisdomForm.themes.map((theme, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-200 px-2 py-1 rounded-md text-[11px]"
                    >
                      <span>{theme}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = wisdomForm.themes.filter((_, i) => i !== idx);
                          setWisdomForm({ ...wisdomForm, themes: updated });
                        }}
                        className="hover:text-red-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Add theme and press Enter or +"
                    value={wisdomFormThemeInput}
                    onChange={(e) => setWisdomFormThemeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!wisdomFormThemeInput.trim()) return;
                        setWisdomForm({
                          ...wisdomForm,
                          themes: [...wisdomForm.themes, wisdomFormThemeInput.trim()],
                        });
                        setWisdomFormThemeInput('');
                      }
                    }}
                    className="flex-1 text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!wisdomFormThemeInput.trim()) return;
                      setWisdomForm({
                        ...wisdomForm,
                        themes: [...wisdomForm.themes, wisdomFormThemeInput.trim()],
                      });
                      setWisdomFormThemeInput('');
                    }}
                    className="px-3 py-2 bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">Tags (e.g. career, family, patience)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {wisdomForm.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-1 rounded-md text-[11px] font-mono"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = wisdomForm.tags.filter((_, i) => i !== idx);
                          setWisdomForm({ ...wisdomForm, tags: updated });
                        }}
                        className="hover:text-red-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Add tag and press Enter or +"
                    value={wisdomFormTagInput}
                    onChange={(e) => setWisdomFormTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!wisdomFormTagInput.trim()) return;
                        const cleaned = wisdomFormTagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                        if (cleaned) {
                          setWisdomForm({
                            ...wisdomForm,
                            tags: [...wisdomForm.tags, cleaned],
                          });
                        }
                        setWisdomFormTagInput('');
                      }
                    }}
                    className="flex-1 text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!wisdomFormTagInput.trim()) return;
                      const cleaned = wisdomFormTagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                      if (cleaned) {
                        setWisdomForm({
                          ...wisdomForm,
                          tags: [...wisdomForm.tags, cleaned],
                        });
                      }
                      setWisdomFormTagInput('');
                    }}
                    className="px-3 py-2 bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setWisdomModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-save-wisdom-submit"
                onClick={handleSaveWisdom}
                disabled={
                  isSavingWisdom ||
                  !wisdomForm.personName.trim() ||
                  !wisdomForm.wisdomText.trim() ||
                  !wisdomForm.situation.trim() ||
                  !wisdomForm.whyItMatters.trim()
                }
                className="inline-flex items-center gap-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className={`w-4 h-4 ${isSavingWisdom ? 'animate-spin' : ''}`} />
                <span>{isSavingWisdom ? 'Saving to Firestore...' : editingWisdomId ? 'Update Wisdom Entry' : 'Preserve in Wisdom Circle'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.6. EXPLICIT CONSENT GATE MODAL FOR WISDOM RETRIEVAL      */}
      {/* ========================================================= */}
      {consultConsentModalOpen && (
        <div id="wisdom-consent-modal" className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-5 border-b border-rose-100 bg-rose-50/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-200 text-rose-900 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-rose-800" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Explicit Consent Gate: Wisdom Circle Retrieval
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  Zero-Auto-Surface Privacy Policy
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">
                    {selectedWisdomForConsult?.personName || 'Wisdom Entry'}
                  </span>
                  <span className="text-[10px] font-semibold bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md">
                    {selectedWisdomForConsult?.relationship}
                  </span>
                </div>
                <p className="text-stone-800 italic font-serif leading-relaxed">
                  &ldquo;{selectedWisdomForConsult?.wisdomText}&rdquo;
                </p>
              </div>

              <div className="space-y-2 text-stone-600 leading-relaxed">
                <p>
                  <strong>Why does this require consent?</strong> Per your privacy directive, Smriti AI will <em>never</em> automatically query, infer, or inject your mentors&rsquo; wisdom into your reflections.
                </p>
                <p>
                  By granting consent, you authorize Smriti to attach this specific wisdom entry into your current <strong>Agent Reflection</strong> session so the agent can weave this timeless guidance into your dialogue.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <span>
                  Consent is temporary and active only for this reflection thread. You can detach it anytime using the banner in the Reflection tab.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setConsultConsentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Decline & Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-wisdom-consent"
                onClick={() => handleGrantConsentAndConsult()}
                className="inline-flex items-center gap-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Grant Consent & Consult Smriti</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.7. LINK MEMORY TO WISDOM MODAL                           */}
      {/* ========================================================= */}
      {linkMemoryModalWisdom && (
        <div id="link-memory-modal" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-3xl">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Link Memory Vault Entry</h3>
                <p className="text-xs text-stone-500">
                  Select a memory to link with {linkMemoryModalWisdom.personName}&rsquo;s wisdom.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkMemoryModalWisdom(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2 flex-1 text-xs">
              {memories.length === 0 ? (
                <p className="text-stone-500 text-center py-6">No memories in Memory Vault yet.</p>
              ) : (
                memories.map((m) => {
                  const isLinked = linkMemoryModalWisdom.linkedMemoryIds?.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-stone-900 block line-clamp-1">{m.summary}</span>
                        <span className="text-[10px] text-stone-500 font-mono">{formatDisplayDate(m.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleLinkWisdomToMemory(linkMemoryModalWisdom.id, m.id);
                          setLinkMemoryModalWisdom(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                          isLinked
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                        }`}
                      >
                        {isLinked ? 'Linked' : 'Link'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.8. LINK WISDOM TO MEMORY MODAL                           */}
      {/* ========================================================= */}
      {linkWisdomModalMemory && (
        <div id="link-wisdom-modal" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-3xl">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Link Wisdom Circle Advice</h3>
                <p className="text-xs text-stone-500">
                  Select mentor advice that influenced this memory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkWisdomModalMemory(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2 flex-1 text-xs">
              {wisdomList.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-stone-500">No Wisdom Circle entries yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkWisdomModalMemory(null);
                      setActiveTab('wisdom');
                      openCreateWisdomModal();
                    }}
                    className="text-xs font-bold text-rose-800 hover:underline cursor-pointer"
                  >
                    + Preserve your first wisdom entry
                  </button>
                </div>
              ) : (
                wisdomList.map((w) => {
                  const isLinked = linkWisdomModalMemory.linkedWisdomIds?.includes(w.id);
                  return (
                    <div
                      key={w.id}
                      className="p-3 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-stone-900">{w.personName}</span>
                          <span className="text-[10px] text-stone-500">({w.relationship})</span>
                        </div>
                        <p className="text-[11px] text-stone-600 italic line-clamp-1 mt-0.5">
                          &ldquo;{w.wisdomText}&rdquo;
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleLinkWisdomToMemory(w.id, linkWisdomModalMemory.id);
                          setLinkWisdomModalMemory(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                          isLinked
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-rose-800 text-white hover:bg-rose-900'
                        }`}
                      >
                        {isLinked ? 'Linked' : 'Link'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. INTERACTIVE SPOKEN VOICE AGENT MODAL (Two-Way Dialogue) */}
      {/* ========================================================= */}
      {voiceSessionOpen && (
        <div id="voice-agent-modal" className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 max-w-xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center relative">
            {/* Top Bar */}
            <div className="w-full px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">Smriti Spoken Companion</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Voice Agent
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Two-Way Voice Dialogue • {activeModeConfig.label} Mode
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-voice-agent"
                onClick={closeVoiceSession}
                className="text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
                title="Exit Voice Session"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Style Persona Selector inside Voice Session */}
            <div className="w-full px-5 py-2.5 bg-stone-950/60 border-b border-stone-800/80 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-[11px] text-stone-400 shrink-0 font-medium">Style Persona:</span>
              <div className="flex items-center gap-1.5">
                {REFLECTION_MODES.map((mode) => {
                  const isSelected = selectedStyle === mode.id;
                  const ModeIcon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(mode.id);
                        addLog('info', `Voice Persona switched to ${mode.label} Mode`);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-800 text-white font-semibold shadow-xs'
                          : 'bg-stone-800/70 hover:bg-stone-800 text-stone-300'
                      }`}
                    >
                      <ModeIcon className="w-3 h-3" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Interactive Visualizer */}
            <div className="w-full px-6 py-7 flex flex-col items-center text-center">
              {/* Animated Visualizer Rings */}
              <div className="relative w-36 h-36 flex items-center justify-center mb-6">
                {/* Outer Pulsing Ring */}
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-700 ${
                    voiceAgentState === 'listening'
                      ? 'bg-emerald-500/20 animate-ping'
                      : voiceAgentState === 'speaking'
                      ? 'bg-amber-500/20 animate-pulse scale-110'
                      : voiceAgentState === 'reflecting'
                      ? 'bg-blue-500/20 animate-spin'
                      : 'bg-stone-800/40'
                  }`}
                />
                {/* Middle Border Ring */}
                <div
                  className={`absolute inset-2 rounded-full border-2 transition-all duration-500 ${
                    voiceAgentState === 'listening'
                      ? 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                      : voiceAgentState === 'speaking'
                      ? 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                      : voiceAgentState === 'reflecting'
                      ? 'border-blue-500/60'
                      : 'border-stone-700/50'
                  }`}
                />
                {/* Core Interactive Orb */}
                <button
                  type="button"
                  id="voice-agent-orb"
                  onClick={() => {
                    if (voiceAgentState === 'listening') {
                      stopVoiceSessionListening();
                      setVoiceAgentState('idle');
                    } else if (voiceAgentState === 'speaking') {
                      stopSpeaking();
                    } else {
                      startVoiceSessionListening();
                    }
                  }}
                  className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-transform active:scale-95 shadow-xl cursor-pointer ${
                    voiceAgentState === 'listening'
                      ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                      : voiceAgentState === 'speaking'
                      ? 'bg-amber-600 text-white shadow-amber-900/50'
                      : voiceAgentState === 'reflecting'
                      ? 'bg-blue-600 text-white animate-pulse shadow-blue-900/50'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                >
                  {voiceAgentState === 'listening' && <Mic className="w-8 h-8 animate-bounce" />}
                  {voiceAgentState === 'speaking' && <Volume2 className="w-8 h-8 animate-pulse" />}
                  {voiceAgentState === 'reflecting' && <RefreshCw className="w-8 h-8 animate-spin" />}
                  {voiceAgentState === 'idle' && <MicOff className="w-8 h-8 text-stone-400" />}
                </button>
              </div>

              {/* State Label */}
              <div className="space-y-1 mb-4">
                <div className="text-sm font-semibold tracking-wide">
                  {voiceAgentState === 'listening' && (
                    <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Listening to your reflection...</span>
                    </span>
                  )}
                  {voiceAgentState === 'speaking' && (
                    <span className="text-amber-400 flex items-center justify-center gap-1.5">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span>Smriti is speaking ({selectedStyle} style)...</span>
                    </span>
                  )}
                  {voiceAgentState === 'reflecting' && (
                    <span className="text-blue-400 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Smriti is reflecting via Gemini...</span>
                    </span>
                  )}
                  {voiceAgentState === 'idle' && (
                    <span className="text-stone-400">Microphone paused. Tap orb to speak.</span>
                  )}
                </div>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {VOICE_STYLE_SPEECH_PARAMS[selectedStyle]?.styleDesc}
                </p>
              </div>

              {/* Soundwave Bars while speaking */}
              {voiceAgentState === 'speaking' && (
                <div className="flex items-center justify-center gap-1 h-5 my-2">
                  {[40, 75, 100, 60, 90, 45, 80, 55, 95, 70].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1 bg-amber-400 rounded-full animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* Live Speech Transcript / Last Response Box */}
              <div className="w-full min-h-[72px] bg-stone-950/70 border border-stone-800 rounded-2xl p-4 text-left mb-3">
                <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block mb-1">
                  {voiceInterimTranscript ? 'Live Speech Transcript:' : 'Latest Reflection Exchange:'}
                </span>
                {voiceInterimTranscript ? (
                  <p className="text-sm text-amber-200 font-medium leading-relaxed italic animate-pulse">
                    &ldquo;{voiceInterimTranscript}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-stone-300 leading-relaxed line-clamp-3">
                    {messages[messages.length - 1]?.content || 'Speak naturally. Smriti will reflect and reply aloud.'}
                  </p>
                )}
              </div>

              {voiceSessionError && (
                <div className="w-full bg-red-950/50 border border-red-800 text-red-300 text-xs p-2.5 rounded-xl mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{voiceSessionError}</span>
                </div>
              )}

              {/* Hands-Free Toggle and Quick Controls */}
              <div className="w-full pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={handsFreeMode}
                    onChange={(e) => {
                      setHandsFreeMode(e.target.checked);
                      addLog('info', `Hands-free continuous voice mode ${e.target.checked ? 'enabled' : 'disabled'}`);
                    }}
                    className="accent-amber-600 rounded"
                  />
                  <span className="text-stone-300 font-medium">Hands-free dialogue (auto-turn)</span>
                </label>

                <div className="flex items-center gap-2">
                  {voiceAgentState === 'speaking' ? (
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-900/50 hover:bg-amber-900 text-amber-200 border border-amber-700/60 font-semibold cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Interrupt</span>
                    </button>
                  ) : voiceAgentState === 'listening' ? (
                    <button
                      type="button"
                      onClick={() => {
                        stopVoiceSessionListening();
                        setVoiceAgentState('idle');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium cursor-pointer"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Pause Mic</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startVoiceSessionListening}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Resume Mic</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      closeVoiceSession();
                      handleSynthesizeMemory();
                    }}
                    disabled={isSynthesizing || messages.length <= 1}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthesize & Save</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.8. BOOK WISDOM MODAL: PRESERVE OR EDIT ENTRY            */}
      {/* ========================================================= */}
      {bookModalOpen && (
        <div id="book-wisdom-modal" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {editingBookId ? 'Edit Book Wisdom Entry' : 'Preserve Book Wisdom'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Human-in-the-loop review: customize ideas, quotes, principles, and personal reflections before saving.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Book Title */}
                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Book Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="book-title-input"
                    value={bookForm.bookTitle}
                    onChange={(e) => setBookForm({ ...bookForm, bookTitle: e.target.value })}
                    placeholder="e.g., Atomic Habits, Meditations, Deep Work"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-700"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Author <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="book-author-input"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    placeholder="e.g., James Clear, Marcus Aurelius, Cal Newport"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-700"
                  />
                </div>
              </div>

              {/* Key Idea / Core Principle */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Key Idea & Principle <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="book-key-idea-input"
                  rows={3}
                  value={bookForm.keyIdea}
                  onChange={(e) => setBookForm({ ...bookForm, keyIdea: e.target.value })}
                  placeholder="What is the central mental model, thesis, or life principle from this book?"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-700 leading-relaxed"
                />
              </div>

              {/* Quote */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Memorable Quote <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="book-quote-input"
                  rows={2}
                  value={bookForm.quote}
                  onChange={(e) => setBookForm({ ...bookForm, quote: e.target.value })}
                  placeholder="A standout line, excerpt, or phrase worth remembering verbatim..."
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-700 leading-relaxed font-serif"
                />
              </div>

              {/* Personal Reflection */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Personal Reflection & Application <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="book-reflection-input"
                  rows={3}
                  value={bookForm.personalReflection}
                  onChange={(e) => setBookForm({ ...bookForm, personalReflection: e.target.value })}
                  placeholder="How does this apply to your current goals, relationships, architecture, or everyday decisions?"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-700 leading-relaxed"
                />
              </div>

              {/* Themes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-800">
                    Themes (e.g., Mindset, Productivity, Philosophy)
                  </label>
                  <span className="text-[10px] text-stone-400">Click suggestions or type your own</span>
                </div>
                {/* Theme suggestions */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {['Personal Growth', 'Decision Making', 'Productivity', 'Mindset', 'Leadership', 'Philosophy', 'Systems Thinking'].map(
                    (suggestedTheme) => {
                      const isAdded = bookForm.themes.includes(suggestedTheme);
                      return (
                        <button
                          key={suggestedTheme}
                          type="button"
                          onClick={() => {
                            if (isAdded) {
                              setBookForm({
                                ...bookForm,
                                themes: bookForm.themes.filter((t) => t !== suggestedTheme),
                              });
                            } else {
                              setBookForm({
                                ...bookForm,
                                themes: [...bookForm.themes, suggestedTheme],
                              });
                            }
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            isAdded
                              ? 'bg-purple-800 text-white font-semibold'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          {isAdded ? '✓ ' : '+ '}
                          {suggestedTheme}
                        </button>
                      );
                    }
                  )}
                </div>
                {/* Theme active chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {bookForm.themes.map((theme, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-200 px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider"
                    >
                      <span>{theme}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = bookForm.themes.filter((_, i) => i !== idx);
                          setBookForm({ ...bookForm, themes: updated });
                        }}
                        className="hover:text-red-700 cursor-pointer ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {/* Theme custom input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Type custom theme and press Enter"
                    value={bookFormThemeInput}
                    onChange={(e) => setBookFormThemeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!bookFormThemeInput.trim()) return;
                        const trimmed = bookFormThemeInput.trim();
                        if (!bookForm.themes.includes(trimmed)) {
                          setBookForm({
                            ...bookForm,
                            themes: [...bookForm.themes, trimmed],
                          });
                        }
                        setBookFormThemeInput('');
                      }
                    }}
                    className="flex-1 text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!bookFormThemeInput.trim()) return;
                      const trimmed = bookFormThemeInput.trim();
                      if (!bookForm.themes.includes(trimmed)) {
                        setBookForm({
                          ...bookForm,
                          themes: [...bookForm.themes, trimmed],
                        });
                      }
                      setBookFormThemeInput('');
                    }}
                    className="px-3 py-2 bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Tags (e.g., habits, stoicism, focus, routine)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {bookForm.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-1 rounded-md text-[11px] font-mono"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = bookForm.tags.filter((_, i) => i !== idx);
                          setBookForm({ ...bookForm, tags: updated });
                        }}
                        className="hover:text-red-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Add tag and press Enter or +"
                    value={bookFormTagInput}
                    onChange={(e) => setBookFormTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!bookFormTagInput.trim()) return;
                        const cleaned = bookFormTagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                        if (cleaned && !bookForm.tags.includes(cleaned)) {
                          setBookForm({
                            ...bookForm,
                            tags: [...bookForm.tags, cleaned],
                          });
                        }
                        setBookFormTagInput('');
                      }
                    }}
                    className="flex-1 text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!bookFormTagInput.trim()) return;
                      const cleaned = bookFormTagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                      if (cleaned && !bookForm.tags.includes(cleaned)) {
                        setBookForm({
                          ...bookForm,
                          tags: [...bookForm.tags, cleaned],
                        });
                      }
                      setBookFormTagInput('');
                    }}
                    className="px-3 py-2 bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-save-book-submit"
                onClick={handleSaveBookWisdom}
                disabled={
                  isSavingBook ||
                  !bookForm.bookTitle.trim() ||
                  !bookForm.author.trim() ||
                  !bookForm.keyIdea.trim() ||
                  !bookForm.personalReflection.trim()
                }
                className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className={`w-4 h-4 ${isSavingBook ? 'animate-spin' : ''}`} />
                <span>
                  {isSavingBook
                    ? 'Saving to Firestore...'
                    : editingBookId
                    ? 'Update Book Wisdom'
                    : 'Preserve in Book Vault'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.9. LINK BOOK WISDOM TO MEMORY MODAL                      */}
      {/* ========================================================= */}
      {linkBookModalMemory && (
        <div id="link-book-modal" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Link Book Wisdom to Memory
                  </h3>
                  <p className="text-xs text-stone-500 line-clamp-1 max-w-sm">
                    {linkBookModalMemory.summary}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkBookModalMemory(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              <p className="text-stone-600 leading-relaxed mb-2">
                Connect ideas and principles from your reading to this reflection. Linked books appear in the memory card and reinforce your knowledge graph.
              </p>

              {bookWisdomList.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-xs text-stone-500">You haven&apos;t preserved any book wisdom yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkBookModalMemory(null);
                      setActiveTab('books');
                      openCreateBookModal();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-700 text-white font-semibold text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Book Wisdom First</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookWisdomList.map((book) => {
                    const isLinked =
                      linkBookModalMemory.linkedBookIds?.includes(book.id) ||
                      book.linkedMemoryIds?.includes(linkBookModalMemory.id);

                    return (
                      <div
                        key={book.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                          isLinked
                            ? 'bg-indigo-50/80 border-indigo-200 ring-1 ring-indigo-300'
                            : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{book.bookTitle}</span>
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded">
                              by {book.author}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 line-clamp-2">
                            {book.keyIdea}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLinkBookToMemory(linkBookModalMemory.id, book.id)}
                          className={`shrink-0 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                            isLinked
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                              : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                          }`}
                        >
                          {isLinked ? 'Unlink' : 'Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 flex justify-end bg-stone-50/70 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setLinkBookModalMemory(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.10. LINK MEMORY TO BOOK WISDOM MODAL                    */}
      {/* ========================================================= */}
      {linkMemoryModalBook && (
        <div id="link-memory-modal" className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Link Memory to &ldquo;{linkMemoryModalBook.bookTitle}&rdquo;
                  </h3>
                  <p className="text-xs text-stone-500">
                    Connect relevant reflections from your vault to this book.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkMemoryModalBook(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {memories.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <FileText className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-xs text-stone-500">No reflections saved in your Memory Vault yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((mem) => {
                    const isLinked =
                      linkMemoryModalBook.linkedMemoryIds?.includes(mem.id) ||
                      mem.linkedBookIds?.includes(linkMemoryModalBook.id);

                    return (
                      <div
                        key={mem.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                          isLinked
                            ? 'bg-emerald-50/80 border-emerald-200 ring-1 ring-emerald-300'
                            : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{mem.summary}</span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {formatDisplayDate(mem.createdAt)}
                            </span>
                          </div>
                          {mem.keyLearnings && mem.keyLearnings.length > 0 && (
                            <p className="text-[11px] text-stone-600 line-clamp-1">
                              • {mem.keyLearnings[0]}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLinkBookToMemory(mem.id, linkMemoryModalBook.id)}
                          className={`shrink-0 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                            isLinked
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                          }`}
                        >
                          {isLinked ? 'Unlink' : 'Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 flex justify-end bg-stone-50/70 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setLinkMemoryModalBook(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.10. RELATED WISDOM & KNOWLEDGE GRAPH REVIEW MODAL       */}
      {/* ========================================================= */}
      {isReviewingRelatedWisdom && pendingWisdomPrompt && (
        <div
          id="related-wisdom-review-modal"
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-800 text-amber-100 flex items-center justify-center shadow-xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-stone-900">
                      Related Wisdom & Knowledge Graph
                    </h3>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      <span>Zero-Auto-Surface: Consent Granted</span>
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Found {pendingWisdomPrompt.items.length} relevant knowledge asset{pendingWisdomPrompt.items.length > 1 ? 's' : ''} across your Memories, Wisdom Circle, and Book Wisdom.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle: Cards vs Knowledge Graph */}
                <div className="flex items-center bg-stone-200/70 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveKnowledgeGraphTab('cards')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeKnowledgeGraphTab === 'cards'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKnowledgeGraphTab('graph')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeKnowledgeGraphTab === 'graph'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5 text-amber-800" />
                    <span>Knowledge Graph</span>
                  </button>
                </div>

                <button
                  type="button"
                  id="btn-close-related-wisdom-modal"
                  onClick={() => setIsReviewingRelatedWisdom(false)}
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Context Prompt Recall Box */}
            <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-100 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-stone-700 truncate">
                <span className="font-semibold text-amber-950 shrink-0">Current Reflection Query:</span>
                <span className="italic truncate text-stone-600">
                  &ldquo;{pendingWisdomPrompt.querySnippet || 'Active conversation reflection'}&rdquo;
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono shrink-0">
                {pendingWisdomPrompt.detectedAt.slice(11, 16)}
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: KNOWLEDGE CARDS VIEW */}
              {activeKnowledgeGraphTab === 'cards' && (
                <div className="space-y-4">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-stone-100">
                    <button
                      type="button"
                      onClick={() => setRelatedWisdomCategoryFilter('ALL')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        relatedWisdomCategoryFilter === 'ALL'
                          ? 'bg-amber-900 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      All ({pendingWisdomPrompt.items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelatedWisdomCategoryFilter('memory')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        relatedWisdomCategoryFilter === 'memory'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      Related Memories ({pendingWisdomPrompt.items.filter((i) => i.sourceType === 'memory').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelatedWisdomCategoryFilter('wisdom')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        relatedWisdomCategoryFilter === 'wisdom'
                          ? 'bg-rose-800 text-white'
                          : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      Wisdom Circle Entries ({pendingWisdomPrompt.items.filter((i) => i.sourceType === 'wisdom').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelatedWisdomCategoryFilter('book')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        relatedWisdomCategoryFilter === 'book'
                          ? 'bg-indigo-800 text-white'
                          : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      Book Wisdom Entries ({pendingWisdomPrompt.items.filter((i) => i.sourceType === 'book').length})
                    </button>
                  </div>

                  {pendingWisdomPrompt.items
                    .filter((item) => relatedWisdomCategoryFilter === 'ALL' || item.sourceType === relatedWisdomCategoryFilter)
                    .map((item, idx) => {
                      const isBook = item.sourceType === 'book';
                      const isWisdom = item.sourceType === 'wisdom';
                      const isMemory = item.sourceType === 'memory';

                      const sourceThemeColor = isBook
                        ? 'border-indigo-200 bg-indigo-50/40'
                        : isWisdom
                        ? 'border-rose-200 bg-rose-50/40'
                        : 'border-emerald-200 bg-emerald-50/40';

                      const badgeColor = isBook
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                        : isWisdom
                        ? 'bg-rose-100 text-rose-900 border-rose-200'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-200';

                      const SourceIcon = isBook ? BookOpen : isWisdom ? HeartHandshake : Brain;

                      return (
                        <div
                          key={item.id || idx}
                          className={`rounded-2xl border p-4.5 transition-all shadow-xs space-y-3.5 ${sourceThemeColor}`}
                        >
                          {/* 1. SOURCE (Required) */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                  isBook
                                    ? 'bg-indigo-700 text-white'
                                    : isWisdom
                                    ? 'bg-rose-700 text-white'
                                    : 'bg-emerald-700 text-white'
                                }`}
                              >
                                <SourceIcon className="w-4 h-4" />
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                    {isBook ? 'Book Wisdom Entry' : isWisdom ? 'Wisdom Circle Entry' : 'Related Memory'}
                                  </span>
                                  {item.relationshipType && (
                                    <span className="text-[10px] font-semibold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                                      {item.relationshipType}
                                    </span>
                                  )}
                                  {item.relevanceScore && (
                                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                                      {Math.round(item.relevanceScore * 100)}% Match
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-sm font-bold text-stone-950 mt-1">
                                  {item.sourceTitle}
                                </h4>
                                {item.sourceSubtitle && (
                                  <p className="text-[11px] text-stone-500">
                                    {item.sourceSubtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Content Snippet */}
                          {item.contentSnippet && (
                            <div className="bg-white/90 border border-stone-200/80 rounded-xl p-3 flex items-start gap-2.5">
                              <Quote className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-stone-800 leading-relaxed font-serif italic">
                                &ldquo;{item.contentSnippet}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* 2. REASON FOR RETRIEVAL & EXPLANATION OF RELEVANCE */}
                          <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-800" />
                              <span>Reason For Retrieval:</span>
                            </div>
                            <p className="text-xs text-stone-900 font-medium leading-relaxed">
                              {item.reasonForRetrieval ||
                                (isBook
                                  ? `Retrieved from Book Wisdom because ${item.sourceTitle} provides foundational literature principles directly relevant to your reflection challenge.`
                                  : isWisdom
                                  ? `Retrieved from Wisdom Circle because ${item.sourceTitle}'s guidance provides direct mentor perspective on this dilemma.`
                                  : `Retrieved from Memory Vault because your past reflection notes record key learnings and precedents on this topic.`)}
                            </p>
                            <div className="pt-1.5 border-t border-amber-200/80 text-xs text-stone-800 leading-relaxed">
                              <span className="font-bold text-amber-950">Why It Is Relevant: </span>
                              {item.whyRelevant}
                            </div>
                          </div>

                          {/* 3. TAGS & 4. THEMES (Required) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-stone-200/60">
                          <div className="flex items-center gap-3 flex-wrap text-[11px]">
                            {/* Themes */}
                            {item.themes && item.themes.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-stone-600">Themes:</span>
                                <div className="flex flex-wrap gap-1">
                                  {item.themes.map((theme, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-800 font-medium text-[10px]"
                                    >
                                      {theme}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Tags */}
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-stone-600">Tags:</span>
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.map((tag, tagIdx) => (
                                    <span
                                      key={tagIdx}
                                      className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono text-[10px]"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Interactive Knowledge Graph & Reflection Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleInsertRelatedWisdomIntoInput(item)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                              title="Quote this wisdom in your current reflection message"
                            >
                              Quote in Input
                            </button>

                            <button
                              type="button"
                              onClick={() => handleConsultRelatedWisdomInChat(item)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow-xs transition-colors cursor-pointer"
                              title="Attach this wisdom as consented guidance for your ongoing reflection"
                            >
                              <HeartHandshake className="w-3 h-3" />
                              <span>Consult in Chat</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: KNOWLEDGE GRAPH VISUALIZER (Foundation for Second Brain Graph) */}
              {activeKnowledgeGraphTab === 'graph' && (
                <div className="space-y-4">
                  {/* Graph Topology Overview Bar */}
                  <div className="p-3.5 bg-stone-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Network className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-100">
                          Interactive Knowledge Graph Topology
                        </h4>
                        <p className="text-[10px] text-stone-400">
                          Visualizing semantic relationships across Memories, Wisdom Circle, and Book Wisdom
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="text-stone-300">Central Reflection</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        <span className="text-stone-300">Book Wisdom</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span className="text-stone-300">Wisdom Circle</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-stone-300">Memory Vault</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Node-Edge Canvas */}
                  <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 min-h-[340px] flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Background Grid Accent */}
                    <div className="absolute inset-0 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

                    {/* Central Node: Active Reflection */}
                    <div className="z-10 relative mb-8">
                      <div className="bg-white border-2 border-amber-800 rounded-2xl p-4 shadow-md max-w-sm text-center ring-4 ring-amber-100">
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full mb-1">
                          <Brain className="w-3 h-3 text-amber-800" />
                          <span>Active Reflection Node</span>
                        </div>
                        <p className="text-xs font-semibold text-stone-900 line-clamp-2">
                          &ldquo;{pendingWisdomPrompt.querySnippet || 'Current Reflection Dialogue'}&rdquo;
                        </p>
                        <span className="text-[10px] text-stone-500 block mt-1">
                          Style: {selectedStyle.toUpperCase()} Mode
                        </span>
                      </div>
                    </div>

                    {/* Connected Radiating Nodes */}
                    <div className="z-10 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {pendingWisdomPrompt.items.map((item, idx) => {
                        const isBook = item.sourceType === 'book';
                        const isWisdom = item.sourceType === 'wisdom';
                        const nodeBorder = isBook
                          ? 'border-indigo-400 hover:border-indigo-600 bg-indigo-50/80'
                          : isWisdom
                          ? 'border-rose-400 hover:border-rose-600 bg-rose-50/80'
                          : 'border-emerald-400 hover:border-emerald-600 bg-emerald-50/80';

                        const iconColor = isBook
                          ? 'text-indigo-700'
                          : isWisdom
                          ? 'text-rose-700'
                          : 'text-emerald-700';

                        const SourceIcon = isBook ? BookOpen : isWisdom ? HeartHandshake : Brain;

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedRelatedWisdomItem(item)}
                            className={`rounded-xl border p-3 cursor-pointer transition-all shadow-xs hover:shadow-md ${nodeBorder} relative group`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <SourceIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                                <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                                  {item.sourceType}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold bg-white text-stone-700 px-1.5 py-0.2 rounded border border-stone-200">
                                {item.relationshipType || 'Thematic Link'}
                              </span>
                            </div>

                            <h5 className="text-xs font-bold text-stone-900 line-clamp-1">
                              {item.sourceTitle}
                            </h5>

                            <p className="text-[11px] text-stone-600 mt-1 line-clamp-2">
                              {item.whyRelevant}
                            </p>

                            <div className="mt-2 pt-1.5 border-t border-stone-200/60 flex items-center justify-between text-[10px]">
                              <span className="text-amber-900 font-semibold">
                                {item.relevanceScore ? `${Math.round(item.relevanceScore * 100)}% Weight` : 'Direct Edge'}
                              </span>
                              <span className="text-stone-500 group-hover:text-stone-900 font-medium">
                                Click to inspect →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Graph Node Inspector Detail */}
                  {selectedRelatedWisdomItem && (
                    <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">
                            Node Inspector: {selectedRelatedWisdomItem.sourceTitle}
                          </span>
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                            {selectedRelatedWisdomItem.relationshipType || 'Connected Asset'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedRelatedWisdomItem(null)}
                          className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>

                      <p className="text-xs text-stone-700 italic bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        &ldquo;{selectedRelatedWisdomItem.contentSnippet}&rdquo;
                      </p>

                      <div className="text-xs">
                        <strong className="text-amber-950">Knowledge Graph Edge Reason:</strong>{' '}
                        <span className="text-stone-800">{selectedRelatedWisdomItem.whyRelevant}</span>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          {(selectedRelatedWisdomItem.themes || []).map((th, i) => (
                            <span key={i} className="bg-stone-100 px-2 py-0.5 rounded-md text-stone-700">
                              {th}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleConsultRelatedWisdomInChat(selectedRelatedWisdomItem)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Attach to Reflection</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/70 rounded-b-3xl">
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Zero-Auto-Surface Privacy Policy:</strong> Wisdom is only retrieved upon request and displayed with your explicit consent.
                </span>
              </p>

              <button
                type="button"
                onClick={() => setIsReviewingRelatedWisdom(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 transition-colors cursor-pointer shrink-0"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.11. ADD / EDIT TRUSTED CIRCLE CONTACT MODAL             */}
      {/* ========================================================= */}
      {contactModalOpen && (
        <div
          id="trusted-contact-modal"
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-teal-50/60 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-800 text-teal-100 flex items-center justify-center shadow-xs">
                  <UserPlus className="w-5 h-5 text-teal-100" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {editingContactId ? 'Edit Trusted Contact' : 'Add to Trusted Circle'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    A person you trust and may want to reconnect with during difficult times.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Name & Relationship */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="contact-name-input"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="e.g., Mom, Marcus, Dr. Sarah, Maya"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Relationship <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="contact-relationship-select"
                    value={contactForm.relationship}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        relationship: e.target.value as TrustedRelationship,
                      })
                    }
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="Friend">Friend</option>
                    <option value="Parent">Parent</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Therapist">Therapist</option>
                    <option value="Partner">Partner</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Why This Person Matters */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Why This Person Matters <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="contact-whymatters-input"
                  rows={3}
                  value={contactForm.whyTheyMatter}
                  onChange={(e) => setContactForm({ ...contactForm, whyTheyMatter: e.target.value })}
                  placeholder="Why do you trust them? What grounding or comfort do they bring you when you are struggling?"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700 leading-relaxed"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  This helps Smriti craft genuine, grounded messages tailored to your bond.
                </span>
              </div>

              {/* Contact Method & Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Contact Method <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="contact-method-select"
                    value={contactForm.preferredMethod}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        preferredMethod: e.target.value as PreferredContactMethod,
                      })
                    }
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="Text / SMS">Text / SMS</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="In-Person">In-Person</option>
                    <option value="Video Call">Video Call</option>
                    <option value="Email">Email</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-800 block mb-1">
                    Contact Detail <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="contact-detail-input"
                    value={contactForm.contactDetail}
                    onChange={(e) => setContactForm({ ...contactForm, contactDetail: e.target.value })}
                    placeholder="Phone number, email, or handle"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    Used only for quick message launch on your device.
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Notes <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="contact-notes-input"
                  rows={2}
                  value={contactForm.optionalNotes}
                  onChange={(e) => setContactForm({ ...contactForm, optionalNotes: e.target.value })}
                  placeholder="e.g., Prefers text before calling; always honest; good with career anxiety..."
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700 leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-800">
                    Tags (e.g., Grounding, Mentor, Family, Listening)
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {contactForm.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 text-[11px] font-medium px-2 py-0.5 rounded-lg border border-teal-200"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setContactForm({
                            ...contactForm,
                            tags: contactForm.tags.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-teal-600 hover:text-teal-900 cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Type tag and press Enter"
                    value={contactFormTagInput}
                    onChange={(e) => setContactFormTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = contactFormTagInput.trim().replace(/^#/, '');
                        if (trimmed && !contactForm.tags.includes(trimmed)) {
                          setContactForm({
                            ...contactForm,
                            tags: [...contactForm.tags, trimmed],
                          });
                        }
                        setContactFormTagInput('');
                      }
                    }}
                    className="flex-1 text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = contactFormTagInput.trim().replace(/^#/, '');
                      if (trimmed && !contactForm.tags.includes(trimmed)) {
                        setContactForm({
                          ...contactForm,
                          tags: [...contactForm.tags, trimmed],
                        });
                      }
                      setContactFormTagInput('');
                    }}
                    className="px-3 py-2 bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/60 rounded-b-3xl">
              <span className="text-[11px] text-stone-500">
                Stored privately in your account. Never shared.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-3.5 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-contact"
                  type="button"
                  disabled={isSavingContact || !contactForm.name.trim() || !contactForm.whyTheyMatter.trim()}
                  onClick={handleSaveContact}
                  className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className={`w-3.5 h-3.5 ${isSavingContact ? 'animate-spin' : ''}`} />
                  <span>{isSavingContact ? 'Saving...' : editingContactId ? 'Update Contact' : 'Save to Circle'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8.12. REACHOUT ASSISTANT MODAL (HUMAN CONNECTION BRIDGE)  */}
      {/* ========================================================= */}
      {reachoutModalOpen && (
        <div
          id="reachout-assistant-modal"
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 animate-fadeIn my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-teal-50 via-emerald-50/50 to-teal-50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-800 text-teal-100 flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-5 h-5 text-teal-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-stone-900">
                      Reachout Assistant
                    </h3>
                    <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.2 rounded-md">
                      Human Connection Bridge
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Draft a thoughtful, low-pressure message when you are struggling to communicate.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReachoutModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Mandatory Consent Safeguard Notice */}
              <div className="p-3 bg-teal-50/80 border border-teal-200/80 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
                <p className="text-[11px] text-teal-950 leading-relaxed">
                  <strong>Zero-Auto-Contact Policy:</strong> Smriti will never send any message. It generates a draft to help you express yourself, which you can edit freely and send on your own terms.
                </p>
              </div>

              {/* Step 1: Select Trusted Person */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  Who do you want to reach out to? <span className="text-red-600">*</span>
                </label>
                {trustedContacts.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between">
                    <span>You haven&apos;t added anyone to your Trusted Circle yet.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReachoutModalOpen(false);
                        openCreateContactModal();
                      }}
                      className="text-xs font-bold underline cursor-pointer text-amber-950"
                    >
                      Add Contact First
                    </button>
                  </div>
                ) : (
                  <div>
                    <select
                      id="reachout-contact-select"
                      value={selectedContactForReachout?.id || ''}
                      onChange={(e) => {
                        const sel = trustedContacts.find((c) => c.id === e.target.value);
                        setSelectedContactForReachout(sel || null);
                      }}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      {trustedContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.relationship}) - Prefers {c.preferredMethod}
                        </option>
                      ))}
                    </select>

                    {/* Selected contact badge */}
                    {selectedContactForReachout && (
                      <div className="mt-2 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-teal-900">
                            Why {selectedContactForReachout.name} matters:
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Preferred: {selectedContactForReachout.preferredMethod}
                          </span>
                        </div>
                        <p className="italic text-stone-800">&ldquo;{selectedContactForReachout.whyTheyMatter}&rdquo;</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: What are you experiencing? */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  What are you experiencing right now? <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="reachout-experience-input"
                  rows={3}
                  value={reachoutUserExperience}
                  onChange={(e) => setReachoutUserExperience(e.target.value)}
                  placeholder="Describe what has been going on, how you feel, or what's weighing on your mind..."
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700 leading-relaxed"
                />

                {/* Quick starter chips */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-stone-400 font-semibold">Quick fills:</span>
                  {[
                    'Feeling overwhelmed with work & decisions',
                    'Going through a rough emotional patch',
                    'Feeling isolated and need outside perspective',
                    'Just miss you and wanted to reconnect',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReachoutUserExperience(preset)}
                      className="text-[10px] bg-stone-100 hover:bg-teal-50 hover:text-teal-900 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: What support are you seeking? */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1">
                  What support are you seeking? <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="reachout-support-input"
                  value={reachoutSupportSeeking}
                  onChange={(e) => setReachoutSupportSeeking(e.target.value)}
                  placeholder="e.g., A 10-minute phone call, a listening ear, advice, or just a coffee chat"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-700"
                />

                {/* Support pills */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-stone-400 font-semibold">Presets:</span>
                  {[
                    'Just a listening ear',
                    'A quick 10-min phone call',
                    'Honest advice or guidance',
                    'A low-key distraction / catchup',
                    'No advice needed, just sharing',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReachoutSupportSeeking(preset)}
                      className="text-[10px] bg-stone-100 hover:bg-teal-50 hover:text-teal-900 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Desired Tone */}
              <div>
                <label className="font-semibold text-stone-800 block mb-1.5">
                  Desired Message Tone
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Gentle & Vulnerable', desc: 'Warm, sincere, honest' },
                    { id: 'Brief & Direct', desc: 'Short, clear, low effort' },
                    { id: 'Warm & Casual', desc: 'Friendly, easygoing' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setReachoutTone(t.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        reachoutTone === t.id
                          ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                          : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      <div className="font-semibold text-xs">{t.id}</div>
                      <div className={`text-[10px] mt-0.5 ${reachoutTone === t.id ? 'text-teal-100' : 'text-stone-400'}`}>
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate CTA Button */}
              <div className="pt-2">
                <button
                  id="btn-generate-reachout"
                  type="button"
                  disabled={isDraftingReachout || !reachoutUserExperience.trim() || !selectedContactForReachout}
                  onClick={handleGenerateReachoutDraft}
                  className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 text-amber-300 ${isDraftingReachout ? 'animate-spin' : ''}`} />
                  <span>
                    {isDraftingReachout ? 'Crafting thoughtful draft...' : 'Generate Reachout Draft'}
                  </span>
                </button>
              </div>

              {/* Generated Draft Section & Explanations */}
              {editableDraftMessage && (
                <div className="pt-4 border-t border-stone-200 space-y-4 animate-fadeIn">
                  {/* Explanation Breakdown Cards */}
                  {draftResult && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-2.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-teal-800 block">
                          1. Experiencing
                        </span>
                        <p className="text-[11px] text-teal-950 leading-tight">
                          {draftResult.whatExperiencing}
                        </p>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-amber-800 block">
                          2. Seeking Support
                        </span>
                        <p className="text-[11px] text-amber-950 leading-tight">
                          {draftResult.supportSeeking}
                        </p>
                      </div>
                      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-indigo-800 block">
                          3. Why Reaching Out
                        </span>
                        <p className="text-[11px] text-indigo-950 leading-tight">
                          {draftResult.whyReachingOut}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Editable Message Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                        <span>Editable Draft Message (Review & Adjust Freely)</span>
                      </label>
                      <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium border border-teal-200">
                        100% Editable
                      </span>
                    </div>
                    <textarea
                      id="reachout-editable-draft"
                      rows={5}
                      value={editableDraftMessage}
                      onChange={(e) => setEditableDraftMessage(e.target.value)}
                      className="w-full text-xs p-3 bg-stone-50 border-2 border-teal-200/80 focus:border-teal-700 focus:bg-white rounded-xl focus:outline-none leading-relaxed transition-all font-sans"
                    />
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      Edit any phrase to make it feel completely natural to you.
                    </span>
                  </div>

                  {/* Step 5: Explicit User Approval (Responsible AI Requirement) */}
                  <div
                    id="reachout-approval-box"
                    className={`p-3.5 rounded-2xl border transition-all ${
                      draftApprovedByUser
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                        : 'bg-amber-50/90 border-amber-200 text-amber-950'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="checkbox-approve-reachout-draft"
                        checked={draftApprovedByUser}
                        onChange={(e) => setDraftApprovedByUser(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-teal-800 rounded border-stone-300 focus:ring-teal-700 cursor-pointer shrink-0"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          {draftApprovedByUser ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="text-emerald-900">
                                Explicit User Approval Confirmed — Ready to Copy or Send
                              </span>
                            </>
                          ) : (
                            <span className="text-amber-900">
                              Explicit User Approval Required Before Copying or Sending
                            </span>
                          )}
                        </span>
                        <p className="text-[11px] text-stone-600 leading-relaxed">
                          I have reviewed this draft message. I explicitly approve copying or sending it to{' '}
                          <span className="font-semibold text-stone-900">
                            {selectedContactForReachout?.name || 'this contact'}
                          </span>{' '}
                          myself. Smriti AI will never contact anyone or send messages automatically.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Actions & Dispatch Links */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div className="w-full sm:w-auto">
                      <button
                        id="btn-copy-reachout-draft"
                        type="button"
                        disabled={!draftApprovedByUser}
                        onClick={handleCopyDraftMessage}
                        title={
                          draftApprovedByUser
                            ? 'Copy draft to clipboard'
                            : 'Please check the explicit approval box above before copying'
                        }
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                          !draftApprovedByUser
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
                            : copiedDraftSuccess
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                            : 'bg-teal-800 hover:bg-teal-900 text-white cursor-pointer'
                        }`}
                      >
                        {copiedDraftSuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Message</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick App Launchers if contact detail available and approved */}
                    {selectedContactForReachout && selectedContactForReachout.contactDetail && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {selectedContactForReachout.contactDetail.includes('@') ? (
                          draftApprovedByUser ? (
                            <a
                              id="btn-open-email-draft"
                              href={`mailto:${selectedContactForReachout.contactDetail}?subject=${encodeURIComponent(
                                'Thinking of you'
                              )}&body=${encodeURIComponent(editableDraftMessage)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold border border-stone-200 transition-colors cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5 text-stone-600" />
                              <span>Open Email Draft</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-400 rounded-xl text-xs font-semibold border border-stone-200 cursor-not-allowed opacity-60"
                            >
                              <Mail className="w-3.5 h-3.5 text-stone-400" />
                              <span>Open Email Draft</span>
                            </button>
                          )
                        ) : (
                          draftApprovedByUser ? (
                            <a
                              id="btn-open-sms-draft"
                              href={`sms:${selectedContactForReachout.contactDetail}?&body=${encodeURIComponent(
                                editableDraftMessage
                              )}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold border border-stone-200 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-stone-600" />
                              <span>Open SMS Draft</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-400 rounded-xl text-xs font-semibold border border-stone-200 cursor-not-allowed opacity-60"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
                              <span>Open SMS Draft</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-3xl">
              <span className="text-[11px] text-stone-500">
                Smriti AI will never send this message. Only you choose to send.
              </span>
              <button
                type="button"
                onClick={() => setReachoutModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-200 hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* V3 Retrieval Provenance & Ranking Audit Modal */}
      {selectedInspectionProvenance && (
        <ProvenanceInspectionModal
          provenance={selectedInspectionProvenance}
          onClose={() => setSelectedInspectionProvenance(null)}
        />
      )}
    </div>
  );
}
