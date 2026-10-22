import React from 'react'
import { scaffoldConfig } from '../scaffold.config';

function NetworkBadge() {
    const network = scaffoldConfig.network;
    return (
      <span className="hidden sm:inline rounded-full bg-[#EFEBE0] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#6B685F]">
        {network}
      </span>
    );
  }

export default NetworkBadge
