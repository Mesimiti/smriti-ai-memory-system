'use client';

import React, { useState } from 'react';
import {
  Compass,
  FileText,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Clock,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Search,
  Lock,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  Quote,
  ShieldAlert,
  Hash,
} from 'lucide-react';
import { Memory, WisdomEntry, BookWisdomEntry, RetrievalAuditLog, ScoredMemory, ScoredWisdom, ScoredBook } from '@/lib/types';

interface RetrievalArchitectureViewProps {
  memories: Memory[];
  wisdomList: WisdomEntry[];
  bookWisdomList?: BookWisdomEntry[];
  retrievalLogs: RetrievalAuditLog[];
  studioQuery: string;
  setStudioQuery: (q: string) => void;
  studioResults: {
    retrievedMemories: ScoredMemory[];
    candidateWisdom: ScoredWisdom[];
    consentedWisdomInjected: ScoredWisdom[];
    retrievedBooks?: ScoredBook[];
    latencyMs: number;
    modelUsed: string;
  } | null;
  isSimulatingRetrieval: boolean;
  onRunSimulation: (customQuery?: string) => Promise<void>;
  onSelectProvenance: (prov: RetrievalAuditLog['provenance']) => void;
  onGrantConsentCandidate: (candidate: ScoredWisdom) => void;
  allowSessionWisdomOptIn: boolean;
  setAllowSessionWisdomOptIn: (val: boolean) => void;
  onSwitchToReflect: () => void;
}

const PRESET_QUERIES = [
  'Navigating career crossroads, fear of making the wrong pivot, and imposter syndrome',
  'Overcoming creative block and decision fatigue during complex project execution',
  'Handling difficult workplace conversations with composure, clarity, and empathy',
  'Building sustainable daily focus habits and avoiding burnout from reactive work',
];

export function RetrievalArchitectureView({
  memories,
  wisdomList,
  bookWisdomList = [],
  retrievalLogs,
  studioQuery,
  setStudioQuery,
  studioResults,
  isSimulatingRetrieval,
  onRunSimulation,
  onSelectProvenance,
  onGrantConsentCandidate,
  allowSessionWisdomOptIn,
  setAllowSessionWisdomOptIn,
  onSwitchToReflect,
}: RetrievalArchitectureViewProps) {
  const [selectedSubTab, setSelectedSubTab] = useState<'studio' | 'formula' | 'logs' | 'threat-model'>('studio');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<RetrievalAuditLog | null>(null);

  return (
    <div id="v3-retrieval-architecture-view" className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Compass className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                  Smriti AI V3 Retrieval Architecture
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  Dual-Index Engine
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                  Production Grade
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1 max-w-3xl">
                Transforming Smriti AI from a <em>Memory Creation System</em> into an intelligent <em>Memory Retrieval System</em>.
                Grounding multi-turn reflections in personal vault history while strictly enforcing user consent for mentor wisdom.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={onSwitchToReflect}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <span>Open Reflection Agent</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
          </div>
        </div>

        {/* Dual-Index Principles Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          {/* Principle 1 */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                Index 1: Automatic
              </span>
              <span className="text-xs font-mono font-bold text-stone-700">{memories.length} Indexed</span>
            </div>
            <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Personal Memory Vault</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Memories are scored via hybrid multi-factor ranking (S_lex, S_thm, S_tag, S_rec, S_act) and automatically woven into the Gemini context.
            </p>
          </div>

          {/* Principle 2 */}
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                Index 2: Opt-In Only
              </span>
              <span className="text-xs font-mono font-bold text-rose-900">{wisdomList.length} Indexed</span>
            </div>
            <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-rose-700" />
              <span>Wisdom Circle (Strict Consent Gate)</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Never automatically retrieved. Unconsented advice is withheld until the user explicitly reviews and grants affirmative consent.
            </p>
          </div>

          {/* Principle 3 */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                Resilient Synthesis
              </span>
              <span className="text-xs font-mono font-bold text-amber-900">4-Stage Ladder</span>
            </div>
            <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-800" />
              <span>4-Stage Fallback & Provenance</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Synthesizes responses using <code>gemini-3.6-flash</code> with cascading failover, returning complete ranking audit logs to Firestore.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSelectedSubTab('studio')}
          className={`px-3.5 py-1.8 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSubTab === 'studio'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Interactive Retrieval Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSubTab('formula')}
          className={`px-3.5 py-1.8 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSubTab === 'formula'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>Mathematical Ranking Formula</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSubTab('logs')}
          className={`px-3.5 py-1.8 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSubTab === 'logs'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Firestore Retrieval Logs ({retrievalLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSubTab('threat-model')}
          className={`px-3.5 py-1.8 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedSubTab === 'threat-model'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Threat Model & Security Matrix</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: INTERACTIVE RETRIEVAL STUDIO                    */}
      {/* ========================================================= */}
      {selectedSubTab === 'studio' && (
        <div className="space-y-6">
          {/* Query Input Box & Simulation Controller */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Retrieval Simulation & Scoring Console</h3>
                <p className="text-xs text-stone-500">
                  Execute the hybrid ranking formula against your live Memory Vault ({memories.length}) and Wisdom Circle ({wisdomList.length}).
                </p>
              </div>

              {/* Session Opt-In Toggle */}
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs cursor-pointer transition-colors self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={allowSessionWisdomOptIn}
                  onChange={(e) => setAllowSessionWisdomOptIn(e.target.checked)}
                  className="rounded border-stone-300 text-amber-800 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span className="text-stone-700 font-medium">Session Wisdom Opt-In</span>
              </label>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                Load Preset Reflection Query:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStudioQuery(q);
                      onRunSimulation(q);
                    }}
                    className="text-[11px] bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-950 border border-stone-200 px-2.5 py-1 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Form */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={studioQuery}
                  onChange={(e) => setStudioQuery(e.target.value)}
                  placeholder="Enter a test reflection prompt or inquiry to rank against both indexes..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-800/20 focus:border-amber-800 text-stone-900"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRunSimulation();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => onRunSimulation()}
                disabled={isSimulatingRetrieval || !studioQuery.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingRetrieval ? 'animate-spin' : ''}`} />
                <span>{isSimulatingRetrieval ? 'Ranking Indexes...' : 'Run Simulation'}</span>
              </button>
            </div>
          </div>

          {/* Live Simulation Results */}
          {studioResults && (
            <div className="space-y-4 animate-fadeIn">
              {/* Simulation Metadata Bar */}
              <div className="bg-stone-900 text-stone-100 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-amber-400 font-bold">SIMULATION COMPLETED</span>
                  <span className="text-stone-400">•</span>
                  <span>Latency: <strong className="text-emerald-400">{studioResults.latencyMs}ms</strong></span>
                  <span className="text-stone-400">•</span>
                  <span>Model: <strong className="text-stone-200">{studioResults.modelUsed}</strong></span>
                </div>
                <div className="flex items-center gap-3 text-stone-300 text-[11px] flex-wrap">
                  <span>Vault Matches: <strong>{studioResults.retrievedMemories.length}</strong></span>
                  <span>Wisdom Matches: <strong>{studioResults.candidateWisdom.length}</strong></span>
                  <span>Book Matches: <strong>{(studioResults.retrievedBooks || []).length}</strong></span>
                </div>
              </div>

              {/* Tri-Branch Results Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Branch A: Memory Vault (Automatic Ingestion) */}
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Branch A: Memory Vault</h4>
                        <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Automatic Ingestion Active
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-600">
                      {studioResults.retrievedMemories.length} Matched
                    </span>
                  </div>

                  {studioResults.retrievedMemories.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                      No memories exceeded the 0.20 relevance threshold for this query.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studioResults.retrievedMemories.map((mem) => (
                        <div
                          key={mem.id}
                          className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 space-y-2.5 transition-all hover:bg-emerald-50/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                                {mem.themes?.[0] || 'Memory'}
                              </span>
                              <h5 className="text-xs font-bold text-stone-900 leading-snug">{mem.summary}</h5>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-800 text-white shadow-2xs">
                                {Math.round(mem.relevanceScore * 100)}% Match
                              </span>
                              <span className="block text-[9px] font-mono text-stone-500 mt-0.5">
                                Score: {mem.relevanceScore.toFixed(3)}
                              </span>
                            </div>
                          </div>

                          {/* Factor Breakdown Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Lexical: {(mem.rankingFactors.lexicalScore ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Theme: {(mem.rankingFactors.thematicScore ?? mem.rankingFactors.thematicBonus ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Tags: {(mem.rankingFactors.tagScore ?? mem.rankingFactors.tagOverlapBonus ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Recency: {(mem.rankingFactors.recencyScore ?? mem.rankingFactors.recencyWeight ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Action: {(mem.rankingFactors.actionabilityScore ?? mem.rankingFactors.actionabilityWeight ?? 0).toFixed(2)}
                            </span>
                          </div>

                          {/* Key Learnings */}
                          {mem.keyLearnings && mem.keyLearnings.length > 0 && (
                            <div className="text-[11px] text-stone-700 bg-white/80 p-2 rounded-lg border border-emerald-100">
                              <strong className="font-semibold text-stone-900">Key Learning:</strong> {mem.keyLearnings[0]}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-emerald-200/50">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Woven into System Prompt Context</span>
                            </span>
                            <span>Created: {mem.createdAt.slice(0, 10)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Branch B: Wisdom Circle (Consent-Gated) */}
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-900 flex items-center justify-center">
                        <HeartHandshake className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Branch B: Wisdom Circle</h4>
                        <span className="text-[10px] text-rose-800 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          Strict Consent Gate Active
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-600">
                      {studioResults.candidateWisdom.length} Available
                    </span>
                  </div>

                  {studioResults.candidateWisdom.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                      No mentor wisdom matched above the 0.20 relevance threshold for this query.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studioResults.candidateWisdom.map((wis) => (
                        <div
                          key={wis.id}
                          className="p-3.5 rounded-xl border border-rose-200/90 bg-rose-50/40 space-y-2.5 transition-all hover:bg-rose-50/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-rose-950">{wis.personName}</span>
                                <span className="text-[10px] font-semibold bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded">
                                  {wis.relationship}
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-500 font-medium">Context: {wis.situation || wis.whyItMatters || 'Wisdom context'}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-800 text-white shadow-2xs">
                                {Math.round(wis.relevanceScore * 100)}% Match
                              </span>
                              <span className="block text-[9px] font-mono text-stone-500 mt-0.5">
                                Score: {wis.relevanceScore.toFixed(3)}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white/90 border border-rose-200 rounded-lg p-2 text-xs text-rose-950 italic font-serif leading-relaxed">
                            &ldquo;{wis.wisdomText}&rdquo;
                          </div>

                          {/* Factor Breakdown Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Lexical: {(wis.rankingFactors.lexicalScore ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Theme: {(wis.rankingFactors.thematicScore ?? wis.rankingFactors.thematicBonus ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Tags: {(wis.rankingFactors.tagScore ?? wis.rankingFactors.tagOverlapBonus ?? 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-rose-200/60">
                            <span className="flex items-center gap-1 text-rose-700 font-medium">
                              <Lock className="w-3 h-3 text-rose-700" />
                              <span>Withheld from prompt until affirmative consent</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => onGrantConsentCandidate(wis)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <span>Grant Consent</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Branch C: Book Wisdom (Literature Grounding) */}
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Branch C: Book Wisdom</h4>
                        <span className="text-[10px] text-indigo-800 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          Literature Grounding
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-600">
                      {(studioResults.retrievedBooks || []).length} Matched
                    </span>
                  </div>

                  {(!studioResults.retrievedBooks || studioResults.retrievedBooks.length === 0) ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                      No book wisdom exceeded the 0.20 relevance threshold for this query.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studioResults.retrievedBooks.map((book) => (
                        <div
                          key={book.id}
                          className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/30 space-y-2.5 transition-all hover:bg-indigo-50/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-stone-900 block leading-snug">
                                {book.bookTitle}
                              </span>
                              <span className="text-[10px] font-semibold text-indigo-800">
                                by {book.author}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-800 text-white shadow-2xs">
                                {Math.round(book.relevanceScore * 100)}% Match
                              </span>
                              <span className="block text-[9px] font-mono text-stone-500 mt-0.5">
                                Score: {book.relevanceScore.toFixed(3)}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white/90 border border-indigo-100 rounded-lg p-2 text-xs text-stone-900 leading-relaxed font-medium">
                            &ldquo;{book.keyIdea}&rdquo;
                          </div>

                          {book.quote && book.quote !== 'No quote specified' && (
                            <p className="text-[11px] text-stone-600 italic font-serif leading-relaxed pl-2 border-l-2 border-indigo-300">
                              &ldquo;{book.quote}&rdquo;
                            </p>
                          )}

                          {/* Factor Breakdown Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Lexical: {(book.rankingFactors.lexicalScore ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Theme: {(book.rankingFactors.thematicScore ?? book.rankingFactors.thematicBonus ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Tags: {(book.rankingFactors.tagScore ?? book.rankingFactors.tagOverlapBonus ?? 0).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                              Recency: {(book.rankingFactors.recencyScore ?? book.rankingFactors.recencyWeight ?? 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-indigo-200/50">
                            <span className="flex items-center gap-1 text-indigo-700 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-indigo-700" />
                              <span>Woven into System Prompt Context</span>
                            </span>
                            <span>Recorded: {book.createdAt.slice(0, 10)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: MATHEMATICAL RANKING FORMULA                    */}
      {/* ========================================================= */}
      {selectedSubTab === 'formula' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-stone-900">Hybrid Multi-Factor Ranking Specification</h3>
              <p className="text-xs text-stone-600 mt-1">
                The retrieval engine ranks candidate memories and wisdom using a deterministic scoring formula with a 60-day half-life exponential decay:
              </p>
            </div>

            {/* LaTeX Mathematical Formula Display */}
            <div className="p-5 rounded-2xl bg-stone-900 text-stone-100 font-mono text-sm leading-relaxed border border-stone-800 overflow-x-auto shadow-sm">
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">Composite Scoring Equation:</div>
              <div className="text-stone-200 text-base font-semibold py-1">
                Score(M, Q) = 0.35 · S_lex + 0.25 · S_thm + 0.15 · S_tag + 0.15 · S_rec + 0.10 · S_act
              </div>
              <div className="text-xs text-stone-400 pt-2 border-t border-stone-800 mt-3">
                Where S_rec = exp(-ln(2) · Δt / 60) with half-life T_half = 60 days (Δt in days since creation)
              </div>
            </div>

            {/* Parameter Weight Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-lg font-bold text-amber-850 font-mono">0.35 (35%)</div>
                <div className="text-xs font-bold text-stone-900">S_lex: Lexical Match</div>
                <p className="text-[11px] text-stone-600">
                  Calculates Jaccard overlap between query tokens and memory summary, learnings, and context.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-lg font-bold text-amber-850 font-mono">0.25 (25%)</div>
                <div className="text-xs font-bold text-stone-900">S_thm: Theme Match</div>
                <p className="text-[11px] text-stone-600">
                  Scores semantic thematic affinity against detected life themes (e.g., resilience, career, focus).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-lg font-bold text-amber-850 font-mono">0.15 (15%)</div>
                <div className="text-xs font-bold text-stone-900">S_tag: Tag Match</div>
                <p className="text-[11px] text-stone-600">
                  Measures user-assigned tag overlap and contextual keyword matches.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-lg font-bold text-amber-850 font-mono">0.15 (15%)</div>
                <div className="text-xs font-bold text-stone-900">S_rec: Recency Decay</div>
                <p className="text-[11px] text-stone-600">
                  Favors recent learnings without erasing deep foundational memories (half-life: 60 days).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-lg font-bold text-amber-850 font-mono">0.10 (10%)</div>
                <div className="text-xs font-bold text-stone-900">S_act: Actionability</div>
                <p className="text-[11px] text-stone-600">
                  Boosts memories with concrete, high-signal action items and completed milestones.
                </p>
              </div>
            </div>

            {/* Threshold & Partitioning Rules */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs text-stone-800">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-800" />
                <span>Threshold & Gate Partitioning Rules</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-stone-700">
                <li><strong>Relevance Cutoff:</strong> Any candidate with composite score <code>&lt; 0.20</code> is filtered out to avoid context pollution.</li>
                <li><strong>Top-K Partitioning:</strong> Maximum 3 Vault Memories are automatically ingested into the reflection system prompt.</li>
                <li><strong>Strict Consent Requirement:</strong> Top-scoring Wisdom Circle matches are packaged as <code>candidateWisdom</code> and returned to the client. They are NEVER sent to Gemini until affirmative user consent is logged.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 3: FIRESTORE RETRIEVAL AUDIT LOGS                  */}
      {/* ========================================================= */}
      {selectedSubTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">Firestore Retrieval Audit Stream</h3>
                <p className="text-xs text-stone-600">
                  Persisted at <code>/users/{'{userId}'}/retrieval_logs</code> in Cloud Firestore for full transparency and ranking auditability.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200 self-start sm:self-auto">
                {retrievalLogs.length} Records Logged
              </span>
            </div>

            {retrievalLogs.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                No retrieval logs recorded yet. Run a reflection in the Agent Reflection tab or execute a simulation in the Studio.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-800">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500 font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Query Snippet</th>
                      <th className="py-2.5 px-3">Style</th>
                      <th className="py-2.5 px-3">Vault Injected</th>
                      <th className="py-2.5 px-3">Wisdom Surfaced</th>
                      <th className="py-2.5 px-3">Consented</th>
                      <th className="py-2.5 px-3">Latency</th>
                      <th className="py-2.5 px-3">Model</th>
                      <th className="py-2.5 px-3 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {retrievalLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {log.createdAt ? log.createdAt.slice(11, 19) : 'Just now'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900 max-w-xs truncate">
                          &ldquo;{log.query || log.reflectionQuery || 'Reflection query'}&rdquo;
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 capitalize">
                            {log.reflectionStyle}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className="text-emerald-700 font-semibold">
                            {log.retrievedMemoryIds?.length ?? log.retrievedMemoriesCount ?? log.retrievedMemories?.length ?? 0} memories
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className="text-stone-700">
                            {log.candidateWisdomIds?.length ?? log.candidateWisdomCount ?? log.candidateWisdom?.length ?? 0} candidates
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {(log.consentedWisdomIds?.length ?? log.consentedWisdomInjectedCount ?? 0) > 0 ? (
                            <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.2 rounded">
                              {log.consentedWisdomIds?.length ?? log.consentedWisdomInjectedCount} approved
                            </span>
                          ) : (
                            <span className="text-stone-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">
                          {log.latencyMs}ms
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-stone-500">
                          {log.modelUsed}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLogForDetail(log);
                              if (log.provenance) {
                                onSelectProvenance(log.provenance);
                              }
                            }}
                            className="text-amber-800 hover:text-amber-950 font-bold text-[11px] underline underline-offset-2 cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 4: AGENTIC THREAT MODELING & SECURITY MATRIX       */}
      {/* ========================================================= */}
      {selectedSubTab === 'threat-model' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Agentic Threat Modeling Summary (The 5 Threat Zones)</h3>
                  <p className="text-xs text-stone-500">
                    Mandatory production directive mapping vulnerabilities to countermeasures across the V3 Retrieval Architecture.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300">
                All 5 Zones Mitigated
              </span>
            </div>

            {/* Threat Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                <thead className="bg-stone-900 text-stone-200 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Threat Zone</th>
                    <th className="py-3 px-4">Potential Risk & Threat Scenario</th>
                    <th className="py-3 px-4">OWASP Classification</th>
                    <th className="py-3 px-4">Smriti V3 Mitigation & Security Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  <tr>
                    <td className="py-3 px-4 font-bold text-stone-900 font-mono">1. Input Surfaces</td>
                    <td className="py-3 px-4 text-stone-700">
                      Malicious reflection prompts containing prompt injection payloads designed to leak system instructions or override model ethics.
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-800">
                      OWASP LLM01 / A03
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      Strict input boundary wrapping. User reflection text is parameter-isolated and sanitized. Prompts instruct Gemini to treat user text strictly as reflective content.
                    </td>
                  </tr>

                  <tr className="bg-stone-50/50">
                    <td className="py-3 px-4 font-bold text-stone-900 font-mono">2. Planning & Reasoning</td>
                    <td className="py-3 px-4 text-stone-700">
                      Retrieval poisoning where manipulated memories attempt to trick the Reflection Agent into unsolicited recommendations or unauthorized actions.
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-800">
                      OWASP LLM02 / LLM07
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      Deterministic score thresholding (0.20 cutoff), strict human review workflow, key learning extraction isolation, and non-prescriptive reflective guidelines.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-stone-900 font-mono">3. Tool Execution</td>
                    <td className="py-3 px-4 text-stone-700">
                      Privilege escalation or unauthorized state writes via API endpoints without valid credentials or session bounds.
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-800">
                      OWASP A01 / LLM05
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      Zero client-side API keys. Server-side proxying via <code>/api/agent/retrieval-orchestrator</code> with defensive null checks, undefined-stripping, and Firestore server validation.
                    </td>
                  </tr>

                  <tr className="bg-stone-50/50">
                    <td className="py-3 px-4 font-bold text-stone-900 font-mono">4. Memory & State</td>
                    <td className="py-3 px-4 text-stone-700">
                      Cross-user data leakage where an attacker attempts to read another user&apos;s memories or wisdom logs directly via Firestore queries.
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-800">
                      OWASP A01 (Broken Access Control)
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      Hardened Firestore Security Rules with owner-bound path checking (<code>request.auth.uid == userId</code>) protecting <code>/users/{'{userId}'}/memories</code> and <code>/users/{'{userId}'}/retrieval_logs</code>.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-stone-900 font-mono">5. Inter-System Communication</td>
                    <td className="py-3 px-4 text-stone-700">
                      API token leakage or silent failures when calling Gemini API endpoints under heavy traffic or network partitions.
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-800">
                      OWASP A02 / LLM10
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      Zero hardcoded credentials. 4-Stage Resilient Model Fallback Ladder (<code>gemini-3.6-flash</code> &rarr; <code>gemini-3.1-flash-lite</code> &rarr; <code>gemini-flash-latest</code> &rarr; <code>gemini-3.7-flash</code>) with error recovery matrix and complete audit logs.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
