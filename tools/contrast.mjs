// WCAG contrast check for the colour pairs the UI actually uses. Large text (>= 24px or bold >= 18.7px) needs 3:1, body text 4.5:1.
const pairs = [
  ['ink on cream', '#26323f', '#fff7e8', 4.5],
  ['ink-soft on card', '#55616f', '#ffffff', 4.5],
  ['white on primary button', '#ffffff', '#167a6e', 4.5],
  ['primary big letter on card', '#167a6e', '#ffffff', 3],
  ['coral-ink letter/highlight on card', '#c2410c', '#ffffff', 3],
  ['ink on sun button', '#26323f', '#ffc93c', 4.5],
  ['ink on coral button', '#26323f', '#ff8a73', 4.5],
  ['ink on done tile', '#26323f', '#d8f3dc', 4.5],
  ['night ink on night card', '#f4efe0', '#223a6b', 4.5],
  ['night ink on night bg', '#f4efe0', '#14213d', 4.5],
  ['night button text on gold', '#14213d', '#f4c95d', 4.5],
  ['night target word', '#ffb38a', '#14213d', 3],
  ['highlighted word', '#26323f', '#ffc93c', 4.5],
  ['warn text', '#5a4300', '#fff3c4', 4.5],
  ['danger button', '#ffffff', '#c0392b', 4.5],
  ['bubble letter', '#1c4a6e', '#bfe6ff', 4.5],
];
const lum = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
let bad = 0;
for (const [name, fg, bg, need] of pairs) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  const ratio = (a + 0.05) / (b + 0.05);
  const ok = ratio >= need;
  if (!ok) bad++;
  console.log(`${ok ? '✔' : '✗'} ${ratio.toFixed(2).padStart(5)}:1 (need ${need})  ${name}`);
}
process.exit(bad ? 1 : 0);
