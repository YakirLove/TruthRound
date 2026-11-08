import type { GameState } from '@drincs/pixi-vn'
import { caseList, getCaseDefinition } from './cases'
import { snapshotSession, useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import type { InvestigationSession } from './types'
import evidenceSound from '../assets/audio/evidence.wav?url'
declare module '@drincs/pixi-vn' {
  interface GameState {
    truthround?: InvestigationSession
  }
}
type Engine = typeof import('@drincs/pixi-vn')
let engine: Engine | undefined
let ready: Promise<void> | undefined
let sceneQueue: Promise<void> = Promise.resolve()
let revision = 0
let lastScene = ''
let lastPortrait = ''
export function initEngine(element: HTMLElement) {
  if (ready) return ready
  ready = (async () => {
    engine = await import('@drincs/pixi-vn')
    const { Game, Assets, RegisteredCharacters, CharacterBaseModel } = engine
    await Game.init(element, {
      width: 1600,
      height: 1000,
      resizeMode: 'none',
      backgroundAlpha: 0,
      antialias: true,
      preference: 'webgl',
      navigate: () => {},
    })
    const assetURL = (src: string) => new URL(src, window.location.href).href
    await Assets.init({
      manifest: {
        bundles: caseList
          .filter((c) => c.caseDefinition)
          .map((item) => {
            const c = item.caseDefinition!
            return {
              name: c.id,
              assets: [
                ...Object.entries(c.sceneAssets).map(([name, src]) => ({
                  alias: `${c.id}:scene:${name}`,
                  src: assetURL(src),
                })),
                ...c.characters.map((p) => ({
                  alias: `${c.id}:person:${p.id}`,
                  src: assetURL(p.portrait),
                })),
                {
                  alias: `${c.id}:reporter`,
                  src: assetURL(c.reporter.portrait),
                },
              ],
            }
          })
          .concat([
            {
              name: 'audio',
              assets: [
                { alias: 'evidence-chime', src: assetURL(evidenceSound) },
              ],
            },
          ]),
      },
    })
    RegisteredCharacters.add(
      caseList.flatMap(
        (c) =>
          c.caseDefinition?.characters.map(
            (p) =>
              new CharacterBaseModel(`${c.id}:${p.id}`, {
                name: p.name,
                color: '#a34636',
              }),
          ) || [],
      ),
    )
    Game.addOnExportGameState((state) => {
      state.truthround = snapshotSession()
    })
    Game.addOnRestoreGameState(
      (state) => {
        if (!state.truthround) throw new Error('存档缺少调查进度')
      },
      { timing: 'before' },
    )
    applySoundSettings()
  })()
  return ready
}
function applySoundSettings() {
  if (engine) {
    const s = useSettingsStore.getState()
    engine.sound.volumeAll = s.volume
    if (s.muted) engine.sound.muteAll()
    else engine.sound.unmuteAll()
  }
}
useSettingsStore.subscribe(applySoundSettings)
export async function drawScene(session: InvestigationSession) {
  await ready
  const e = engine
  if (!e) return
  const rev = ++revision,
    c = getCaseDefinition(session.currentCaseId)
  const stage =
    session.phase === 'home' || session.phase === 'case_select'
      ? 'storefront'
      : session.phase === 'verdict'
        ? 'verdictDesk'
        : session.phase === 'result'
          ? 'verdictResult'
          : 'roundtable'
  const background = `${c.id}:scene:${stage}`
  const portrait =
    session.phase === 'report'
      ? `${c.id}:reporter`
      : session.phase === 'roundtable'
        ? `${c.id}:person:${session.activeCharacterId}`
        : ''
  await e.Assets.loadBundle(c.id)
  if (rev !== revision) return
  sceneQueue = sceneQueue
    .catch(() => {})
    .then(async () => {
      if (rev !== revision) return
      if (background !== lastScene) {
        const image = await e.showImage('background', background, {
          anchor: 0.5,
          x: 800,
          y: 500,
        })
        const scale = Math.max(
          1600 / image.texture.width,
          1000 / image.texture.height,
        )
        image.scale.set(scale)
        lastScene = background
        if (!useSettingsStore.getState().reduceMotion)
          e.canvas.animate(image, { alpha: [0, 1] }, { duration: 0.35 })
      }
      if (portrait !== lastPortrait) {
        e.canvas.remove('portrait')
        if (portrait) {
          const image = await e.showImage('portrait', portrait, {
            anchor: { x: 0.5, y: 1 },
            x: 760,
            y: 1070,
          })
          image.scale.set(
            Math.min(940 / image.texture.height, 850 / image.texture.width),
          )
          if (!useSettingsStore.getState().reduceMotion)
            e.canvas.animate(
              image,
              { alpha: [0, 1], x: [790, 760] },
              { duration: 0.28 },
            )
        }
        lastPortrait = portrait
      }
    })
  await sceneQueue
}
export async function playEvidenceSound() {
  await ready
  if (!engine || useSettingsStore.getState().muted) return
  await engine.Assets.loadBundle('audio')
  await engine.sound.unsaved.playTransient('evidence-chime', { volume: 0.6 })
}
export async function exportEngineState(): Promise<GameState> {
  await ready
  if (!engine) throw new Error('场景尚未就绪')
  await sceneQueue
  return engine.Game.exportGameState()
}
export async function restoreEngineState(state: GameState) {
  await ready
  if (!engine) throw new Error('场景尚未就绪')
  revision++
  await sceneQueue
  // Canvas assets are rebuilt from canonical case aliases after restoration; imported files cannot load arbitrary URLs.
  const clean = await engine.Game.exportGameState()
  clean.truthround = state.truthround
  await engine.Game.restoreGameState(clean)
  useGameStore.getState().restoreSession(state.truthround!)
  lastScene = ''
  lastPortrait = ''
  await drawScene(useGameStore.getState())
  applySoundSettings()
}
