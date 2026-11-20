import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validEmail, validPassword } from './auth-rules.ts';

test('email', () => {
  assert.ok(validEmail(' a@b.pk '));
  assert.ok(!validEmail('a@b'));
  assert.ok(!validEmail('a b@c.com'));
});
test('password needs 8+ chars with a letter and a digit', () => {
  assert.ok(validPassword('shop12345'));
  assert.ok(!validPassword('short1a'));
  assert.ok(!validPassword('onlyletters'));
  assert.ok(!validPassword('12345678'));
  assert.ok(!validPassword('a1'.repeat(40)));
});
