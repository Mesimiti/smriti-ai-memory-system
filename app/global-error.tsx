'use client';

import React from 'react';
import { RefreshCw, Home, ShieldAlert, Compass } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-stone-900">
        <div
          id="smriti-global-error-screen"
          className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-xl space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900">Smriti AI System Recovery</h1>
              <p className="text-xs text-stone-500 font-serif italic">Remember. Reflect. Grow.</p>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Application Environment Protected</p>
            <p className="text-amber-800">
              An unexpected layout error occurred. Your stored memories and data remain intact in local storage.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Session</span>
            </button>
            <button
              type="button"
              onClick={handleReload}
              className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-stone-200 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>

          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Global Fallback Screen</span>
            </span>
            <span>Zero Data Loss</span>
          </div>
        </div>
      </body>
    </html>
  );
}
