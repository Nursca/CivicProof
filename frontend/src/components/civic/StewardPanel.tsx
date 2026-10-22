"use client";
import { useState } from 'react';
import { Cl } from '@stacks/transactions';
import { useCivicProof_SetSteward } from '@/generated/hooks';
import { isValidPrincipal } from '@/lib/civic';
import { TxNotice } from './ui';

/** Owner-only: grant or revoke steward rights (who may acknowledge reports). */
export function StewardPanel() {
  const setSteward = useCivicProof_SetSteward();
  const [who, setWho] = useState('');
  const addr = who.trim();
  const valid = isValidPrincipal(addr);
  const busy = setSteward.loading || setSteward.txStatus === 'pending';

  const submit = (enabled: boolean) => setSteward.call([Cl.principal(addr), Cl.bool(enabled)]).catch(() => {});

  return (
    <section className="rounded-[22px] border border-[#2E2C28] bg-[#1B1A17] p-5 text-[#F4F1E8]">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[#FFD23F] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1B1A17]">
          Owner
        </span>
        <h2 className="font-instrument text-[18px] font-semibold">Manage stewards</h2>
      </div>
      <p className="mt-1.5 text-[13px] text-[#BDB8AA]">
        Stewards (ward reps, community organisers, utility liaisons) can acknowledge reports. Every grant is public.
      </p>
      <input
        value={who}
        onChange={e => setWho(e.target.value)}
        placeholder="ST… address"
        className="mt-3 w-full rounded-xl border border-[#3A3833] bg-[#26241F] px-3 py-2 font-mono text-[13px] text-white outline-none placeholder:text-[#77736A] focus:border-[#FFD23F]"
      />
      <div className="mt-2 flex gap-2">
        <button
          disabled={!valid || busy}
          onClick={() => submit(true)}
          className="flex-1 rounded-xl bg-[#FFD23F] px-3 py-2 text-[13px] font-semibold text-[#1B1A17] disabled:opacity-40"
        >
          Grant
        </button>
        <button
          disabled={!valid || busy}
          onClick={() => submit(false)}
          className="flex-1 rounded-xl border border-[#3A3833] px-3 py-2 text-[13px] font-semibold text-[#F4F1E8] disabled:opacity-40"
        >
          Revoke
        </button>
      </div>
      {(setSteward.loading || setSteward.error || setSteward.txid) && (
        <div className="mt-3 text-[#1B1A17]">
          <TxNotice hook={setSteward} successLabel="Steward list updated." />
        </div>
      )}
    </section>
  );
}
