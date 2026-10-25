// Beginning Sound: see a picture, tap the letter it starts with.
import { Game, ROUNDS } from './game-base.js';
import { h, pic, shuffle, pick } from '../util.js';
import { pictureWords, gameLetters, distractorLetters } from './pools.js';
import { letterById } from '../data.js';

export default class BeginningSound extends Game {
  static meta = { id: 'beginning-sound', title: 'First Sound', icon: '🔤', promptKey: 'game_begin', color: '#ffd978', hint: 'Which letter starts it?' };

  buildRounds() {
    const letters = gameLetters();
    const ids = new Set(letters.map((l) => l.id));
    const words = pictureWords().filter((v) => v.first && ids.has(v.first));
    return pick(words, Math.min(ROUNDS, words.length)).map((target) => {
      const l = letterById(target.first);
      return { target, letter: l, choices: shuffle([l, ...distractorLetters(l, letters, 2)]) };
    });
  }

  renderRound(round, area) {
    const say = () => this.audio.word(round.target.w);
    this.btns = round.choices.map((l) => h('button', { class: 'choice', type: 'button', 'aria-label': `Letter ${l.lower}`, dataset: { id: l.id }, onclick: async (e) => {
      if (this.locked) return;
      const el = e.currentTarget;
      this.audio.sound(l);
      if (l.id === round.letter.id) this.hit(el); else this.miss(el);
    } }, h('span', {}, l.upper + l.lower)));
    area.append(h('div', { class: 'stack' }, pic(round.target.e, 'big-pic'), this.replayButton(say)), h('div', { class: 'choices' }, this.btns));
    this.later(say, 300);
  }

  onResult(round, r) { this.save('letter', round.letter.id, r); }

  reveal(round) {
    this.btns.find((b) => b.dataset.id === round.letter.id)?.classList.add('reveal');
    this.audio.sound(round.letter);
  }
}
