"use client";
export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-16 py-6 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--primary)]">ArcSwap</span>
          <span>— Decentralized exchange on Arc Testnet</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Built by</span>
          <a
            href="https://x.com/lexiweb31"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[var(--primary)] hover:underline font-semibold"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
            @lexiweb31
          </a>
        </div>
      </div>
    </footer>
  );
}
