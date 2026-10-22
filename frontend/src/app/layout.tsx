import type { ReactNode } from 'react';
import './globals.css';
import { WalletProvider } from '../components/WalletConnect';
import Header from '../components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'CivicProof — public community problem board',
  description:
    'Report broken streetlights, damaged roads, waste and water issues, and track whether they are acknowledged or resolved — with a tamper-resistant record on Stacks.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-[#FBF9F4]">
      <body className="bg-[#FBF9F4] text-[#1B1A17] font-instrument antialiased">
        <WalletProvider>
          <Header />
          {children}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
