export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  provenance?: RetrievalProvenance;
  retrievalLogId?: string;
  candidateWisdom?: CandidateWisdomItem[];
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SecondBrainMeta {
  knowledgeGraphNodes: string[];
  suggestedFollowUps: string[];
  confidenceScore: number;
}

export type ReflectionStyle = 'coach' | 'practical' | 'mentor' | 'motivational' | 'philosophical';

export type WisdomRelationship =
  | 'Mother'
  | 'Father'
  | 'Teacher'
  | 'Mentor'
  | 'Friend'
  | 'Sibling'
  | 'Grandparent'
  | 'Colleague'
  | 'Other';

export interface WisdomEntry {
  id: string;
  userId: string;
  personName: string;
  relationship: WisdomRelationship | string;
  wisdomText: string;
  situation: string;
  whyItMatters: string;
  tags: string[];
  themes: string[];
  linkedMemoryIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface BookWisdomEntry {
  id: string;
  userId: string;
  bookTitle: string;
  author: string;
  keyIdea: string;
  quote: string;
  personalReflection: string;
  tags: string[];
  themes: string[];
  linkedMemoryIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface StructuredMemory {
  id: string;
  userId: string;
  conversationId?: string;
  reflectionStyle?: ReflectionStyle;
  summary: string;
  keyLearnings: string[];
  actionItems: ActionItem[];
  tags: string[];
  themes: string[];
  reflectionNotes: string;
  aiExplanation: string;
  secondBrainMeta?: SecondBrainMeta;
  linkedWisdomIds?: string[];
  linkedBookIds?: string[];
  retrievalContext?: {
    referencedMemoryIds?: string[];
    referencedWisdomIds?: string[];
    retrievalLogId?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt: string;
  providerId?: string;
}

export type RelatedWisdomSourceType = 'memory' | 'wisdom' | 'book';

export interface RelatedWisdomItem {
  id: string;
  originalId: string;
  sourceType: RelatedWisdomSourceType;
  sourceTitle: string;
  sourceSubtitle?: string;
  contentSnippet: string;
  whyRelevant: string;
  reasonForRetrieval?: string;
  tags: string[];
  themes: string[];
  relevanceScore?: number;
  relationshipType?: string;
}

export interface RelatedWisdomPrompt {
  question: string;
  items: RelatedWisdomItem[];
  detectedAt: string;
  querySnippet?: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'central_reflection' | 'memory' | 'wisdom' | 'book';
  tags: string[];
  themes: string[];
  relationshipReason?: string;
}

export interface KnowledgeGraphEdge {
  sourceId: string;
  targetId: string;
  label: string;
  weight: number;
}

export type TrustedRelationship =
  | 'Parent'
  | 'Friend'
  | 'Mentor'
  | 'Teacher'
  | 'Partner'
  | 'Therapist'
  | 'Sibling'
  | 'Other';

export type PreferredContactMethod =
  | 'Text / SMS'
  | 'Phone Call'
  | 'In-Person'
  | 'Video Call'
  | 'Email'
  | 'Other';

export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  relationship: TrustedRelationship;
  whyTheyMatter: string;
  preferredMethod: PreferredContactMethod;
  contactDetail?: string; // Optional phone/email for client-side deep links (sms:, mailto:)
  optionalNotes?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ReachoutDraftRequest {
  contactName: string;
  relationship: TrustedRelationship;
  whyTheyMatter: string;
  preferredMethod: PreferredContactMethod;
  userExperience: string; // What the user is going through / feeling
  supportSeeking: string; // What support they are looking for
  tone?: 'Gentle & Vulnerable' | 'Brief & Direct' | 'Warm & Casual';
}

export interface ReachoutDraftResponse {
  draftMessage: string;
  experienceSummary?: string;
  supportSummary?: string;
  reachoutReason?: string;
  whatExperiencing?: string;
  whatYouAreExperiencing?: string;
  supportSeeking?: string;
  whyReachingOut?: string;
  recommendedMethod?: string;
  tips?: string[];
  modelUsed?: string;
}

export type GrowthInsightCategory =
  | 'Emerging Themes'
  | 'Recurring Goals'
  | 'Growth Patterns'
  | 'Frequently Completed Actions'
  | 'Reflection Habits';

export interface GrowthInsightItem {
  category: GrowthInsightCategory;
  title: string;
  observation: string;
  evidence: string; // Explains why this insight was generated
}

export interface GrowthInsightsReport {
  id: string;
  userId: string;
  generatedAt: string;
  modelUsed?: string;
  insights: GrowthInsightItem[];
  reflectionSummary: string;
  growthMotto: string;
  totalMemoriesAnalyzed: number;
}

// =========================================================================
// V3 Retrieval Architecture Types
// =========================================================================

export interface RetrievalRankingFactors {
  lexicalScore: number;       // S_lex: BM25/keyword overlap (weight: 0.35)
  thematicBonus: number;      // S_thm: Theme congruence (weight: 0.25)
  thematicScore?: number;     // Alias for S_thm
  tagOverlapBonus: number;    // S_tag: Tag match ratio (weight: 0.15)
  tagScore?: number;          // Alias for S_tag
  recencyWeight: number;      // S_rec: Exponential decay factor (weight: 0.15)
  recencyScore?: number;      // Alias for S_rec
  actionabilityWeight: number;// S_act: Action item relevance (weight: 0.10)
  actionabilityScore?: number;// Alias for S_act
  finalScore: number;         // Aggregate composite score [0.0 - 1.0]
}

export interface RetrievedMemoryItem {
  id: string;
  summary: string;
  keyLearnings: string[];
  actionItems?: ActionItem[];
  tags: string[];
  themes: string[];
  createdAt: string;
  relevanceScore: number;
  rankingFactors: RetrievalRankingFactors;
  relationshipReason: string;
  automaticallyIncluded: true; // Memory retrieval happens automatically
}

export interface CandidateWisdomItem {
  id: string;
  personName: string;
  relationship: string;
  wisdomText: string;
  situation: string;
  whyItMatters: string;
  tags: string[];
  themes: string[];
  relevanceScore: number;
  rankingFactors: RetrievalRankingFactors;
  relationshipReason: string;
  isConsented: boolean;        // Wisdom Circle is strictly opt-in; never automatically retrieved
  consentTimestamp?: string;
}

export interface RetrievedBookItem {
  id: string;
  bookTitle: string;
  author: string;
  keyIdea: string;
  quote: string;
  personalReflection: string;
  tags: string[];
  themes: string[];
  createdAt: string;
  relevanceScore: number;
  rankingFactors: RetrievalRankingFactors;
  relationshipReason: string;
  automaticallyIncluded?: boolean;
}

export interface RetrievalProvenance {
  memoriesUsed: {
    id: string;
    summary: string;
    relevancePercent: number;
    relevanceScore?: number;
    rankingFactors?: RetrievalRankingFactors;
    relationshipReason: string;
  }[];
  wisdomUsed: {
    id: string;
    personName: string;
    relationship: string;
    wisdomText: string;
    relevancePercent?: number;
    relevanceScore?: number;
    rankingFactors?: RetrievalRankingFactors;
    consentVerified: boolean;
  }[];
  booksUsed?: {
    id: string;
    bookTitle: string;
    author: string;
    keyIdea: string;
    quote?: string;
    relevancePercent?: number;
    relevanceScore?: number;
    rankingFactors?: RetrievalRankingFactors;
    relationshipReason?: string;
  }[];
  transparencyRationale: string;
}

export interface RetrievalOrchestratorResult {
  reply: string;
  modelUsed: string;
  reflectionStyle: ReflectionStyle;
  retrievedMemories: RetrievedMemoryItem[];
  candidateWisdom: CandidateWisdomItem[]; // Wisdom matches requiring user consent
  consentedWisdomInjected: CandidateWisdomItem[]; // Wisdom matches where user explicitly opted in
  retrievedBooks?: RetrievedBookItem[]; // Book wisdom insights woven into reflection
  provenance: RetrievalProvenance;
  retrievalLogId: string;
  latencyMs: number;
  timestamp: string;
}

export interface RetrievalLog {
  id: string;
  userId: string;
  reflectionQuery: string;
  reflectionStyle: ReflectionStyle;
  retrievedMemoriesCount: number;
  retrievedMemories: {
    id: string;
    summary: string;
    relevanceScore: number;
    rankingFactors: RetrievalRankingFactors;
    automaticallyIncluded: true;
  }[];
  candidateWisdomCount: number;
  candidateWisdom: {
    id: string;
    personName: string;
    relationship: string;
    wisdomSnippet: string;
    relevanceScore: number;
    userConsented: boolean;
    consentTimestamp?: string;
  }[];
  consentedWisdomInjectedCount: number;
  retrievedBooksCount?: number;
  retrievedBooks?: {
    id: string;
    bookTitle: string;
    author: string;
    keyIdea: string;
    relevanceScore: number;
  }[];
  modelUsed: string;
  latencyMs: number;
  createdAt: string;
  query?: string;
  retrievedMemoryIds?: string[];
  candidateWisdomIds?: string[];
  consentedWisdomIds?: string[];
  retrievedBookIds?: string[];
  provenance?: RetrievalProvenance;
}

export type Memory = StructuredMemory;
export type ScoredMemory = RetrievedMemoryItem;
export type ScoredWisdom = CandidateWisdomItem;
export type ScoredBook = RetrievedBookItem;
export type RetrievalAuditLog = RetrievalLog;



