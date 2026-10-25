// Rhyme Match: cat -> mat. Pick the picture that rhymes with the word.
import { Game, ROUNDS } from './game-base.js';
import { h, pic, shuffle, pick } from '../util.js';
import { cvcWords } from './pools.js';
import { data } from '../data.js';

export default class RhymeMatch extends Game {
  static meta = { id: 'rhyme-match', title: 'Rhyme Match', icon: '🎵', promptKey: 'game_rhyme', color: '#7bcf8f', hint: 'cat, mat!' };

  buildRounds() {
    let pool = cvcWords(8);
    const byFam = (arr) => arr.reduce((m, w) => ((m[w.f] = m[w.f] || []).push(w), m), {});
    let fams = byFam(pool);
    if (Object.values(fams).filter((a) => a.length >= 2).length < 2) { pool = data.words.filter((w) => !w.weak); fams = byFam(pool); }
    const usable = Object.keys(fams).filter((f) => fams[f].length >= 2);
    const rounds = [];
    const order = shuffle(usable);
    for (let i = 0; i < ROUNDS; i++) {
      const f = order[i % order.length];
      const [target, answer] = pick(fams[f], 2);
      const wrong = pick(pool.filter((w) => w.f !== f), 2);
      rounds.push({ target, answer, choices: shuffle([answer, ...wrong]) });
    }
    return rounds;
  }

  renderRound(round, area) {
    const say = () => this.audio.word(round.target.w);
    this.btns = round.choices.map((c) => h('button', { class: 'choice', type: 'button', 'aria-label': c.w, dataset: { w: c.w }, onclick: async (e) => {
      if (this.locked) return;
      const el = e.currentTarget;
      if (c.w === round.answer.w) {
        await this.audio.word(round.target.w);
        await this.audio.word(c.w);
        this.hit(el);
      } else { this.audio.word(c.w); this.miss(el); }
    } }, pic(c.e)));
    area.append(h('div', { class: 'rhyme-pair' }, h('button', { class: 'rhyme-target', type: 'button', 'aria-label': round.target.w, onclick: say }, pic(round.target.e), h('span', { class: 'ctext' }, round.target.w)), h('span', { class: 'game-prompt', 'aria-hidden': 'true' }, '＝'), h('div', { class: 'choices' }, this.btns)));
    this.later(say, 300);
  }

  onResult(round, r) { this.save('word', round.target.w, r); }

  reveal(round) {
    this.btns.find((b) => b.dataset.w === round.answer.w)?.classList.add('reveal');
    this.audio.word(round.target.w).then(() => this.audio.word(round.answer.w));
  }
}
