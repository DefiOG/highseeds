import { describe, expect, it } from 'vitest';
import { farmPanelForPath } from './farmNavigation';

describe('legacy player bookmarks', () => {
  it('opens the farm for overview and unknown links', () => {
    for (const path of ['/', '/farm', '/overview', '/unknown']) expect(farmPanelForPath(path)).toBeNull();
  });
  it('keeps essential bookmarked tools accessible inside the farm', () => {
    expect(farmPanelForPath('/plant/42')).toBe('bed');
    expect(farmPanelForPath('/positions/crop-1')).toBe('bed');
    expect(farmPanelForPath('/access')).toBe('vault');
    expect(farmPanelForPath('/contracts')).toBe('market');
    expect(farmPanelForPath('/land')).toBe('expansion');
    expect(farmPanelForPath('/practice')).toBe('help');
  });
});
