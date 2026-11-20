import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adjustStock, balance, cashExpected, keypad, reorderQty, running, signed, weighPrice } from './books.ts';

test('khata signs follow the shopkeeper view', () => {
  assert.equal(signed('customer', 'gave', 500), 500);
  assert.equal(signed('customer', 'got', 500), -500);
  assert.equal(signed('supplier', 'got', 500), 500);
  assert.equal(signed('supplier', 'gave', 500), -500);
  assert.equal(signed('customer', 'got', -500), -500, 'sign comes from the direction, not the input');
});

test('balance and running rows', () => {
  const es = [{ id: 'b', at: 2, note: 'paid', amount: -300 }, { id: 'a', at: 1, note: 'sale', amount: 1000 }];
  assert.equal(balance(es), 700);
  assert.deepEqual(running(es).map((r) => r.bal), [1000, 700]);
});

test('stock adjustment logs the difference', () => {
  assert.deepEqual(adjustStock(10, 'add', 5), { after: 15, delta: 5 });
  assert.deepEqual(adjustStock(10, 'rem', 3), { after: 7, delta: -3 });
  assert.deepEqual(adjustStock(10, 'set', 4), { after: 4, delta: -6 });
});

test('weigh, reorder, cash and keypad', () => {
  assert.equal(weighPrice(15500, 250), 3875);
  assert.equal(reorderQty(12, 25), 38);
  assert.equal(reorderQty(80, 25), 0);
  assert.equal(cashExpected({ opening: 500000, cashSales: 2842000, received: 900000, expenses: 520000, supplierPaid: 1600000 }), 2122000);
  assert.equal(keypad('', '0'), '');
  assert.equal(keypad('14', '5'), '145');
  assert.equal(keypad('145', 'del'), '14');
  assert.equal(keypad('1234567', '8'), '1234567');
});
