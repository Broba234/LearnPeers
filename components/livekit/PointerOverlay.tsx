'use client';

import React from 'react';
import { getColorForIdentity } from './utils';

interface PointerOverlayProps {
  excalidrawRef: React.MutableRefObject<any | null>;
  pointers: Record<string, { x: number; y: number; updatedAt: number }>;
}

export function PointerOverlay({ excalidrawRef, pointers }: PointerOverlayProps) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 50);
    return () => window.clearInterval(id);
  }, []);

  const api = excalidrawRef.current;
  const appState = api?.getAppState?.();
  if (!appState) return null;

  const scrollX = appState.scrollX ?? 0;
  const scrollY = appState.scrollY ?? 0;
  const zoomValue =
    typeof appState.zoom === 'number'
      ? appState.zoom
      : appState.zoom?.value ?? 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {Object.entries(pointers).map(([identity, pointer]) => {
        // Hide stale pointers
        if (now - pointer.updatedAt > 5000) return null;

        const screenX = (pointer.x + scrollX) * zoomValue;
        const screenY = (pointer.y + scrollY) * zoomValue;
        const color = getColorForIdentity(identity);

        return (
          <div
            key={identity}
            className="absolute"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full border-2 bg-white shadow"
              style={{ borderColor: color }}
            />
            <div className="mt-1 px-1.5 py-0.5 rounded text-[10px] leading-none bg-black/70 text-white whitespace-nowrap">
              {identity}
            </div>
          </div>
        );
      })}
    </div>
  );
}
