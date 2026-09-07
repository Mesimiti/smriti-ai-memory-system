'use client';

import React from 'react';
import { X, Compass, FileText, HeartHandshake, BookOpen, CheckCircle2, ShieldCheck, Hash, ExternalLink } from 'lucide-react';
import { RetrievalAuditLog } from '@/lib/types';

interface ProvenanceInspectionModalProps {
  provenance: RetrievalAuditLog['provenance'] | null;
  onClose: () => void;
}

export function ProvenanceInspectionModal({ provenance, onClose }: ProvenanceInspectionModalProps) {
  if (!provenance) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-2xl w-full p-6 shadow-xl space-y-5 my-8">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-800 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Retrieval Provenance & Mathematical Ranking Audit</h3>
              <p className="text-xs text-stone-500">
                Transparent verification of the multi-factor scoring formula that grounded this reflection.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Retrieved Memories (Auto-Injected) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Auto-Injected Memory Vault Items ({provenance.memoriesUsed.length})</span>
            </h4>
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              Index 1: Automatic
            </span>
          </div>

          {provenance.memoriesUsed.length === 0 ? (
            <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              No historical memories met the 0.20 score threshold for this reflection turn.
            </p>
          ) : (
            <div className="space-y-2.5">
              {provenance.memoriesUsed.map((mem) => (
                <div key={mem.id} className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900 leading-snug">{mem.summary}</span>
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                      {mem.relevancePercent || Math.round((mem.relevanceScore || 0) * 100)}% Match
                    </span>
                  </div>

                  {/* Mathematical Scoring Parameters */}
                  {mem.rankingFactors && (
                    <div className="grid grid-cols-5 gap-1.5 text-[10px] font-mono text-stone-700 bg-white p-2 rounded-lg border border-emerald-100">
                      <div>
                        <span className="text-stone-400 block">S_lex (35%)</span>
                        <strong className="text-stone-900">{(mem.rankingFactors.lexicalScore ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_thm (25%)</span>
                        <strong className="text-stone-900">{(mem.rankingFactors.thematicScore ?? mem.rankingFactors.thematicBonus ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_tag (15%)</span>
                        <strong className="text-stone-900">{(mem.rankingFactors.tagScore ?? mem.rankingFactors.tagOverlapBonus ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_rec (15%)</span>
                        <strong className="text-stone-900">{(mem.rankingFactors.recencyScore ?? mem.rankingFactors.recencyWeight ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_act (10%)</span>
                        <strong className="text-stone-900">{(mem.rankingFactors.actionabilityScore ?? mem.rankingFactors.actionabilityWeight ?? 0).toFixed(3)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consented Wisdom Circle Items */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-700" />
              <span>Consented Wisdom Circle Mentors ({provenance.wisdomUsed.length})</span>
            </h4>
            <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
              Index 2: Opt-In Gate
            </span>
          </div>

          {provenance.wisdomUsed.length === 0 ? (
            <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              No Wisdom Circle entries were consented for this turn. (Consent is strictly opt-in).
            </p>
          ) : (
            <div className="space-y-2.5">
              {provenance.wisdomUsed.map((wis) => (
                <div key={wis.id} className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-950">
                      {wis.personName} ({wis.relationship})
                    </span>
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-200 px-2 py-0.5 rounded">
                      User Consented
                    </span>
                  </div>
                  <p className="text-xs text-rose-900 italic font-serif leading-relaxed">
                    &ldquo;{wis.wisdomText}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Book Wisdom & Literature Insights */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
              <span>Book Wisdom & Literature Insights ({(provenance.booksUsed || []).length})</span>
            </h4>
            <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
              Index 3: Second Brain
            </span>
          </div>

          {(!provenance.booksUsed || provenance.booksUsed.length === 0) ? (
            <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              No book wisdom entries met the score threshold for this reflection turn.
            </p>
          ) : (
            <div className="space-y-2.5">
              {provenance.booksUsed.map((book) => (
                <div key={book.id} className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-indigo-950 block">{book.bookTitle}</span>
                      <span className="text-[10px] text-indigo-700">by {book.author}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded shrink-0">
                      {book.relevancePercent || Math.round((book.relevanceScore || 0) * 100)}% Match
                    </span>
                  </div>
                  <p className="text-xs text-stone-800 font-medium leading-relaxed">
                    &ldquo;{book.keyIdea}&rdquo;
                  </p>
                  {book.quote && book.quote !== "No quote specified" && (
                    <p className="text-xs text-indigo-900 italic font-serif leading-relaxed pl-2 border-l-2 border-indigo-300">
                      &ldquo;{book.quote}&rdquo;
                    </p>
                  )}
                  {book.rankingFactors && (
                    <div className="grid grid-cols-5 gap-1.5 text-[10px] font-mono text-stone-700 bg-white p-2 rounded-lg border border-indigo-100">
                      <div>
                        <span className="text-stone-400 block">S_lex (35%)</span>
                        <strong className="text-stone-900">{(book.rankingFactors.lexicalScore ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_thm (25%)</span>
                        <strong className="text-stone-900">{(book.rankingFactors.thematicScore ?? book.rankingFactors.thematicBonus ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_tag (15%)</span>
                        <strong className="text-stone-900">{(book.rankingFactors.tagScore ?? book.rankingFactors.tagOverlapBonus ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_rec (15%)</span>
                        <strong className="text-stone-900">{(book.rankingFactors.recencyScore ?? book.rankingFactors.recencyWeight ?? 0).toFixed(3)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">S_act (10%)</span>
                        <strong className="text-stone-900">{(book.rankingFactors.actionabilityScore ?? book.rankingFactors.actionabilityWeight ?? 0).toFixed(3)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Zero unconsented data was transmitted to Gemini.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.8 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
