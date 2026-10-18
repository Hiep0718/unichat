import { describe, expect, it } from 'vitest';

import { loginPathFor, safeReturnTo, withReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it('should keep an in-app path so the visitor resumes where they were going', () => {
    expect(safeReturnTo('/invite/abc123')).toBe('/invite/abc123');
    expect(safeReturnTo('/workspaces/42/settings?tab=access')).toBe(
      '/workspaces/42/settings?tab=access',
    );
  });

  it('should fall back to the default when nothing was asked for', () => {
    expect(safeReturnTo(null)).toBe('/workspaces');
    expect(safeReturnTo('')).toBe('/workspaces');
    expect(safeReturnTo(undefined)).toBe('/workspaces');
  });

  it('should refuse an absolute URL', () => {
    // An open redirect turns a link to our own domain into a way of landing
    // the victim on an attacker's login page.
    expect(safeReturnTo('https://evil.example/login')).toBe('/workspaces');
    expect(safeReturnTo('http://evil.example')).toBe('/workspaces');
  });

  it('should refuse a protocol-relative host', () => {
    // `//evil.example` is a URL, not a path: the browser keeps the scheme and
    // changes the host.
    expect(safeReturnTo('//evil.example/phish')).toBe('/workspaces');
  });

  it('should refuse the backslash form some browsers normalise into //', () => {
    expect(safeReturnTo('/\\evil.example')).toBe('/workspaces');
  });
});

describe('loginPathFor', () => {
  it('should carry the destination so signing in resumes it', () => {
    expect(loginPathFor('/invite/abc123')).toBe('/login?redirect=%2Finvite%2Fabc123');
  });

  it('should stay bare when the destination is the default anyway', () => {
    expect(loginPathFor('/workspaces')).toBe('/login');
  });

  it('should not carry a destination it would refuse to honour', () => {
    expect(loginPathFor('https://evil.example')).toBe('/login');
  });
});

describe('withReturnTo', () => {
  it('should pass the destination on to another auth screen', () => {
    expect(withReturnTo('/register', '/invite/abc')).toBe('/register?redirect=%2Finvite%2Fabc');
  });

  it('should leave the path alone when there is nothing to carry', () => {
    expect(withReturnTo('/register', null)).toBe('/register');
  });
});
