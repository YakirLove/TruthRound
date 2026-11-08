import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import type { ConversationTurn } from '../game/types'
export default function Speech({ turn }: { turn?: ConversationTurn }) {
  const speed = useSettingsStore((s) => s.textSpeed),
    reduce = useSettingsStore((s) => s.reduceMotion)
  const [count, setCount] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const content = turn?.content || '选择一位街坊，从你在意的细节问起。'
  useEffect(() => {
    if (!speed || reduce || skipped) return
    const started = performance.now()
    const timer = setInterval(() => {
      const next = Math.floor(((performance.now() - started) * speed) / 1000)
      setCount(next)
      if (next >= content.length) clearInterval(timer)
    }, 30)
    return () => clearInterval(timer)
  }, [content, speed, reduce, skipped])
  const visible =
    !speed || reduce || skipped ? content : content.slice(0, count)
  return (
    <div className="speech-text" onClick={() => setSkipped(true)}>
      <p aria-label={content}>
        {visible}
        <span className="cursor" aria-hidden="true">
          {visible.length < content.length ? '▌' : ''}
        </span>
      </p>
      {visible.length < content.length && (
        <button className="text-button" onClick={() => setSkipped(true)}>
          显示全文
        </button>
      )}
    </div>
  )
}
