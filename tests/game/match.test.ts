import { expect, it } from 'vitest';
import { Match } from '../../src/match.js';
it('awards an overlapping clear once, to the first valid command', () => {
  const match = new Match([4, 6, 4, 6], ['a', 'b'], 0, 2);
  const clear = { type: 'clear', id: 1, top: 0, left: 0, bottom: 1, right: 2, fruit: [0, 1] };
  expect(match.command('a', clear, 1).ok).toBe(true);
  expect(match.command('b', clear, 2).ok).toBe(false);
  expect(match.command('a', clear, 3).ok).toBe(false);
  expect(match.players.a.score).toBe(2);
  expect(match.players.b.score).toBe(0);
  expect(match.board).toEqual([0, 0, 4, 6]);
});

it('rejects deadline clears, ends on an empty board, and preserves ties', () => {
  const clear = { type: 'clear', id: 1, top: 0, left: 0, bottom: 1, right: 2, fruit: [0, 1] };
  const expired = new Match([4, 6], ['a', 'b'], 0, 2);
  expect(expired.command('a', clear, 120000).ok).toBe(false);
  expect(expired.phase).toBe('finished');
  expect(expired.players.a.score).toBe(expired.players.b.score);
  const empty = new Match([4, 6], ['a', 'b'], 0, 2);
  expect(empty.command('a', clear, 1).ok).toBe(true);
  expect(empty.phase).toBe('finished');
  expect(empty.players.a.score).toBe(2);
});

it('accounts for delayed pause-expiry ticks and ignores malformed selections', () => {
  const match = new Match([4, 6, 4, 6], ['a', 'b'], 0, 2);
  match.command('a', { type: 'pause', id: 1 }, 1000);
  match.tick(32000);
  expect(match.remainingMs).toBe(118000);
  expect(match.phase).toBe('playing');
  for (const [i, value] of [null, {}, { type: 'clear', top: -1 }, { type: 'clear', left: NaN }].entries()) {
    expect(match.command('a', { ...value, id: i + 2 }, 32000).ok).toBe(false);
  }
  expect(match.board).toEqual([4, 6, 4, 6]);
  expect(match.players.a.score).toBe(0);
});

it('accepts a stale submission when its intended fruit is unchanged', () => {
  const match = new Match([4, 6, 4, 6], ['a', 'b'], 0, 2);
  match.command('a', { type: 'clear', id: 1, top: 0, left: 0, bottom: 1, right: 2, fruit: [0, 1] }, 1);
  expect(match.command('b', { type: 'clear', id: 1, top: 1, left: 0, bottom: 2, right: 2, fruit: [2, 3] }, 2).ok).toBe(true);
  expect(match.phase).toBe('finished');
  expect(match.players.a.score).toBe(2);
  expect(match.players.b.score).toBe(2);
});

it('ignores repeat pauses and rejects clears while paused without ending a no-moves board', () => {
  const match = new Match([4, 6], ['a', 'b'], 0, 2);
  match.command('a', { type: 'pause', id: 1 }, 1);
  expect(match.command('b', { type: 'pause', id: 1 }, 2).ok).toBe(false);
  expect(match.players.b.pauses).toBe(2);
  expect(match.command('b', { type: 'clear', id: 2, top: 0, left: 0, bottom: 1, right: 2, fruit: [0, 1] }, 3).ok).toBe(false);
  expect(match.board).toEqual([4, 6]);
  const blocked = new Match([9, 9], ['a', 'b'], 0, 2);
  blocked.tick(119999);
  expect(blocked.phase).toBe('playing');
  blocked.tick(120000);
  expect(blocked.phase).toBe('finished');
});
it('freezes active time during pause and resumes after 30 seconds or both ready', () => {
  const match = new Match([4, 6], ['a', 'b'], 0, 2);
  expect(match.command('a', { type: 'pause', id: 1 }, 1000).ok).toBe(true);
  expect(match.phase).toBe('paused');
  match.command('a', { type: 'pause', id: 2 }, 2000);
  expect(match.players.a.pauses).toBe(1);
  match.tick(31000);
  expect(match.phase).toBe('playing');
  expect(match.remainingMs).toBe(119000);
  match.command('a', { type: 'pause', id: 3 }, 32000);
  match.command('a', { type: 'resume', id: 4 }, 33000);
  match.command('b', { type: 'resume', id: 1 }, 34000);
  expect(match.phase).toBe('playing');
  expect(match.remainingMs).toBe(118000);
  expect(match.command('a', { type: 'pause', id: 5 }, 35000).ok).toBe(false);
});
