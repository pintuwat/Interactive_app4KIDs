// Sight Words (Level 3): hear a Dolch pre-primer word, tap the matching word.
import { Game, ROUNDS } from './game-base.js';
import { h, shuffle, pick } from '../util.js';
import { data } from '../data.js';

export default class SightWords extends Game {
  static meta = { id: 'sight-words', title: 'Sight Words', icon: '👀', promptKey: 'game_sight', color: '#f7c6e0', hint: 'Tap the word you hear.' };

  buildRounds() {
    const words = data.sightwords;
    return pick(words, ROUNDS).map((w) => ({ w, choices: shuffle([w, ...pick(words.filter((x) => x !== w && x.toLowerCase() !== w.toLowerCase()), 2)]) }));
  }

  renderRound(round, area) {
    const say = () => this.audio.sight(round.w);
    this.btns = round.choices.map((c) => h('button', { class: 'choice', type: 'button', dataset: { w: c }, onclick: (e) => {
      if (this.locked) return;
      const el = e.currentTarget;
      if (c === round.w) this.hit(el); else { this.audio.sight(c); this.miss(el); }
    } }, h('span', { style: { fontSize: '3rem' } }, c)));
    area.append(this.replayButton(say), h('div', { class: 'choices' }, this.btns));
    this.later(say, 300);
  }

  onResult(round, r) { this.save('sight', round.w.toLowerCase(), r); }

  reveal(round) {
    this.btns.find((b) => b.dataset.w === round.w)?.classList.add('reveal');
    this.audio.sight(round.w);
  }
}
