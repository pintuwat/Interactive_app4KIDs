// Bubble Pop: hear a sound, pop the bubble with the matching letter. Bubbles float forever until the right one is popped.
import { Game, ROUNDS } from './game-base.js';
import { h, pick, shuffle } from '../util.js';
import { gameLetters, distractorLetters } from './pools.js';

export default class BubblePop extends Game {
  static meta = { id: 'bubble-pop', title: 'Bubble Pop', icon: '💭', promptKey: 'game_bubble', color: '#c9bdf9', hint: 'Pop the right bubble.' };

  buildRounds() {
    const letters = gameLetters();
    const order = shuffle(letters);
    const out = [];
    for (let i = 0; i < ROUNDS; i++) {
      const l = order[i % order.length];
      out.push({ letter: l, others: distractorLetters(l, letters, 4) });
    }
    return out;
  }

  renderRound(round, area) {
    const say = () => this.audio.sound(round.letter);
    const sky = h('div', { class: 'sky' });
    this.sky = sky;
    this.round = round;
    this.spawned = 0;
    area.append(this.replayButton(say), sky);
    this.later(say, 300);
    // Start with the target plus a few others so there is always something to pop.
    this.spawn(true);
    for (let i = 0; i < 3; i++) this.later(() => this.spawn(false), 500 + i * 900);
  }

  spawn(forceTarget) {
    if (!this.alive || this.locked || !this.sky?.isConnected) return;
    const round = this.round;
    const live = [...this.sky.querySelectorAll('.bubble:not(.popped)')];
    const hasTarget = live.some((b) => b.dataset.id === round.letter.id);
    const isTarget = forceTarget || !hasTarget || Math.random() < 0.28;
    const l = isTarget ? round.letter : pick(round.others);
    const w = this.sky.clientWidth || 600;
    const left = 10 + Math.random() * Math.max(10, w - 130);
    const dur = 7 + Math.random() * 3;
    const b = h('button', { class: 'bubble', type: 'button', 'aria-label': `Bubble ${l.lower}`, dataset: { id: l.id },
      style: { left: left + 'px', bottom: '-120px', animationDuration: dur + 's', '--rise': (this.sky.clientHeight || 340) + 'px' },
      onclick: () => this.pop(b, l) }, l.lower);
    b.addEventListener('animationend', (e) => {
      if (e.animationName !== 'floatUp') return;
      b.remove();
      this.spawn(false);
    });
    this.sky.append(b);
  }

  pop(b, l) {
    if (this.locked) return;
    this.sfx.pop();
    this.audio.sound(l);
    if (l.id === this.round.letter.id) {
      b.classList.add('popped', 'good');
      this.hit(b);
    } else {
      b.classList.add('popped');
      setTimeout(() => b.remove(), 250);
      this.later(() => this.spawn(false), 600);
      this.miss();
    }
  }

  onResult(round, r) { this.save('letter', round.letter.id, r); }

  reveal(round) {
    const t = [...this.sky.querySelectorAll('.bubble')].find((b) => b.dataset.id === round.letter.id);
    if (t) { t.style.outline = '6px solid #ffc93c'; t.classList.add('pulse'); }
    this.audio.sound(round.letter);
  }
}
