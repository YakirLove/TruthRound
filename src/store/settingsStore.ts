import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameSettings } from '../game/types'
export const useSettingsStore = create<GameSettings>()(
  persist<GameSettings>(
    () => ({
      fontSize: 17,
      textSpeed: 35,
      volume: 0.4,
      muted: false,
      reduceMotion: false,
    }),
    { name: 'truthround-settings-v1' },
  ),
)
