// Domain helpers for the civic-proof contract: constants mirrored from the
// Clarity source plus parsers for the generated read-only hook results.

import deployments from '@/generated/deployments.json';
import { scaffoldConfig } from '@/scaffold.config';

export const CONTRACT_NAME = 'civic-proof';

export const CONTRACT_ID: string | undefined = (
  deployments as { contracts?: Record<string, { contract_id?: string }> }
).contracts?.[CONTRACT_NAME]?.contract_id;

export const LIMITS = { title: 80, description: 500, location: 120, note: 200 } as const;
export const PAGE_SIZE = 20;
export const MAX_UPDATES = 20;

export type Status = 0 | 1 | 2;

export const STATUS: Record<Status, { label: string; tone: string; dot: string; blurb: string }> = {
  0: {
    label: 'Open',
    tone: 'bg-[#FDE7E2] text-[#B23A1E] ring-[#F5C2B5]',
    dot: 'bg-[#E0532F]',
    blurb: 'Reported, awaiting acknowledgement',
  },
  1: {
    label: 'Acknowledged',
    tone: 'bg-[#FFF3CC] text-[#8A6100] ring-[#F2D785]',
    dot: 'bg-[#E6A400]',
    blurb: 'A steward has seen it',
  },
  2: {
    label: 'Resolved',
    tone: 'bg-[#DDF3E4] text-[#1D6B3A] ring-[#B4E0C2]',
    dot: 'bg-[#2E9E57]',
    blurb: 'Marked fixed on the record',
  },
};

export const CATEGORIES = [
  { id: 1, label: 'Streetlight', hint: 'Lights out, flickering, damaged poles' },
  { id: 2, label: 'Road', hint: 'Potholes, cracks, missing signs' },
  { id: 3, label: 'Waste', hint: 'Overflowing bins, illegal dumping' },
  { id: 4, label: 'Water', hint: 'No supply, leaks, contamination' },
  { id: 5, label: 'Other', hint: 'Anything else affecting the community' },
] as const;

export function categoryLabel(id: number) {
  return CATEGORIES.find(c => c.id === id)?.label ?? 'Other';
}

export type Issue = {
  id: number;
  reporter: string;
  title: string;
  description: string;
  location: string;
  category: number;
  status: Status;
  confirmations: number;
  createdAt: number;
  updatedAt: number;
  updateCount: number;
};

export type IssueUpdate = {
  status: Status;
  actor: string;
  note: string;
  block: number;
};

type Response<T> = { ok: boolean; value: T };

function isResponse<T>(raw: unknown): raw is Response<T> {
  return typeof raw === 'object' && raw !== null && 'ok' in raw && 'value' in raw;
}

/** Unwrap a `{ ok: true, value }` read-only result, or null on err/missing. */
export function unwrapOk<T>(raw: unknown): T | null {
  if (!isResponse<T>(raw) || !raw.ok) return null;
  return raw.value;
}

const num = (v: unknown) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));

export function parseIssue(id: unknown, raw: Record<string, unknown>): Issue {
  return {
    id: num(id),
    reporter: String(raw.reporter),
    title: String(raw.title),
    description: String(raw.description),
    location: String(raw.location),
    category: num(raw.category),
    status: num(raw.status) as Status,
    confirmations: num(raw.confirmations),
    createdAt: num(raw['created-at']),
    updatedAt: num(raw['updated-at']),
    updateCount: num(raw['update-count']),
  };
}

export function parseIssuesPage(raw: unknown): Issue[] {
  const rows = unwrapOk<Array<{ id: unknown; issue: Record<string, unknown> }>>(raw) ?? [];
  return rows.map(row => parseIssue(row.id, row.issue));
}

export function parseHistory(raw: unknown): IssueUpdate[] {
  const rows = unwrapOk<Array<Record<string, unknown>>>(raw) ?? [];
  return rows.map(r => ({
    status: num(r.status) as Status,
    actor: String(r.actor),
    note: String(r.note),
    block: num(r.block),
  }));
}

export function parseUint(raw: unknown): number | null {
  const v = unwrapOk<unknown>(raw);
  return typeof v === 'bigint' ? Number(v) : null;
}

export function parseBool(raw: unknown): boolean {
  return unwrapOk<unknown>(raw) === true;
}

export function shortAddr(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 5)}…${addr.slice(-4)}` : addr;
}

export function isValidPrincipal(addr: string | null | undefined): addr is string {
  return typeof addr === 'string' && /^(ST|SP)[0-9A-HJ-NP-Z]{38,41}$/.test(addr);
}

const chain = scaffoldConfig.isMainnet ? 'mainnet' : 'testnet';

export const explorer = {
  address: (a: string) => `https://explorer.hiro.so/address/${a}?chain=${chain}`,
  block: (h: number) => `https://explorer.hiro.so/block/${h}?chain=${chain}`,
  contract: (id: string) => `https://explorer.hiro.so/txid/${id}?chain=${chain}`,
};

/** Human-readable messages for the contract's error codes. */
const ERRORS: Record<string, string> = {
  u400: 'Pick a valid category.',
  u401: 'Your address is not allowed to do that.',
  u402: 'Title cannot be empty.',
  u403: 'Location cannot be empty.',
  u404: 'Report not found.',
  u409: 'That status change is not allowed from the current status.',
  u410: 'You already confirmed this report.',
  u411: 'You cannot confirm your own report.',
  u412: 'This report has reached its 20-update history limit.',
};

export function explainTxError(repr: string | null | undefined) {
  if (!repr) return 'Transaction failed.';
  const code = repr.match(/u\d+/)?.[0];
  return (code && ERRORS[code]) || repr;
}

/** Approximate "N ago" from a block delta. Post-Nakamoto Stacks blocks are a few seconds apart, so this stays rough. */
export function blocksAgo(current: number | null, block: number) {
  if (!current || current < block) return `block ${block.toLocaleString()}`;
  const d = current - block;
  if (d === 0) return 'this block';
  return `${d.toLocaleString()} block${d === 1 ? '' : 's'} ago`;
}
