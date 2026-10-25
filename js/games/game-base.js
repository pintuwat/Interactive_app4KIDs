// Shared game interface. A game extends Game and implements:
//   static meta = { id, title, icon, promptKey, color, hint }
//   buildRounds()                -> array of round objects (5-8)
//   renderRound(round, area)     -> draw the round; call this.hit(el) / this.miss(el) on answers
//   reveal(round)                -> (optional) show the right answer after 2 wrong tries
// The base class handles: round loop, max 2 tries, positive feedback, stars, progress saving, result screen.
import { h, sleep, burst } from '../util.js';
import { mascot } from '../mascot.js';
import * as progress from '../progress.js';

export const ROUNDS = 6;

export class Game {
  constructor(app, root) {
    this.app = app;
    this.root = root;
    this.audio = app.audio;
    this.sfx = app.sfx;
    this.alive = true;
    this.index = 0;
    this.tries = 0;
    this.locked = false;
    this.firstTry = 0;
    this.rounds = [];
    this.timers = new Set();
  }

  async start() {
    this.index = 0;
    this.firstTry = 0;
    this.rounds = this.buildRounds();
    this.root.replaceChildren();
    this.dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, this.rounds.map(() => h('span', { class: 'dot' })));
    this.promptEl = h('p', { class: 'game-prompt' }, this.constructor.meta.title);
    this.area = h('div', { class: 'stack', style: { width: '100%' } });
    this.root.append(h('div', { class: 'game' }, this.dots, this.promptEl, this.area));
    await this.audio.prompt(this.constructor.meta.promptKey);
    await sleep(250);
    await this.next();
  }

  async next() {
    if (!this.alive) return;
    if (this.index >= this.rounds.length) return this.finish();
    this.tries = 0;
    this.locked = false;
    this.dots.children[this.index]?.classList.add('on');
    this.area.replaceChildren();
    this.renderRound(this.rounds[this.index], this.area);
  }

  later(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); if (this.alive) fn(); }, ms);
    this.timers.add(t);
  }

  async hit(el) {
    if (this.locked || !this.alive) return;
    this.locked = true;
    if (this.tries === 0) this.firstTry++;
    el?.classList.add('good');
    this.sfx.correct();
    if (el) burst(el);
    this.onResult?.(this.rounds[this.index], { correct: true, firstTry: this.tries === 0 });
    await this.audio.praise();
    await sleep(350);
    this.advance(true);
  }

  async miss(el) {
    if (this.locked || !this.alive) return;
    this.tries++;
    if (el) {
      el.classList.remove('nudge');
      void el.offsetWidth;
      el.classList.add('nudge');
    }
    this.sfx.nudge();
    this.onResult?.(this.rounds[this.index], { correct: false, firstTry: false });
    if (this.tries >= 2) {
      this.locked = true;
      this.reveal?.(this.rounds[this.index]);
      await this.audio.prompt('reveal');
      await sleep(1200);
      this.advance(false);
    } else {
      await this.audio.retry();
    }
  }

  advance() {
    if (!this.alive) return;
    this.dots.children[this.index]?.classList.replace('on', 'ok');
    this.index++;
    this.next();
  }

  /** Record a result for a letter or word (feeds the teacher's "most missed" list). */
  save(type, id, { correct, firstTry }) {
    if (correct) progress.record(type, id, { stars: firstTry ? 3 : 1, attempts: 1 });
    else progress.record(type, id, { stars: 0, attempts: 1, misses: 1 });
  }

  async finish() {
    const total = this.rounds.length;
    const ratio = this.firstTry / total;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1; // never zero: no losing
    const meta = this.constructor.meta;
    progress.record('game', meta.id, { stars });
    this.root.replaceChildren(h('div', { class: 'game result stack' },
      mascot('cheer'),
      h('div', { class: 'stars', 'aria-label': `${stars} stars` }, '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('p', { class: 'game-prompt' }, 'You did it!'),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => this.start() }, '🔁 Play again'),
        h('a', { class: 'btn', href: '#/games' }, '🎈 Games'))));
    this.sfx.star();
    burst(this.root.firstChild);
    await this.audio.prompt('game_done');
  }

  /** Play the prompt sound again; used by "listen" buttons. */
  replayButton(fn, label = 'Listen again') {
    return h('button', { class: 'btn btn-sun', type: 'button', 'aria-label': label, onclick: () => { this.sfx.tap(); fn(); } }, '🔊');
  }

  destroy() {
    this.alive = false;
    this.timers.forEach(clearTimeout);
    this.audio.stop();
  }
}
