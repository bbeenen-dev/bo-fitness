'use client'

type Props = {
  activeMuscleGroup?: string | null
  compact?: boolean
}

export function MuscleBodyDiagram({ activeMuscleGroup, compact = false }: Props) {
  const key = (activeMuscleGroup ?? '').toLowerCase()

  const isChest = key.includes('borst') || key.includes('chest')
  const isBack = key.includes('rug') || key.includes('back')
  const isShoulders = key.includes('schouder') || key.includes('shoulder')
  const isArms =
    key.includes('arm') || key.includes('bicep') || key.includes('tricep')
  const isLegs =
    key.includes('been') ||
    key.includes('leg') ||
    key.includes('quad') ||
    key.includes('hamstring') ||
    key.includes('bil') ||
    key.includes('glute')
  const isCore =
    key.includes('buik') || key.includes('core') || key.includes('abs')

  const fillClass = (active: boolean) =>
    active
      ? 'fill-emerald-400 stroke-emerald-300'
      : 'fill-zinc-800 stroke-zinc-700'

  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-zinc-800/90 bg-zinc-950/90 ${
        compact ? 'h-24 w-20 p-1.5' : 'h-32 w-28 p-2'
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 180" className="h-full w-full">
        {/* Hoofd */}
        <circle cx="60" cy="20" r="11" className="fill-zinc-800 stroke-zinc-700" strokeWidth="2" />
        {/* Nek & romp */}
        <path
          d="M54 31 H66 L74 44 L70 98 H50 L46 44 Z"
          className={fillClass(isBack || isCore)}
          strokeWidth="2"
        />
        {/* Borst */}
        <path
          d="M47 45 H60 V66 H49 Z M60 45 H73 L71 66 H60 Z"
          className={fillClass(isChest)}
          strokeWidth="1.5"
        />
        {/* Schouders */}
        <circle cx="43" cy="47" r="7" className={fillClass(isShoulders)} strokeWidth="1.5" />
        <circle cx="77" cy="47" r="7" className={fillClass(isShoulders)} strokeWidth="1.5" />
        {/* Armen */}
        <path
          d="M36 52 L28 92 L35 94 L43 56 Z"
          className={fillClass(isArms)}
          strokeWidth="1.5"
        />
        <path
          d="M84 52 L92 92 L85 94 L77 56 Z"
          className={fillClass(isArms)}
          strokeWidth="1.5"
        />
        {/* Benen */}
        <path
          d="M50 100 H59 L57 166 H47 Z"
          className={fillClass(isLegs)}
          strokeWidth="1.5"
        />
        <path
          d="M61 100 H70 L73 166 H63 Z"
          className={fillClass(isLegs)}
          strokeWidth="1.5"
        />
      </svg>
    </div>
  )
}