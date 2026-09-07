import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-4 bg-white border border-stone-200/80 rounded-2xl p-8 shadow-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-800 font-serif font-bold text-xl border border-teal-200">
          404
        </div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Page Not Found</h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          The memory or page you are looking for does not exist or has been relocated within Smriti AI.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
