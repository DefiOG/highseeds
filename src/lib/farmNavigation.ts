/** Old bookmarks stay useful without exposing the legacy dashboard. */
export function farmPanelForPath(path: string): 'bed' | 'vault' | 'market' | 'expansion' | 'journal' | 'help' | null {
  if (/^\/(plant|positions|work)(\/|$)/.test(path)) return 'bed';
  if (/^\/(access|gallery|mint)(\/|$)/.test(path)) return 'vault';
  if (path === '/contracts') return 'market';
  if (path === '/land') return 'expansion';
  if (path === '/crew') return 'journal';
  if (path === '/practice') return 'help';
  return null;
}
