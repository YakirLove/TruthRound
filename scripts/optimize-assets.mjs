import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { parse } from 'yaml'
const sources = new Set()
for (const id of ['missing-lantern-parcel', 'wutong-clinic-gold-ring']) {
 const c = parse(await fs.readFile(`src/game/case-packs/${id}/case.yaml`, 'utf8'))
 for (const source of [c.reporter.portrait, ...Object.values(c.sceneAssets), ...c.characters.flatMap(p => [p.portrait, p.avatar])]) sources.add(source.slice(1))
}
let before=0,after=0
for (const source of sources) {
 const target = 'src/assets/optimized/' + source.replace(/^src\//, '').replace(/\.png$/, '.webp')
 await fs.mkdir(path.dirname(target), {recursive:true})
 await sharp(source).webp({quality:88,alphaQuality:100,effort:6}).toFile(target)
 before += (await fs.stat(source)).size; after += (await fs.stat(target)).size
}
console.log(JSON.stringify({assets:sources.size,before,after,reduction:((1-after/before)*100).toFixed(1)+'%'}))
