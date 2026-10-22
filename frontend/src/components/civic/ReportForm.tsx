"use client";
import { useState } from 'react';
import { Cl } from '@stacks/transactions';
import { useCivicProof_ReportIssue } from '@/generated/hooks';
import { CATEGORIES, LIMITS } from '@/lib/civic';
import { CategoryIcon, Counter, Notice, TxNotice, useOnTxSuccess } from './ui';

const len = (s: string) => [...s].length;

export function ReportForm({ address, onRecorded }: { address: string | null; onRecorded: () => void }) {
  const report = useCivicProof_ReportIssue();
  const [category, setCategory] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  useOnTxSuccess(report, () => {
    setTitle('');
    setLocation('');
    setDescription('');
    onRecorded();
  });

  const t = title.trim();
  const l = location.trim();
  const d = description.trim();
  const valid =
    t.length > 0 && l.length > 0 && len(t) <= LIMITS.title && len(l) <= LIMITS.location && len(d) <= LIMITS.description;
  const busy = report.loading || report.txStatus === 'pending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !address) return;
    await report
      .call([Cl.stringUtf8(t), Cl.stringUtf8(d), Cl.stringUtf8(l), Cl.uint(category)])
      .catch(() => {});
  };

  return (
    <form onSubmit={submit} className="rounded-[22px] border border-[#E4DFD3] bg-white p-5 md:p-6 shadow-[0_1px_0_#E4DFD3]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-instrument text-[22px] font-semibold tracking-tight">Report a problem</h2>
        <span className="font-mono text-[11px] text-[#8A877F]">public · permanent</span>
      </div>
      <p className="mt-1 text-[13px] text-[#6B685F]">
        What you submit is written to the Stacks testnet under your address. Don’t include personal details.
      </p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[12px] font-medium uppercase tracking-wider text-[#6B685F]">Category</legend>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map(c => {
            const active = c.id === category;
            return (
              <button
                type="button"
                key={c.id}
                title={c.hint}
                onClick={() => setCategory(c.id)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11px] font-medium transition ${
                  active
                    ? 'border-[#1B1A17] bg-[#1B1A17] text-[#FFD23F]'
                    : 'border-[#E4DFD3] bg-[#FBF9F4] text-[#45433D] hover:border-[#C9C2B1]'
                }`}
              >
                <CategoryIcon category={c.id} />
                {c.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="flex items-center justify-between text-[12px] font-medium uppercase tracking-wider text-[#6B685F]">
          Title <Counter value={t} max={LIMITS.title} />
        </span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Streetlight out at the bus stop"
          className="mt-1.5 w-full rounded-xl border border-[#E4DFD3] bg-[#FBF9F4] px-3.5 py-2.5 text-[15px] outline-none focus:border-[#1B1A17] focus:bg-white"
        />
      </label>

      <label className="mt-4 block">
        <span className="flex items-center justify-between text-[12px] font-medium uppercase tracking-wider text-[#6B685F]">
          Location <Counter value={l} max={LIMITS.location} />
        </span>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Street, landmark, or nearest junction"
          className="mt-1.5 w-full rounded-xl border border-[#E4DFD3] bg-[#FBF9F4] px-3.5 py-2.5 text-[15px] outline-none focus:border-[#1B1A17] focus:bg-white"
        />
      </label>

      <label className="mt-4 block">
        <span className="flex items-center justify-between text-[12px] font-medium uppercase tracking-wider text-[#6B685F]">
          <span>
            Details <span className="normal-case tracking-normal text-[#8A877F]">(optional)</span>
          </span>
          <Counter value={d} max={LIMITS.description} />
        </span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="How long has it been like this? Is it a safety risk?"
          className="mt-1.5 w-full resize-y rounded-xl border border-[#E4DFD3] bg-[#FBF9F4] px-3.5 py-2.5 text-[15px] outline-none focus:border-[#1B1A17] focus:bg-white"
        />
      </label>

      <div className="mt-5 space-y-3">
        {!address ? (
          <Notice tone="warn">Connect a Stacks wallet (testnet) to file a report. Browsing is open to everyone.</Notice>
        ) : (
          <TxNotice hook={report} pendingLabel="Filing your report on-chain…" successLabel="Report recorded on the public board." />
        )}
        <button
          type="submit"
          disabled={!address || !valid || busy}
          className="w-full rounded-xl bg-[#1B1A17] px-4 py-3 text-[15px] font-semibold text-[#FFD23F] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Submitting…' : 'Post report to the board'}
        </button>
      </div>
    </form>
  );
}
