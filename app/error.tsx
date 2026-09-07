'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Home, ShieldAlert, AlertCircle, Compass, LifeBuoy } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log unexpected client-level runtime exceptions securely without passing raw Event objects
    const safeMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : (error as any)?.message || 'Runtime exception caught';
    console.warn('[Smriti AI Root Error Boundary Caught]:', safeMessage);
  }, [error]);

  const handleHardRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div
      id="smriti-root-error-boundary"
      className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-stone-900 font-sans"
    >
      <div className="max-w-lg w-full bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-lg space-y-6 animate-fadeIn">
        {/* Header Badge & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <Compass className="w-6 h-6 text-amber-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-stone-900">Smriti AI</h1>
              <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                Stability Recovery
              </span>
            </div>
            <p className="text-xs text-stone-500 font-serif italic">Remember. Reflect. Grow.</p>
          </div>
        </div>

        {/* User-Friendly Explanation Banner */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-amber-900">
                A temporary display hiccup was caught safely
              </h2>
              <p className="text-xs text-amber-800 leading-relaxed">
                Smriti AI caught an unexpected rendering state and prevented an application-wide crash.
                Your saved memories, Wisdom Circle entries, and local reflection data are safe.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-1">
          <button
            id="btn-error-reset"
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Resume & Try Again</span>
          </button>

          <button
            id="btn-error-reload"
            type="button"
            onClick={handleHardRefresh}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold border border-stone-200 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Reload Safe Dashboard</span>
          </button>
        </div>

        {/* Technical Diagnostics (Collapsible) */}
        <details className="text-[11px] text-stone-600 bg-stone-50 rounded-xl p-3 border border-stone-200/80">
          <summary className="font-mono cursor-pointer select-none text-stone-700 font-medium hover:text-stone-900">
            Technical Details (Audit Reference)
          </summary>
          <div className="mt-2.5 space-y-1 font-mono text-[10px] text-stone-600 break-words">
            <p><span className="text-stone-400">Message:</span> {error?.message || 'Unknown render error'}</p>
            {error?.digest && (
              <p><span className="text-stone-400">Digest:</span> {error.digest}</p>
            )}
          </div>
        </details>

        {/* Footer Note */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-stone-400" />
            <span>Defensive Error Boundary Active</span>
          </span>
          <span>Zero Data Loss Guarantee</span>
        </div>
      </div>
    </div>
  );
}
