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
        compact ? 'h-24 w-36 p-1.5' : 'h-36 w-52 p-2'
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 220 180" className="h-full w-full">
        {/* ==================== LINKS: VOORKANT ==================== */}
        <g id="front">
          {/* Hoofd */}
          <circle
            cx="55"
            cy="20"
            r="10.5"
            className="fill-zinc-800 stroke-zinc-700"
            strokeWidth="2"
          />
          {/* Nek & romp */}
          <path
            d="M49 30 H61 L69 43 L65 98 H45 L41 43 Z"
            className={fillClass(isCore)}
            strokeWidth="2"
          />
          {/* Borst */}
          <path
            d="M42 44 H55 V65 H44 Z M55 44 H68 L66 65 H55 Z"
            className={fillClass(isChest)}
            strokeWidth="1.5"
          />
          {/* Schouders */}
          <circle
            cx="38"
            cy="46"
            r="6.5"
            className={fillClass(isShoulders)}
            strokeWidth="1.5"
          />
          <circle
            cx="72"
            cy="46"
            r="6.5"
            className={fillClass(isShoulders)}
            strokeWidth="1.5"
          />
          {/* Armen */}
          <path
            d="M31 51 L23 92 L30 94 L38 55 Z"
            className={fillClass(isArms)}
            strokeWidth="1.5"
          />
          <path
            d="M79 51 L87 92 L80 94 L72 55 Z"
            className={fillClass(isArms)}
            strokeWidth="1.5"
          />
          {/* Benen voorkant */}
          <path
            d="M45 100 H54 L52 166 H42 Z"
            className={fillClass(isLegs)}
            strokeWidth="1.5"
          />
          <path
            d="M56 100 H65 L68 166 H58 Z"
            className={fillClass(isLegs)}
            strokeWidth="1.5"
          />
        </g>

        {/* ==================== RECHTS: ACHTERKANT ==================== */}
        <g id="back">
          {/* Hoofd */}
          <circle
            cx="165"
            cy="20"
            r="10.5"
            className="fill-zinc-800 stroke-zinc-700"
            strokeWidth="2"
          />
          {/* Nek & rug */}
          <path
            d="M159 30 H171 L179 43 L175 98 H155 L151 43 Z"
            className={fillClass(isBack)}
            strokeWidth="2"
          />
          {/* Schouders achterkant */}
          <circle
            cx="148"
            cy="46"
            r="6.5"
            className={fillClass(isShoulders)}
            strokeWidth="1.5"
          />
          <circle
            cx="182"
            cy="46"
            r="6.5"
            className={fillClass(isShoulders)}
            strokeWidth="1.5"
          />
          {/* Armen achterkant */}
          <path
            d="M141 51 L133 92 L140 94 L148 55 Z"
            className={fillClass(isArms)}
            strokeWidth="1.5"
          />
          <path
            d="M189 51 L197 92 L190 94 L182 55 Z"
            className={fillClass(isArms)}
            strokeWidth="1.5"
          />
          {/* Billen */}
          <path
            d="M155 84 H165 V102 H154 Z M165 84 H175 L176 102 H165 Z"
            className={fillClass(isLegs)}
            strokeWidth="1.5"
          />
          {/* Benen achterkant */}
          <path
            d="M155 102 H164 L162 166 H152 Z"
            className={fillClass(isLegs)}
            strokeWidth="1.5"
          />
          <path
            d="M166 102 H175 L178 166 H168 Z"
            className={fillClass(isLegs)}
            strokeWidth="1.5"
          />
        </g>
      </svg>
    </div>
  )
}