import React from 'react'
import Link from 'next/link'
import { WalletConnect } from './WalletConnect'
import NetworkBadge from './NetworkBadge'

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E4DFD3] bg-[#FBF9F4]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B1A17] text-[#FFD23F]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
              <path d="m8.5 12 2.5 2.5 4.5-5" />
            </svg>
          </span>
          <span className="font-instrument text-[20px] font-semibold tracking-tight text-[#1B1A17]">CivicProof</span>
          <NetworkBadge />
        </Link>
        <WalletConnect />
      </div>
    </header>
  )
}

export default Header
