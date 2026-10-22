"use client";
import { blocksAgo, categoryLabel, shortAddr, type Issue } from '@/lib/civic';
import { CategoryIcon, StatusPill } from './ui';

export function IssueCard({
  issue,
  blockHeight,
  isMine,
  onOpen,
}: {
  issue: Issue;
  blockHeight: number | null;
  isMine: boolean;
  onOpen: () => void;
}) {
  const stripe = issue.status === 2 ? 'bg-[#2E9E57]' : issue.status === 1 ? 'bg-[#E6A400]' : 'bg-[#E0532F]';
  return (
    <button
      onClick={onOpen}
      className="group relative flex w-full flex-col overflow-hidden rounded-[18px] border border-[#E4DFD3] bg-white text-left transition hover:-translate-y-0.5 hover:border-[#C9C2B1] hover:shadow-[0_8px_24px_-12px_rgba(27,26,23,0.25)]"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${stripe}`} aria-hidden />
      <div className="flex items-start gap-3 p-4 pl-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4F1E8] text-[#1B1A17]">
          <CategoryIcon category={issue.category} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-[#8A877F]">#{issue.id}</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#6B685F]">
              {categoryLabel(issue.category)}
            </span>
            {isMine && (
              <span className="rounded-full bg-[#1B1A17] px-2 py-0.5 text-[10px] font-medium text-[#FFD23F]">Yours</span>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 font-instrument text-[17px] font-semibold leading-snug text-[#1B1A17]">
            {issue.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 truncate text-[13px] text-[#6B685F]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className="truncate">{issue.location}</span>
          </p>
        </div>
        <StatusPill status={issue.status} />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-dashed border-[#E4DFD3] px-5 py-2.5 font-mono text-[11px] text-[#8A877F]">
        <span>
          by {shortAddr(issue.reporter)} · {blocksAgo(blockHeight, issue.createdAt)}
        </span>
        <span className="flex items-center gap-1 text-[#45433D]" title="Community confirmations">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {issue.confirmations}
        </span>
      </div>
    </button>
  );
}
