"use client";
import { useCallback, useEffect, useState } from 'react';
import { Cl } from '@stacks/transactions';
import {
  useCivicProof_AcknowledgeIssue,
  useCivicProof_ConfirmIssue,
  useCivicProof_GetIssueHistory,
  useCivicProof_HasConfirmed,
  useCivicProof_ReopenIssue,
  useCivicProof_ResolveIssue,
} from '@/generated/hooks';
import {
  LIMITS,
  MAX_UPDATES,
  STATUS,
  blocksAgo,
  categoryLabel,
  explorer,
  parseBool,
  parseHistory,
  shortAddr,
  type Issue,
  type IssueUpdate,
} from '@/lib/civic';
import { CategoryIcon, Counter, Notice, Spinner, StatusPill, TxNotice, useOnTxSuccess } from './ui';

type Props = {
  issue: Issue;
  address: string | null;
  isSteward: boolean;
  owner: string | null;
  blockHeight: number | null;
  onClose: () => void;
  onChanged: () => void;
};

export function IssueDetail({ issue, address, isSteward, owner, blockHeight, onClose, onChanged }: Props) {
  const historyHook = useCivicProof_GetIssueHistory();
  const confirmedHook = useCivicProof_HasConfirmed();
  const confirm = useCivicProof_ConfirmIssue();
  const acknowledge = useCivicProof_AcknowledgeIssue();
  const resolve = useCivicProof_ResolveIssue();
  const reopen = useCivicProof_ReopenIssue();

  const [history, setHistory] = useState<IssueUpdate[] | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [note, setNote] = useState('');

  const { call: getHistory } = historyHook;
  const { call: getConfirmed } = confirmedHook;

  const load = useCallback(async () => {
    const raw = await getHistory([Cl.uint(issue.id)]).catch(() => null);
    setHistory(parseHistory(raw));
    if (address) {
      const c = await getConfirmed([Cl.uint(issue.id), Cl.principal(address)]).catch(() => null);
      setHasConfirmed(parseBool(c));
    }
  }, [getHistory, getConfirmed, issue.id, address]);

  useEffect(() => {
    void load();
  }, [load, issue.updateCount, issue.confirmations]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const afterTx = () => {
    setNote('');
    onChanged();
  };
  useOnTxSuccess(confirm, afterTx);
  useOnTxSuccess(acknowledge, afterTx);
  useOnTxSuccess(resolve, afterTx);
  useOnTxSuccess(reopen, afterTx);

  const isReporter = address === issue.reporter;
  const canConfirm = Boolean(address) && !isReporter && !hasConfirmed;
  const canAcknowledge = isSteward && issue.status === 0;
  const canResolve = (isSteward || isReporter) && issue.status !== 2;
  const canReopen = (isSteward || isReporter) && issue.status === 2;
  const historyFull = issue.updateCount >= MAX_UPDATES;
  const canChangeStatus = (canAcknowledge || canResolve || canReopen) && !historyFull;

  const hooks = [confirm, acknowledge, resolve, reopen];
  const busy = hooks.some(h => h.loading || h.txStatus === 'pending');
  const active = hooks.find(h => h.loading || h.error || h.txid);
  const trimmed = note.trim();
  const noteOk = [...trimmed].length <= LIMITS.note;

  const send = (hook: typeof acknowledge, fallback: string) =>
    hook.call([Cl.uint(issue.id), Cl.stringUtf8(trimmed || fallback)]).catch(() => {});

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1B1A17]/50 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-labelledby="issue-title"
        onClick={e => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-[26px] bg-[#FBF9F4] text-[#1B1A17] shadow-2xl sm:max-w-2xl sm:rounded-[26px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4DFD3] bg-[#FBF9F4]/95 px-5 py-3 backdrop-blur md:px-7">
          <span className="font-mono text-[12px] text-[#8A877F]">Report #{issue.id}</span>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#6B685F] hover:bg-[#EFEBE0]" aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-7 pt-5 md:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={issue.status} size="md" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFEBE0] px-3 py-1 text-[12px] font-medium text-[#45433D]">
              <CategoryIcon category={issue.category} className="h-3.5 w-3.5" />
              {categoryLabel(issue.category)}
            </span>
          </div>
          <h2 id="issue-title" className="mt-3 font-instrument text-[26px] font-semibold leading-tight tracking-tight">
            {issue.title}
          </h2>
          <p className="mt-1.5 text-[14px] text-[#45433D]">📍 {issue.location}</p>
          {issue.description && (
            <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-[#E4DFD3] bg-white p-4 text-[15px] leading-relaxed text-[#2E2C28]">
              {issue.description}
            </p>
          )}

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Reporter">
              <a href={explorer.address(issue.reporter)} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2">
                {shortAddr(issue.reporter)}
              </a>
            </Stat>
            <Stat label="Filed">
              <a href={explorer.block(issue.createdAt)} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2">
                #{issue.createdAt.toLocaleString()}
              </a>
            </Stat>
            <Stat label="Confirmations">{issue.confirmations}</Stat>
          </dl>

          {/* Actions */}
          <section className="mt-6 rounded-2xl border border-[#E4DFD3] bg-white p-4">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#6B685F]">Take part</h3>
            {!address ? (
              <p className="mt-2 text-[14px] text-[#6B685F]">Connect a wallet to confirm this report or update its status.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {isReporter ? (
                    <span className="text-[13px] text-[#6B685F]">You filed this report.</span>
                  ) : hasConfirmed ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1D6B3A]">✓ You confirmed seeing this</span>
                  ) : (
                    <button
                      disabled={!canConfirm || busy}
                      onClick={() => confirm.call([Cl.uint(issue.id)]).catch(() => {})}
                      className="rounded-xl border border-[#1B1A17] px-4 py-2 text-[14px] font-semibold transition hover:bg-[#1B1A17] hover:text-[#FFD23F] disabled:opacity-40"
                    >
                      I see this too
                    </button>
                  )}
                  {isSteward && (
                    <span className="ml-auto rounded-full bg-[#FFF3CC] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8A6100]">
                      {address === owner ? 'Owner · steward' : 'Steward'}
                    </span>
                  )}
                </div>

                {canChangeStatus && (
                  <div className="space-y-2 border-t border-dashed border-[#E4DFD3] pt-3">
                    <label className="block">
                      <span className="flex items-center justify-between text-[12px] text-[#6B685F]">
                        Note for the public record <Counter value={trimmed} max={LIMITS.note} />
                      </span>
                      <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={issue.status === 2 ? 'Why is it being reopened?' : 'e.g. Crew scheduled for Friday / Fixed, verified on site'}
                        className="mt-1 w-full rounded-xl border border-[#E4DFD3] bg-[#FBF9F4] px-3 py-2 text-[14px] outline-none focus:border-[#1B1A17] focus:bg-white"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {canAcknowledge && (
                        <ActionButton disabled={busy || !noteOk} onClick={() => send(acknowledge, 'Acknowledged')} tone="amber">
                          Acknowledge
                        </ActionButton>
                      )}
                      {canResolve && (
                        <ActionButton disabled={busy || !noteOk} onClick={() => send(resolve, 'Marked resolved')} tone="green">
                          Mark resolved
                        </ActionButton>
                      )}
                      {canReopen && (
                        <ActionButton disabled={busy || !noteOk} onClick={() => send(reopen, 'Reopened')} tone="red">
                          Reopen
                        </ActionButton>
                      )}
                    </div>
                  </div>
                )}
                {historyFull && (isSteward || isReporter) && (
                  <Notice tone="warn">This report has reached the 20-update history limit; its status can no longer change.</Notice>
                )}
                {!isSteward && !isReporter && (
                  <p className="text-[12px] text-[#8A877F]">
                    Only stewards can acknowledge. The reporter or a steward can mark it resolved.
                  </p>
                )}
                {active && <TxNotice hook={active} successLabel="Update recorded on-chain." />}
              </div>
            )}
          </section>

          {/* Timeline */}
          <section className="mt-6">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#6B685F]">On-chain status history</h3>
            {history === null ? (
              <div className="mt-3 flex items-center gap-2 text-[13px] text-[#6B685F]">
                <Spinner /> Loading history…
              </div>
            ) : (
              <ol className="relative mt-4 space-y-4 border-l-2 border-[#E4DFD3] pl-5">
                {history.map((h, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-[#FBF9F4] ${STATUS[h.status].dot}`} />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[14px]">
                        {i === 0 ? 'Reported' : h.status === 0 ? 'Reopened' : STATUS[h.status].label}
                      </span>
                      <span className="font-mono text-[11px] text-[#8A877F]">
                        by{' '}
                        <a href={explorer.address(h.actor)} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                          {h.actor === issue.reporter ? 'reporter' : shortAddr(h.actor)}
                        </a>{' '}
                        ·{' '}
                        <a href={explorer.block(h.block)} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                          {blocksAgo(blockHeight, h.block)}
                        </a>
                      </span>
                    </div>
                    {i > 0 && h.note && <p className="mt-0.5 text-[14px] text-[#45433D]">“{h.note}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <p className="mt-6 rounded-xl bg-[#EFEBE0] px-4 py-3 text-[12px] leading-relaxed text-[#6B685F]">
            This timeline shows <strong>who</strong> recorded each change and <strong>when</strong>. It can’t be edited
            or deleted — but it does not prove the report is accurate or that any agency took action.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E4DFD3] bg-white px-2 py-2.5">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-[#8A877F]">{label}</dt>
      <dd className="mt-0.5 font-mono text-[13px] text-[#1B1A17]">{children}</dd>
    </div>
  );
}

function ActionButton({
  tone,
  children,
  ...rest
}: { tone: 'amber' | 'green' | 'red' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones = {
    amber: 'bg-[#E6A400] text-[#1B1A17] hover:bg-[#D19500]',
    green: 'bg-[#2E9E57] text-white hover:bg-[#25854A]',
    red: 'bg-white text-[#B23A1E] ring-1 ring-[#F5C2B5] hover:bg-[#FDE7E2]',
  };
  return (
    <button {...rest} className={`rounded-xl px-4 py-2 text-[14px] font-semibold transition disabled:opacity-40 ${tones[tone]}`}>
      {children}
    </button>
  );
}
