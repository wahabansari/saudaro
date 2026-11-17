import { describe, expect, it } from 'vitest';
import { PERMISSIONS, permissionsFor, SYSTEM_ROLES } from '../src/index.ts';

const ALL = PERMISSIONS.map((p) => p.key);

describe('permission catalog', () => {
  it('has 23 unique dotted keys', () => {
    expect(ALL).toHaveLength(23);
    expect(new Set(ALL).size).toBe(23);
    expect(ALL.every((k) => /^[a-z_]+(\.[a-z_]+)+$/.test(k))).toBe(true);
  });
});

describe('permissionsFor', () => {
  it('gives the owner every permission', () => {
    expect(permissionsFor('owner')).toEqual(ALL);
  });

  it('gives the admin everything except company.manage', () => {
    expect(permissionsFor('admin')).toEqual(ALL.filter((k) => k !== 'company.manage'));
  });

  it('keeps team, settings and audit permissions away from the manager', () => {
    const manager = permissionsFor('manager');
    for (const k of [
      'company.manage',
      'members.manage',
      'roles.manage',
      'invitations.manage',
      'settings.manage',
      'audit.read',
    ])
      expect(manager).not.toContain(k);
    expect(manager).toHaveLength(ALL.length - 6);
  });

  it('gives the member exactly five permissions', () => {
    expect(permissionsFor('member')).toEqual([
      'files.manage',
      'catalog.manage',
      'rfq.create',
      'quotation.create',
      'messages.send',
    ]);
  });

  it('gives the viewer none, and an unknown role none', () => {
    expect(permissionsFor('viewer')).toEqual([]);
    expect(permissionsFor('nope')).toEqual([]);
  });

  it('orders role levels strictly descending', () => {
    const levels = SYSTEM_ROLES.map((r) => r.level);
    expect(levels).toEqual([100, 80, 60, 40, 20]);
  });
});
