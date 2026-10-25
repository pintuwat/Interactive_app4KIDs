// Listen & Tap: hear a word, tap the right picture.
import { Game, ROUNDS } from './game-base.js';
import { h, pic, shuffle, pick } from '../util.js';
import { pictureWords } from './pools.js';

export default class ListenTap extends Game {
  static meta = { id: 'listen-tap', title: 'Listen & Tap', icon: '👂', promptKey: 'game_listen_tap', color: '#a9dcf8', hint: 'Hear a word. Tap the picture.' };

  buildRounds() {
    const pool = pictureWords();
    return pick(pool, Math.min(ROUNDS, pool.length)).map((target) => {
      const others = pool.filter((x) => x.w !== target.w && x.first !== target.first);
      return { target, choices: shuffle([target, ...pick(others, 2)]) };
    });
  }

  renderRound(round, area) {
    const say = () => this.audio.word(round.target.w);
    this.btns = round.choices.map((c) => h('button', { class: 'choice', type: 'button', 'aria-label': c.w, dataset: { w: c.w }, onclick: async (e) => {
      if (this.locked) return;
      const el = e.currentTarget;
      if (c.w === round.target.w) this.hit(el); else { this.audio.word(c.w); this.miss(el); }
    } }, pic(c.e)));
    area.append(this.replayButton(say), h('div', { class: 'choices' }, this.btns));
    this.later(say, 300);
  }

  onResult(round, r) { this.save('word', round.target.w, r); }

  reveal(round) {
    this.btns.find((b) => b.dataset.w === round.target.w)?.classList.add('reveal');
    this.audio.word(round.target.w);
  }
}
