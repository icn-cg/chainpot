'use client';
import React, { useEffect, useState } from 'react';
import { type BrowserProvider } from 'ethers';

export default function ConnectHint({
  onProvider,
}: {
  onProvider(p: BrowserProvider | null): void;
}) {
  const [Comp, setComp] = useState<React.ComponentType<{
    onProvider(p: BrowserProvider | null): void;
  }> | null>(null);
  useEffect(() => {
    import('./ConnectBar').then((m) => setComp(() => m.default));
  }, []);
  return Comp ? <Comp onProvider={onProvider} /> : null;
}
