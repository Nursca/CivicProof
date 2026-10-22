"use client";
import { useMemo, useState } from 'react';
import { CATEGORIES, CONTRACT_ID, STATUS, explorer, shortAddr, type Status } from '@/lib/civic';
import { scaffoldConfig } from '@/scaffold.config';
import { useBoard } from './useBoard';
import { IssueCard } from './IssueCard';
import { IssueDetail } from './IssueDetail';
import { ReportForm } from './ReportForm';
import { StewardPanel } from './StewardPanel';
import { CategoryIcon, Notice, Spinner } from './ui';

type StatusFilter = 'all' | Status;

export default function Board() {
  const board = useBoard();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c = { all: board.issues.length, 0: 0, 1: 0, 2: 0 } as Record<StatusFilter, number>;
    for (const i of board.issues) c[i.status] += 1;
    return c;
  }, [board.issues]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.issues.filter(
      i =>
        (statusFilter === 'all' || i.status === statusFilter) &&
        (categoryFilter === 'all' || i.category === categoryFilter) &&
        (!mineOnly || i.reporter === board.address) &&
        (!q || `${i.title} ${i.location} ${i.description}`.toLowerCase().includes(q)),
    );
  }, [board.issues, board.address, statusFilter, categoryFilter, query, mineOnly]);

  const selected = board.issues.find(i => i.id === selectedId) ?? null;
  const resolvedPct = counts.all ? Math.round((counts[2] / counts.all) * 100) : 0;

  if (!CONTRACT_ID) {
    return (
      <div className="mx-auto max-w-xl py-20">
        <Notice tone="warn">
          civic-proof is not deployed. Run <code className="font-mono">stacksdapp deploy --network testnet --yes</code>.
        </Notice>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-10 md:pt-14">
        <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#8A6100]">Community problem board</p>
            <h1 className="mt-3 font-instrument text-[40px] font-semibold leading-[1.02] tracking-tight text-[#1B1A17] md:text-[58px]">
              See it. Report it.
              <br />
              <span className="relative isolate inline-block">
                Keep the record.
                <span className="absolute -bottom-1 left-0 h-3 w-full -skew-x-6 bg-[#FFD23F] -z-10" aria-hidden />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#45433D]">
              Broken streetlights, damaged roads, overflowing bins, water outages — post them publicly and follow
              each one from <em>open</em> to <em>acknowledged</em> to <em>resolved</em>. Every report and status
              change is timestamped on the Stacks blockchain, so nobody can quietly edit or erase it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <BigStat label="Reports" value={counts.all} />
            <BigStat label="Resolved" value={`${resolvedPct}%`} accent />
            <BigStat label="Open" value={counts[0]} dot={STATUS[0].dot} />
            <BigStat label="Acknowledged" value={counts[1]} dot={STATUS[1].dot} />
          </div>
        </div>

        <div className="mt-8 flex gap-3 rounded-2xl border border-[#E4DFD3] bg-[#F4F1E8] p-4 text-[13px] leading-relaxed text-[#45433D]">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-[#8A6100]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          <p>
            <strong className="text-[#1B1A17]">What the blockchain does — and doesn’t — prove.</strong> It gives a public,
            tamper-resistant record of <em>who</em> said <em>what</em> and <em>when</em>. It does <strong>not</strong>{' '}
            verify that a report is true, and a “resolved” status is only a claim by the reporter or a steward — not proof
            that a government agency acted.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 lg:grid-cols-[380px_1fr]">
        {/* Left column */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <ReportForm address={board.address} onRecorded={board.refresh} />
          {board.isOwner && <StewardPanel />}
          <HowItWorks />
        </aside>

        {/* Board */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 0, 1, 2] as StatusFilter[]).map(s => (
              <button
                key={String(s)}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                  statusFilter === s ? 'bg-[#1B1A17] text-[#FFD23F]' : 'bg-white text-[#45433D] ring-1 ring-[#E4DFD3] hover:ring-[#C9C2B1]'
                }`}
              >
                {s === 'all' ? 'All' : STATUS[s].label}
                <span className="ml-1.5 font-mono text-[11px] opacity-70">{counts[s]}</span>
              </button>
            ))}
            <button
              onClick={() => void board.refresh()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-[#6B685F] hover:bg-[#EFEBE0]"
              title="Reload from chain"
            >
              {board.loading ? <Spinner /> : '↻'} Refresh
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title, street, landmark…"
              className="flex-1 rounded-xl border border-[#E4DFD3] bg-white px-3.5 py-2 text-[14px] outline-none focus:border-[#1B1A17]"
            />
            <div className="flex gap-1 overflow-x-auto">
              <CatChip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
                All types
              </CatChip>
              {CATEGORIES.map(c => (
                <CatChip key={c.id} active={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)} title={c.label}>
                  <CategoryIcon category={c.id} className="h-4 w-4" />
                  <span className="sr-only">{c.label}</span>
                </CatChip>
              ))}
            </div>
          </div>
          {board.address && (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#6B685F]">
              <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} className="accent-[#1B1A17]" />
              Only my reports
            </label>
          )}

          {board.error && (
            <div className="mt-4">
              <Notice tone="error">
                Couldn’t read from {scaffoldConfig.nodeUrl}: {board.error}
              </Notice>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {board.loading && board.issues.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[132px] animate-pulse rounded-[18px] border border-[#E4DFD3] bg-white" />
                ))
              : visible.map(issue => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    blockHeight={board.blockHeight}
                    isMine={issue.reporter === board.address}
                    onOpen={() => setSelectedId(issue.id)}
                  />
                ))}
          </div>

          {!board.loading && visible.length === 0 && (
            <div className="mt-4 rounded-[18px] border border-dashed border-[#C9C2B1] bg-white/60 px-6 py-14 text-center">
              <p className="font-instrument text-[20px] font-semibold text-[#1B1A17]">
                {board.issues.length === 0 ? 'The board is empty' : 'No reports match these filters'}
              </p>
              <p className="mt-1 text-[14px] text-[#6B685F]">
                {board.issues.length === 0
                  ? 'Be the first to post a problem in your neighbourhood.'
                  : 'Try another status, category or search term.'}
              </p>
            </div>
          )}

          <p className="mt-6 font-mono text-[11px] text-[#8A877F]">
            Reading{' '}
            <a href={explorer.contract(CONTRACT_ID)} target="_blank" rel="noreferrer" className="underline decoration-dotted">
              {shortAddr(CONTRACT_ID.split('.')[0])}.{CONTRACT_ID.split('.')[1]}
            </a>{' '}
            on {scaffoldConfig.network}
            {board.blockHeight ? ` · block ${board.blockHeight.toLocaleString()}` : ''}
            {board.isSteward ? ' · you are a steward' : ''}
          </p>
        </div>
      </section>

      {selected && (
        <IssueDetail
          issue={selected}
          address={board.address}
          isSteward={board.isSteward}
          owner={board.owner}
          blockHeight={board.blockHeight}
          onClose={() => setSelectedId(null)}
          onChanged={board.refresh}
        />
      )}
    </>
  );
}

function BigStat({ label, value, accent, dot }: { label: string; value: number | string; accent?: boolean; dot?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-[#1B1A17] bg-[#1B1A17] text-[#FFD23F]' : 'border-[#E4DFD3] bg-white text-[#1B1A17]'}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${accent ? 'text-[#BDB8AA]' : 'text-[#6B685F]'}`}>
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
        {label}
      </div>
      <div className="mt-1 font-instrument text-[34px] font-semibold leading-none tracking-tight">{value}</div>
    </div>
  );
}

function CatChip({ active, children, ...rest }: { active: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
        active ? 'bg-[#1B1A17] text-[#FFD23F]' : 'bg-white text-[#45433D] ring-1 ring-[#E4DFD3] hover:ring-[#C9C2B1]'
      }`}
    >
      {children}
    </button>
  );
}

function HowItWorks() {
  const steps = [
    ['Report', 'Anyone with a wallet posts a problem with a category and location.'],
    ['Confirm', 'Neighbours tap “I see this too” — one confirmation per address.'],
    ['Acknowledge', 'A steward marks it seen, with a public note.'],
    ['Resolve', 'The reporter or a steward marks it fixed — or reopens it if it comes back.'],
  ];
  return (
    <section className="rounded-[22px] border border-[#E4DFD3] bg-[#F4F1E8] p-5">
      <h2 className="text-[12px] font-medium uppercase tracking-wider text-[#6B685F]">How it works</h2>
      <ol className="mt-3 space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1B1A17] font-mono text-[11px] text-[#FFD23F]">
              {i + 1}
            </span>
            <p className="text-[13px] leading-snug text-[#45433D]">
              <strong className="text-[#1B1A17]">{t}.</strong> {d}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
