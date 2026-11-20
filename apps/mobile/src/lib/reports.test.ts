import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aging, buckets, pct, range, totalsBy, within } from './reports.ts';

const DAY = 86_400_000;
const at = (s: string) => new Date(s).getTime();

test('periods: day, Monday-start week, calendar month, and going back', () => {
  const now = at('2026-11-20T15:00:00'); // a Friday
  assert.equal(range('day', 0, now).from, at('2026-11-20T00:00:00'));
  assert.equal(range('day', -1, now).to, at('2026-11-20T00:00:00'));
  assert.equal(range('week', 0, now).from, at('2026-11-16T00:00:00'));
  assert.equal(range('week', 0, now).to, at('2026-11-23T00:00:00'));
  assert.equal(range('month', 0, now).from, at('2026-11-01T00:00:00'));
  assert.equal(range('month', -1, now).from, at('2026-10-01T00:00:00'));
  assert.equal(range('month', -1, now).to, at('2026-11-01T00:00:00'));
  assert.ok(within(now, range('week', 0, now)));
});

test('buckets cover the period', () => {
  const m = range('month', 0, at('2026-02-10T12:00:00'));
  assert.equal(buckets('month', m.from, m.to).length, 28);
  const d = range('day', 0, at('2026-02-10T12:00:00'));
  assert.equal(buckets('day', d.from, d.to).length, 8);
});

test('khata aging settles the oldest credit first', () => {
  const now = at('2026-11-20T12:00:00');
  const e = [
    { at: now - 100 * DAY, amount: 5000 }, // fully paid by the payment below
    { at: now - 45 * DAY, amount: 3000 },  // 1000 paid, 2000 left
    { at: now - 5 * DAY, amount: 1000 },
    { at: now - 2 * DAY, amount: -6000 },
  ];
  assert.deepEqual(aging(e, now), { d30: 1000, d60: 2000, d90: 0, older: 0 });
  assert.deepEqual(aging([{ at: now - 200 * DAY, amount: 700 }], now), { d30: 0, d60: 0, d90: 0, older: 700 });
});

test('grouping and percent', () => {
  assert.deepEqual(totalsBy([{ k: 'a', v: 1 }, { k: 'b', v: 5 }, { k: 'a', v: 2 }], (x) => x.k, (x) => x.v), [['b', 5], ['a', 3]]);
  assert.equal(pct(25, 100), 25);
  assert.equal(pct(5, 0), 0);
});
