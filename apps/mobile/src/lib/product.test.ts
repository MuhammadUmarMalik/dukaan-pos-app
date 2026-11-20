import assert from 'node:assert/strict';
import { test } from 'node:test';
import { margin, paisaText, parsePaisa, parseQty, sameCode, validateDraft, type Draft } from './product.ts';

test('parsePaisa reads rupees the way shopkeepers type them', () => {
  assert.equal(parsePaisa('1450'), 145000);
  assert.equal(parsePaisa('1,450'), 145000);
  assert.equal(parsePaisa('Rs 90'), 9000);
  assert.equal(parsePaisa('12.5'), 1250);
  assert.equal(parsePaisa('12.55'), 1255);
  assert.equal(parsePaisa('0'), 0);
  for (const bad of ['', 'abc', '12.555', '-5', '1.2.3', '1e3']) assert.equal(parsePaisa(bad), null, bad);
});

test('paisaText round-trips', () => {
  assert.equal(paisaText(145000), '1450');
  assert.equal(paisaText(1255), '12.55');
  assert.equal(parsePaisa(paisaText(1255)), 1255);
});

test('parseQty allows 3 decimals and treats empty as zero', () => {
  assert.equal(parseQty(''), 0);
  assert.equal(parseQty('2.5'), 2.5);
  assert.equal(parseQty('0.125'), 0.125);
  assert.equal(parseQty('1.2345'), null);
  assert.equal(parseQty('-1'), null);
});

test('margin', () => {
  assert.deepEqual(margin(132000, 145000), { amount: 13000, pct: 9 });
  assert.deepEqual(margin(100, 0), { amount: -100, pct: 0 });
});

test('sameCode treats UPC-A and EAN-13 forms as one code', () => {
  assert.ok(sameCode('012345678905', '0012345678905'));
  assert.ok(sameCode('0036000291452', '036000291452'));
  assert.ok(sameCode(' 8961001000011 ', '8961001000011'));
  assert.ok(!sameCode('8961001000011', '8961001000012'));
  assert.ok(!sameCode('0123', '123'));
});

const ok: Draft = { name: 'Atta 10kg', unit: 'bag', cost: '1320', price: '1450', stock: '24', min: '15', expiry: '2027-05-01', barcode: '8961001000011' };
const none = () => undefined;

test('validateDraft accepts a good draft and an empty optional set', () => {
  assert.deepEqual(validateDraft(ok, none, true), {});
  assert.deepEqual(validateDraft({ ...ok, cost: '', stock: '', min: '', expiry: '', barcode: '' }, none, true), {});
});

test('validateDraft reports each problem by field', () => {
  const e = validateDraft({ ...ok, name: ' ', price: '', cost: 'x', stock: '1.2345', min: '-1', expiry: '2027-02-30', barcode: 'ab' }, none, true);
  assert.deepEqual(e, { name: 'required', price: 'required', cost: 'invalid', stock: 'invalid', min: 'invalid', expiry: 'invalid', barcode: 'invalid' });
});

test('validateDraft flags a barcode used by another product, and skips expiry when it is off', () => {
  assert.equal(validateDraft(ok, () => 'Sugar', true).barcode, 'duplicate');
  assert.equal(validateDraft({ ...ok, expiry: 'garbage' }, none, false).expiry, undefined);
});
