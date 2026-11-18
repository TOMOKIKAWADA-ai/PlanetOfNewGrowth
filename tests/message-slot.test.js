import test from 'node:test';
import assert from 'node:assert/strict';
import { MessagePriority, MessageSlot } from '../src/message-slot.js';

// A19 画面中央のメッセージの優先度: 大事な説明は普通のメッセージで上書きされず、警告で途切れたら後で出し直す。
const { normal, important, warning } = MessagePriority;

test('a normal line does not replace an important explanation that is still showing', () => {
  const slot = new MessageSlot();
  assert.equal(slot.offer('渇きの母が卵を吸っている', 3.2, important), true);
  assert.equal(slot.offer('水中の卵は魚形態で駆除できます', 1.2, normal), false);
  assert.equal(slot.current.text, '渇きの母が卵を吸っている');
  slot.update(3.3);
  assert.equal(slot.offer('MP不足', 1.25, normal), true);
});

test('the stun message survives a level-up title', () => {
  const slot = new MessageSlot();
  slot.offer('擬態卵！ 動けない', 1.5, warning);
  assert.equal(slot.offer('攻撃速度', 1.25, normal), false);
  assert.equal(slot.offer('足跡が孵った', 3.6, important), false);
  assert.equal(slot.current.text, '擬態卵！ 動けない');
});

test('a warning interrupts an explanation, which comes back for the time it had left', () => {
  const slot = new MessageSlot();
  slot.offer('手が孵った', 3.6, important);
  slot.update(1);
  assert.equal(slot.offer('WARNING 衝撃波', 1, warning), true);
  assert.equal(slot.update(0.5), null);
  const resumed = slot.update(0.6);
  assert.equal(resumed.text, '手が孵った');
  assert.ok(Math.abs(resumed.remaining - 2.6) < 1e-9);
  assert.equal(slot.update(2.7), null);
  assert.equal(slot.current, null);
});

test('an explanation that was almost over is not brought back', () => {
  const slot = new MessageSlot({ resumeMinSeconds: 0.8 });
  slot.offer('割れ殻が孵った', 3.6, important);
  slot.update(3.0);
  slot.offer('WARNING', 1, warning);
  assert.equal(slot.update(1.1), null);
  assert.equal(slot.remaining, 0);
});

test('lines of the same priority replace each other, normal lines never get stashed', () => {
  const slot = new MessageSlot();
  slot.offer('噛みついた 1/3', 0.9, normal);
  slot.offer('MP不足', 1.25, normal);
  assert.equal(slot.current.text, 'MP不足');
  slot.offer('WARNING', 1, warning);
  assert.equal(slot.update(1.1), null);
  slot.offer('鳴きが孵った', 3.6, important);
  assert.equal(slot.offer('吸水根が孵った', 3.6, important), true);
  assert.equal(slot.current.text, '吸水根が孵った');
});

test('with priorities off, the latest line always wins (the old behaviour)', () => {
  const slot = new MessageSlot({ enabled: false });
  slot.offer('擬態卵！ 動けない', 1.5, warning);
  assert.equal(slot.offer('攻撃速度', 1.25, normal), true);
  assert.equal(slot.current.text, '攻撃速度');
  assert.equal(slot.update(2), null);
});
