import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const css = readFileSync(new URL('../web/src/index.css', import.meta.url), 'utf8')
const luminance = hex => {
  const rgb = hex.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}
console.log('| Theme | Pair | Ratio | Minimum |\n| --- | --- | ---: | ---: |')
for (const [theme, selector] of [['Light', ':root {'], ['Dark', ":root[data-theme='dark'] {"]]) {
  const block = css.split(selector)[1].split('}')[0]
  const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+): (#[a-f0-9]{6});/gi)].map(m => [m[1], m[2]]))
  for (const [fg, bg, minimum] of [['ink','paper',4.5],['muted','paper',4.5],['muted','paper-deep',4.5],['ink','paper-deep',4.5],['line-strong','paper',3],['line-strong','paper-deep',3],['focus','paper',4.5],['focus','paper-deep',4.5],['danger','danger-soft',4.5],['danger','paper',4.5],['disabled','paper-deep',4.5],['success','paper',4.5],['warning','paper',4.5]]) {
    const a=luminance(tokens[fg]), b=luminance(tokens[bg]), ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05)
    assert.ok(ratio >= minimum, `${theme} ${fg}/${bg}: ${ratio}`)
    console.log(`| ${theme} | ${fg} / ${bg} | ${ratio.toFixed(2)}:1 | ${minimum}:1 |`)
  }
}
