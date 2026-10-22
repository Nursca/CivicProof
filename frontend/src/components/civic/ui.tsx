"use client";
import { useEffect, useRef, type ReactNode } from 'react';
import { STATUS, explainTxError, type Status } from '@/lib/civic';

export function StatusPill({ status, size = 'sm' }: { status: Status; size?: 'sm' | 'md' }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-mono uppercase tracking-wide ${s.tone} ${
        size === 'md' ? 'px-3 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const paths: Record<number, ReactNode> = {
  // streetlight
  1: (
    <>
      <path d="M8 21h8M12 21V9" />
      <path d="M12 9c0-3 2-5 5-5h1v3a3 3 0 0 1-3 3h-3" />
      <path d="M16 13l1 2M19 11l2 1" />
    </>
  ),
  // road
  2: (
    <>
      <path d="M5 21 9 3M19 21 15 3" />
      <path d="M12 5v2M12 11v2M12 17v2" />
    </>
  ),
  // waste
  3: (
    <>
      <path d="M4 7h16M10 3h4M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  // water
  4: (
    <>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  // other
  5: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </>
  ),
};

export function CategoryIcon({ category, className = 'h-5 w-5' }: { category: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[category] ?? paths[5]}
    </svg>
  );
}

type TxHook = {
  loading: boolean;
  error: Error | null;
  txid: string | null;
  txStatus: string | null;
  txStatusError: string | null;
  explorerUrl: string | null;
};

/** Runs `onSuccess` once when a public-call hook's transaction confirms. */
export function useOnTxSuccess(hook: TxHook, onSuccess: () => void) {
  const done = useRef<string | null>(null);
  const cb = useRef(onSuccess);
  cb.current = onSuccess;
  useEffect(() => {
    if (hook.txStatus === 'success' && hook.txid && done.current !== hook.txid) {
      done.current = hook.txid;
      cb.current();
    }
  }, [hook.txStatus, hook.txid]);
}

/** Inline status line for a wallet transaction. */
export function TxNotice({ hook, pendingLabel = 'Waiting for the transaction to confirm…', successLabel = 'Recorded on-chain.' }: {
  hook: TxHook;
  pendingLabel?: string;
  successLabel?: string;
}) {
  if (hook.loading) {
    return <Notice tone="info">Confirm the transaction in your wallet…</Notice>;
  }
  if (hook.error) {
    const msg = hook.error.message?.toLowerCase().includes('cancel') || hook.error.message?.toLowerCase().includes('reject')
      ? 'Transaction cancelled in wallet.'
      : hook.error.message;
    return <Notice tone="error">{msg}</Notice>;
  }
  if (!hook.txid) return null;
  const link = hook.explorerUrl ? (
    <a href={hook.explorerUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 font-medium">
      View transaction
    </a>
  ) : null;
  if (hook.txStatus === 'success') return <Notice tone="success">{successLabel} {link}</Notice>;
  if (hook.txStatus === 'abort_by_response') return <Notice tone="error">{explainTxError(hook.txStatusError)} {link}</Notice>;
  if (hook.txStatus === 'error') return <Notice tone="error">{hook.txStatusError ?? 'Could not confirm transaction.'} {link}</Notice>;
  return (
    <Notice tone="info">
      <Spinner /> {pendingLabel} {link}
    </Notice>
  );
}

export function Notice({ tone, children }: { tone: 'info' | 'success' | 'error' | 'warn'; children: ReactNode }) {
  const tones = {
    info: 'bg-[#EEF1F6] text-[#2B3A55] border-[#D7DEEA]',
    success: 'bg-[#DDF3E4] text-[#1D6B3A] border-[#B4E0C2]',
    error: 'bg-[#FDE7E2] text-[#9C2F15] border-[#F5C2B5]',
    warn: 'bg-[#FFF3CC] text-[#7A5600] border-[#F2D785]',
  };
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-2 text-[13px] ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Counter({ value, max }: { value: string; max: number }) {
  const n = [...value].length;
  return (
    <span className={`font-mono text-[11px] ${n > max ? 'text-[#B23A1E]' : 'text-[#8A877F]'}`}>
      {n}/{max}
    </span>
  );
}
