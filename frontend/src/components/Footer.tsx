import React from 'react'
import Link from 'next/link'

function Footer() {
    return (
    <footer className="border-t border-[#E4DFD3] bg-[#F4F1E8]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[12px] text-[#6B685F] sm:flex-row sm:items-center sm:justify-between">
        <p>
          CivicProof records reports and status changes on Stacks. It is a public log, not verification — always
          contact the responsible service for emergencies.
        </p>
        <Link href="/debug" className="font-mono text-[11px] underline decoration-dotted">contract debug</Link>
      </div>
    </footer>
    );
  }

export default Footer
