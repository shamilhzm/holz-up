// Turns the artifact build into one self-contained HTML body (the viewer adds the document shell).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const dir = 'dist-artifact/assets'
const files = readdirSync(dir)
const js = readFileSync(`${dir}/${files.find((f) => f.endsWith('.js'))}`, 'utf8').replaceAll('</script', '<\\/script')
const css = readFileSync(`${dir}/${files.find((f) => f.endsWith('.css'))}`, 'utf8').replaceAll('</style', '<\\/style')
const html = `<title>Holz-Up Werkstatt</title>
<meta name="description" content="Design and plan an all-wood sit-stand desk that one person adjusts with one hand.">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`
writeFileSync('dist-artifact/holz-up-werkstatt.html', html)
console.log(`dist-artifact/holz-up-werkstatt.html ${(html.length / 1024).toFixed(0)} kB`)
