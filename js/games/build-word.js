// Build the Word: drag (or tap) letter tiles into the slots: c + a + t.
import { Game, ROUNDS } from './game-base.js';
import { h, pic, shuffle, pick, sleep } from '../util.js';
import { cvcWords, gameLetters } from './pools.js';
import { letterById } from '../data.js';

export default class BuildWord extends Game {
  static meta = { id: 'build-word', title: 'Build the Word', icon: '🧩', promptKey: 'game_build', color: '#ffb3a2', hint: 'Drag the letters.' };

  buildRounds() {
    const words = cvcWords();
    return pick(words, Math.min(ROUNDS, words.length)).map((w) => {
      const letters = [...w.w];
      const spare = pick(gameLetters().filter((l) => !letters.includes(l.id)), 1)[0];
      return { word: w, letters, tiles: shuffle([...letters, spare ? spare.id : 'x']) };
    });
  }

  renderRound(round, area) {
    const say = () => this.audio.word(round.word.w);
    this.filled = 0;
    this.slots = round.letters.map((c, i) => h('div', { class: 'slot', dataset: { i } }));
    this.tileEls = round.tiles.map((c) => this.makeTile(c, round));
    area.append(pic(round.word.e, 'big-pic'), this.replayButton(say), h('div', { class: 'slots' }, this.slots), h('div', { class: 'tiles' }, this.tileEls));
    this.later(say, 300);
  }

  makeTile(c, round) {
    const el = h('button', { class: 'tile-l', type: 'button', 'aria-label': `Letter ${c}`, dataset: { c } }, c);
    let start = null, ghost = null, moved = false;
    el.addEventListener('pointerdown', (e) => {
      if (this.locked || el.classList.contains('used')) return;
      start = { x: e.clientX, y: e.clientY };
      moved = false;
      el.setPointerCapture(e.pointerId);
      this.audio.sound(letterById(c));
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
        moved = true;
        ghost = el.cloneNode(true);
        ghost.classList.add('drag');
        document.body.append(ghost);
      }
      if (ghost) {
        ghost.style.left = e.clientX - 48 + 'px';
        ghost.style.top = e.clientY - 48 + 'px';
        const over = this.slotAt(e.clientX, e.clientY);
        this.slots.forEach((s) => s.classList.toggle('over', s === over));
      }
    });
    const end = (e) => {
      if (!start) return;
      const wasMoved = moved;
      start = null;
      ghost?.remove();
      ghost = null;
      this.slots.forEach((s) => s.classList.remove('over'));
      if (this.locked) return;
      let slot = wasMoved ? this.slotAt(e.clientX, e.clientY) : this.slots.find((s) => !s.classList.contains('filled'));
      if (!slot) return;
      if (slot.classList.contains('filled')) return;
      this.place(el, slot, round);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { start = null; ghost?.remove(); ghost = null; });
    return el;
  }

  slotAt(x, y) {
    return this.slots.find((s) => {
      const r = s.getBoundingClientRect();
      return x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
    });
  }

  place(tile, slot, round) {
    const i = Number(slot.dataset.i);
    if (tile.dataset.c === round.letters[i]) {
      this.fill(slot, tile.dataset.c);
      tile.classList.add('used');
      this.sfx.pop();
      if (this.filled === round.letters.length) this.complete(round);
    } else {
      this.miss(tile);
    }
  }

  fill(slot, c) {
    slot.textContent = c;
    slot.classList.add('filled');
    this.filled++;
  }

  async complete(round) {
    if (this.locked) return;
    for (const s of this.slots) s.classList.add('good');
    this.hit(this.slots[0].parentElement);
    this.audio.word(round.word.w);
  }

  reveal(round) {
    // After two wrong tries, fill the remaining slots for the child.
    this.slots.forEach((s, i) => { if (!s.classList.contains('filled')) this.fill(s, round.letters[i]); });
    this.slots.forEach((s) => s.classList.add('filled'));
    this.audio.word(round.word.w);
  }

  onResult(round, r) { this.save('word', round.word.w, r); }
}
