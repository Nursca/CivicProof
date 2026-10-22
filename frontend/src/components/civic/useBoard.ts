"use client";
import { useCallback, useEffect, useState } from 'react';
import { Cl } from '@stacks/transactions';
import { useAtomValue } from 'jotai';
import {
  useCivicProof_GetBlockHeight,
  useCivicProof_GetIssueCount,
  useCivicProof_GetIssuesPage,
  useCivicProof_GetOwner,
  useCivicProof_IsSteward,
} from '@/generated/hooks';
import { addressAtom } from '@/store/wallet';
import {
  CONTRACT_ID,
  PAGE_SIZE,
  isValidPrincipal,
  parseIssuesPage,
  parseUint,
  parseBool,
  unwrapOk,
  type Issue,
} from '@/lib/civic';

/** Loads every report on the board (20 per read-only call) plus the viewer's role. */
export function useBoard() {
  const address = useAtomValue(addressAtom);
  const countHook = useCivicProof_GetIssueCount();
  const pageHook = useCivicProof_GetIssuesPage();
  const heightHook = useCivicProof_GetBlockHeight();
  const ownerHook = useCivicProof_GetOwner();
  const stewardHook = useCivicProof_IsSteward();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [isSteward, setIsSteward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { call: getCount } = countHook;
  const { call: getPage } = pageHook;
  const { call: getHeight } = heightHook;
  const { call: getOwner } = ownerHook;
  const { call: checkSteward } = stewardHook;

  const refresh = useCallback(async () => {
    if (!CONTRACT_ID) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [countRaw, heightRaw, ownerRaw] = await Promise.all([getCount([]), getHeight([]), getOwner([])]);
      const count = parseUint(countRaw) ?? 0;
      setBlockHeight(parseUint(heightRaw));
      setOwner((unwrapOk<string>(ownerRaw) as string | null) ?? null);

      const starts: number[] = [];
      for (let s = 1; s <= count; s += PAGE_SIZE) starts.push(s);
      const pages = await Promise.all(starts.map(s => getPage([Cl.uint(s)])));
      setIssues(pages.flatMap(parseIssuesPage).sort((a, b) => b.id - a.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [getCount, getHeight, getOwner, getPage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!CONTRACT_ID || !isValidPrincipal(address)) {
      setIsSteward(false);
      return;
    }
    checkSteward([Cl.principal(address)])
      .then(raw => setIsSteward(parseBool(raw)))
      .catch(() => setIsSteward(false));
  }, [address, checkSteward]);

  return {
    address: isValidPrincipal(address) ? address : null,
    issues,
    blockHeight,
    owner,
    isOwner: Boolean(address && owner && address === owner),
    isSteward,
    loading,
    error,
    refresh,
  };
}

export type Board = ReturnType<typeof useBoard>;
