// Pure helpers extracted from LiveKitRoom.

// Inlined from @excalidraw/excalidraw to avoid a static import that pulls in
// browser-fs-access at module-evaluation time and crashes with file.split errors.
export const getSceneVersion = (elements: any[]): number =>
  elements.reduce((acc: number, el: any) => acc + (el.version ?? 0), 0);

export function mergeWithRemoteElements(localElements: any[], remoteElements: any[]): any[] {
  const elementsMap = new Map<string, any>();

  for (const el of localElements) {
    if (el?.id) elementsMap.set(el.id, el);
  }

  for (const el of remoteElements) {
    if (!el?.id) continue;
    const existing = elementsMap.get(el.id);
    if (!existing || (el.version ?? 0) >= (existing.version ?? 0)) {
      elementsMap.set(el.id, el);
    }
  }

  return Array.from(elementsMap.values());
}

export function getColorForIdentity(identity: string): string {
  const colors = ['#f97316', '#22c55e', '#3b82f6', '#e11d48', '#a855f7', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < identity.length; i += 1) {
    hash = (hash * 31 + identity.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
