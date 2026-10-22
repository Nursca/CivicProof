import DebugContracts from '@/components/debug/DebugContracts';

export const metadata = { title: 'CivicProof · Contract debug' };

export default function DebugPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-instrument text-[28px] font-semibold text-[#1B1A17]">Contract debug</h1>
        <p className="mt-1 text-[14px] text-[#6B685F]">Raw generated forms for every civic-proof function.</p>
        <div className="mt-6 rounded-[22px] bg-[#131416] p-4 text-white">
          <DebugContracts />
        </div>
      </div>
    </main>
  );
}
