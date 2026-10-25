// Ollie the owl: an original SVG mascot. mood: 'happy' (default) | 'cheer' | 'sleepy'
export function mascotSVG(mood = 'happy') {
  const eyes = mood === 'sleepy'
    ? `<path d="M50 96 Q70 112 90 96" stroke="#26323f" stroke-width="6" fill="none" stroke-linecap="round"/>
       <path d="M110 96 Q130 112 150 96" stroke="#26323f" stroke-width="6" fill="none" stroke-linecap="round"/>
       <text x="150" y="40" font-size="26" font-weight="900" fill="#c5cbe0">z</text><text x="168" y="22" font-size="20" font-weight="900" fill="#c5cbe0">z</text>`
    : mood === 'cheer'
      ? `<path d="M50 100 Q70 80 90 100" stroke="#26323f" stroke-width="7" fill="none" stroke-linecap="round"/>
         <path d="M110 100 Q130 80 150 100" stroke="#26323f" stroke-width="7" fill="none" stroke-linecap="round"/>`
      : `<g class="blink"><circle cx="74" cy="97" r="12" fill="#26323f"/><circle cx="126" cy="97" r="12" fill="#26323f"/>
         <circle cx="79" cy="92" r="4.5" fill="#fff"/><circle cx="131" cy="92" r="4.5" fill="#fff"/></g>`;
  const eyeWhites = mood === 'happy' ? `<circle cx="70" cy="95" r="26" fill="#fff"/><circle cx="130" cy="95" r="26" fill="#fff"/>` : `<circle cx="70" cy="95" r="26" fill="#fff"/><circle cx="130" cy="95" r="26" fill="#fff"/>`;
  const wingL = mood === 'cheer' ? 'M32 110 Q-4 80 14 54 Q40 70 52 118 Z' : 'M32 120 Q10 150 40 185 Q52 160 50 125 Z';
  const wingR = mood === 'cheer' ? 'M168 110 Q204 80 186 54 Q160 70 148 118 Z' : 'M168 120 Q190 150 160 185 Q148 160 150 125 Z';
  return `<svg class="mascot" viewBox="-10 0 220 222" role="img" aria-label="Ollie the owl" xmlns="http://www.w3.org/2000/svg">
  <g class="bob">
    <ellipse cx="76" cy="208" rx="19" ry="8" fill="#f2a900"/><ellipse cx="124" cy="208" rx="19" ry="8" fill="#f2a900"/>
    <path d="M44 66 L58 18 L90 54 Z" fill="#e5883a"/><path d="M156 66 L142 18 L110 54 Z" fill="#e5883a"/>
    <ellipse cx="100" cy="127" rx="72" ry="80" fill="#f4a259"/>
    <ellipse cx="100" cy="152" rx="44" ry="50" fill="#ffe3b3"/>
    <path d="${wingL}" fill="#e5883a"/><path d="${wingR}" fill="#e5883a"/>
    ${eyeWhites}${eyes}
    <path d="M91 108 L109 108 L100 126 Z" fill="#ffc93c"/>
    <circle cx="50" cy="120" r="8" fill="#ff8a73" opacity=".45"/><circle cx="150" cy="120" r="8" fill="#ff8a73" opacity=".45"/>
    <path d="M82 150 q6 8 12 0 M106 150 q6 8 12 0 M94 172 q6 8 12 0" stroke="#e5b878" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
}

export function mascot(mood = 'happy') {
  const wrap = document.createElement('div');
  wrap.className = 'mascot-wrap';
  wrap.innerHTML = mascotSVG(mood);
  return wrap;
}
