import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineTotal, rs, totals } from './money.ts';

test('rs groups in lakhs', () => {
  assert.equal(rs(145000), 'Rs 1,450');
  assert.equal(rs(18450000), 'Rs 1,84,500');
  assert.equal(rs(5000), 'Rs 50');
  assert.equal(rs(0), 'Rs 0');
  assert.equal(rs(-12000), '-Rs 120');
});

test('line total rounds once, like the database check', () => {
  assert.equal(lineTotal({ qty: 0.75, price: 15500 }), 11625);
  assert.equal(lineTotal({ qty: 2, price: 54000 }), 108000);
});

test('totals: amount and percent discounts, capped at the subtotal', () => {
  const lines = [{ qty: 1, price: 145000 }, { qty: 2, price: 54000 }, { qty: 1, price: 15500 }];
  assert.equal(totals(lines, 0).total, 268500);
  assert.equal(totals(lines, 10000).total, 258500);
  assert.equal(totals(lines, { pct: 5 }).discount, 13425);
  assert.equal(totals(lines, 99999999).total, 0);
  assert.equal(totals(lines, -5).discount, 0);
  assert.equal(totals(lines, 0).count, 4);
});
