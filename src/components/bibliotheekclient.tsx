'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  Save,
  AlertTriangle,
  Pencil,
  Check,
  Dumbbell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MuscleBodyDiagram } from '@/components/musclebodydiagram'

export type LibraryMuscleGroup = {
  id: string
  name: string
  allows_frequent_repeat: boolean
  sort_order: number
}

export type LibraryWorkout = {
  id: string
  muscle_group_id: string
  name: string
  estimated_duration_min: number
  estimated_kcal: number | null
  default_sets: number
}

type Props = {
  initialMuscleGroups: LibraryMuscleGroup[]
  initialWorkouts: LibraryWorkout[]
}

export function BibliotheekClient({
  initialMuscleGroups,
  initialWorkouts,
}: Props) {
  const router = useRouter()

  const [muscleGroups, setMuscleGroups] =
    useState<LibraryMuscleGroup[]>(initialMuscleGroups)
  const [workouts, setWorkouts] = useState<LibraryWorkout[]>(initialWorkouts)

  // Navigatie binnen bibliotheek: null = spiergroepen-overzicht, string = geselecteerde spiergroep
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  // Nieuwe spiergroep toevoegen
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupFrequent, setNewGroupFrequent] = useState(false)

  // Spiergroep hernoemen / instellingen bewerken
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupDraftName, setGroupDraftName] = useState('')
  const [groupDraftFrequent, setGroupDraftFrequent] = useState(false)

  // Workout aanmaken / bewerken binnen actieve spiergroep
  // 'new' = nieuwe workout, string (workout id) = bestaande workout bewerken, null = geen formulier open
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | 'new' | null>(
    null
  )
  const [wName, setWName] = useState('')
  const [wDuration, setWDuration] = useState('15')
  const [wKcal, setWKcal] = useState('')
  const [wSets, setWSets] = useState('3')

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeGroup = useMemo(
    () => muscleGroups.find((g) => g.id === activeGroupId) ?? null,
    [muscleGroups, activeGroupId]
  )

  const groupWorkouts = useMemo(() => {
    if (!activeGroupId) return []
    return workouts
      .filter((w) => w.muscle_group_id === activeGroupId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [workouts, activeGroupId])

  // Controleren of er niet-opgeslagen wijzigingen zijn
  const isGroupDirty = useMemo(() => {
    if (!editingGroupId) return false
    const orig = muscleGroups.find((g) => g.id === editingGroupId)
    if (!orig) return false
    return (
      groupDraftName.trim() !== orig.name ||
      groupDraftFrequent !== orig.allows_frequent_repeat
    )
  }, [editingGroupId, muscleGroups, groupDraftName, groupDraftFrequent])

  const isWorkoutDirty = useMemo(() => {
    if (!editingWorkoutId) return false
    if (editingWorkoutId === 'new') {
      return (
        wName.trim() !== '' ||
        wDuration !== '15' ||
        wKcal.trim() !== '' ||
        wSets !== '3'
      )
    }
    const orig = workouts.find((w) => w.id === editingWorkoutId)
    if (!orig) return false
    return (
      wName.trim() !== orig.name ||
      Number(wDuration || 0) !== orig.estimated_duration_min ||
      (wKcal.trim() === '' ? null : Number(wKcal)) !== orig.estimated_kcal ||
      Number(wSets || 0) !== orig.default_sets
    )
  }, [editingWorkoutId, workouts, wName, wDuration, wKcal, wSets])

  const hasUnsavedChanges = isGroupDirty || isWorkoutDirty

  // Browser-waarschuwing bij sluiten/verversen met niet-opgeslagen wijzigingen
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  function confirmDiscardIfDirty(): boolean {
    if (!hasUnsavedChanges) return true
    return window.confirm(
      'Je hebt wijzigingen aangebracht die nog niet zijn opgeslagen. Weet je zeker dat je wilt doorgaan zonder op te slaan?'
    )
  }

  function openGroup(groupId: string) {
    if (!confirmDiscardIfDirty()) return
    setEditingGroupId(null)
    setEditingWorkoutId(null)
    setFeedback(null)
    setErrorMsg(null)
    setActiveGroupId(groupId)
  }

  function backToGroups() {
    if (!confirmDiscardIfDirty()) return
    setEditingWorkoutId(null)
    setEditingGroupId(null)
    setFeedback(null)
    setErrorMsg(null)
    setActiveGroupId(null)
  }

  function startEditGroup(group: LibraryMuscleGroup) {
    if (!confirmDiscardIfDirty()) return
    setEditingGroupId(group.id)
    setGroupDraftName(group.name)
    setGroupDraftFrequent(group.allows_frequent_repeat)
    setFeedback(null)
    setErrorMsg(null)
  }

  function startNewWorkout() {
    if (!confirmDiscardIfDirty()) return
    setEditingWorkoutId('new')
    setWName('')
    setWDuration('15')
    setWKcal('')
    setWSets('3')
    setFeedback(null)
    setErrorMsg(null)
  }

  function startEditWorkout(workout: LibraryWorkout) {
    if (!confirmDiscardIfDirty()) return
    setEditingWorkoutId(workout.id)
    setWName(workout.name)
    setWDuration(String(workout.estimated_duration_min ?? 15))
    setWKcal(workout.estimated_kcal !== null ? String(workout.estimated_kcal) : '')
    setWSets(String(workout.default_sets ?? 3))
    setFeedback(null)
    setErrorMsg(null)
  }

  async function handleCreateMuscleGroup(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newGroupName.trim()
    if (!trimmed) return

    setSaving(true)
    setErrorMsg(null)
    setFeedback(null)

    const supabase = createClient()

    const nextOrder =
      muscleGroups.reduce((max, g) => Math.max(max, g.sort_order ?? 0), 0) + 1

    const { data, error } = await supabase
      .from('muscle_groups')
      .insert({
        name: trimmed,
        allows_frequent_repeat: newGroupFrequent,
        sort_order: nextOrder,
      })
      .select('id, name, allows_frequent_repeat, sort_order')
      .single()

    setSaving(false)

    if (error || !data) {
      setErrorMsg(error?.message ?? 'kon spiergroep niet toevoegen.')
      return
    }

    setMuscleGroups((prev) => [...prev, data as LibraryMuscleGroup])
    setNewGroupName('')
    setNewGroupFrequent(false)
    setShowAddGroup(false)
    setFeedback(`spiergroep "${data.name}" toegevoegd.`)
    router.refresh()
  }

  async function handleSaveMuscleGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGroupId || !groupDraftName.trim()) return

    setSaving(true)
    setErrorMsg(null)
    setFeedback(null)

    const supabase = createClient()
    const updatedName = groupDraftName.trim()

    const { error } = await supabase
      .from('muscle_groups')
      .update({
        name: updatedName,
        allows_frequent_repeat: groupDraftFrequent,
      })
      .eq('id', editingGroupId)

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setMuscleGroups((prev) =>
      prev.map((g) =>
        g.id === editingGroupId
          ? {
              ...g,
              name: updatedName,
              allows_frequent_repeat: groupDraftFrequent,
            }
          : g
      )
    )
    setEditingGroupId(null)
    setFeedback('wijzigingen aan spiergroep opgeslagen.')
    router.refresh()
  }

  async function handleSaveWorkout(e: React.FormEvent) {
    e.preventDefault()
    if (!activeGroupId || !editingWorkoutId) return

    const trimmedName = wName.trim()
    if (!trimmedName) {
      setErrorMsg('vul een naam voor de workout in.')
      return
    }

    const durationNum = Math.max(1, Number(wDuration) || 15)
    const setsNum = Math.max(1, Number(wSets) || 3)
    const kcalNum = wKcal.trim() === '' ? null : Math.max(0, Number(wKcal) || 0)

    setSaving(true)
    setErrorMsg(null)
    setFeedback(null)

    const supabase = createClient()

    if (editingWorkoutId === 'new') {
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          muscle_group_id: activeGroupId,
          name: trimmedName,
          estimated_duration_min: durationNum,
          estimated_kcal: kcalNum,
          default_sets: setsNum,
        })
        .select(
          'id, muscle_group_id, name, estimated_duration_min, estimated_kcal, default_sets'
        )
        .single()

      setSaving(false)

      if (error || !data) {
        setErrorMsg(error?.message ?? 'kon workout niet aanmaken.')
        return
      }

      setWorkouts((prev) => [...prev, data as LibraryWorkout])
      setEditingWorkoutId(null)
      setFeedback(`workout "${trimmedName}" opgeslagen.`)
      router.refresh()
      return
    }

    const { error } = await supabase
      .from('workouts')
      .update({
        name: trimmedName,
        estimated_duration_min: durationNum,
        estimated_kcal: kcalNum,
        default_sets: setsNum,
      })
      .eq('id', editingWorkoutId)

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === editingWorkoutId
          ? {
              ...w,
              name: trimmedName,
              estimated_duration_min: durationNum,
              estimated_kcal: kcalNum,
              default_sets: setsNum,
            }
          : w
      )
    )
    setEditingWorkoutId(null)
    setFeedback('wijzigingen opgeslagen.')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Melding bij niet-opgeslagen wijzigingen */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/50 bg-amber-950/40 px-4 py-3 text-xs font-semibold text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <span>
            je hebt wijzigingen aangebracht die nog niet zijn opgeslagen. druk op{' '}
            <strong className="text-white">wijzigingen opslaan</strong> om ze te bewaren.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-200">
          {errorMsg}
        </div>
      )}

      {feedback && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs font-semibold text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* NIVEAU 1: Overzicht spiergroepen */}
      {!activeGroup ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm font-semibold text-zinc-300">
              tik op een spiergroep om workouts te beheren
            </p>
            <button
              type="button"
              onClick={() => {
                if (!confirmDiscardIfDirty()) return
                setShowAddGroup((v) => !v)
              }}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-zinc-950 transition-all active:scale-95 hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>spiergroep</span>
            </button>
          </div>

          {/* Formulier nieuwe spiergroep */}
          {showAddGroup && (
            <form
              onSubmit={(e) => void handleCreateMuscleGroup(e)}
              className="space-y-4 rounded-3xl border border-emerald-500/40 bg-zinc-900 p-5"
            >
              <h2 className="text-base font-bold text-white">
                nieuwe spiergroep toevoegen
              </h2>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  naam spiergroep
                </span>
                <input
                  type="text"
                  required
                  placeholder="bijv. borst, rug, schouders, benen..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-white focus:border-emerald-400 focus:outline-none"
                />
              </label>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={newGroupFrequent}
                  onChange={(e) => setNewGroupFrequent(e.target.checked)}
                  className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 text-emerald-500"
                />
                <span>mag vaker herhaald worden in auto-planner (zoals core)</span>
              </label>

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={saving || !newGroupName.trim()}
                  className="min-h-12 flex-1 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  {saving ? 'opslaan...' : 'spiergroep opslaan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGroup(false)}
                  className="min-h-12 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-bold text-zinc-300"
                >
                  annuleren
                </button>
              </div>
            </form>
          )}

          {/* Lijst met spiergroepen */}
          <div className="space-y-3">
            {muscleGroups.map((group) => {
              const count = workouts.filter(
                (w) => w.muscle_group_id === group.id
              ).length
              const isEditingThis = editingGroupId === group.id

              return (
                <div
                  key={group.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                >
                  {isEditingThis ? (
                    <form
                      onSubmit={(e) => void handleSaveMuscleGroup(e)}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          spiergroep bewerken
                        </span>
                        {isGroupDirty && (
                          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                            niet opgeslagen
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        required
                        value={groupDraftName}
                        onChange={(e) => setGroupDraftName(e.target.value)}
                        className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-white focus:border-emerald-400 focus:outline-none"
                      />

                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={groupDraftFrequent}
                          onChange={(e) => setGroupDraftFrequent(e.target.checked)}
                          className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 text-emerald-500"
                        />
                        <span>mag vaker herhaald worden (core-regel)</span>
                      </label>

                      <div className="flex gap-2.5">
                        <button
                          type="submit"
                          disabled={saving || !groupDraftName.trim()}
                          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40"
                        >
                          <Save className="h-4 w-4" />
                          <span>wijzigingen opslaan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="min-h-12 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-bold text-zinc-300"
                        >
                          sluiten
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openGroup(group.id)}
                        className="flex flex-1 items-center gap-3.5 text-left"
                      >
                        <MuscleBodyDiagram
                          activeMuscleGroup={group.name}
                          compact
                        />
                        <div>
                          <h2 className="text-lg font-extrabold text-white">
                            {group.name}
                          </h2>
                          <p className="text-xs text-zinc-400 tabular-nums">
                            {count} {count === 1 ? 'workout' : 'workouts'}
                            {group.allows_frequent_repeat
                              ? ' • frequente herhaling'
                              : ''}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Naam van ${group.name} wijzigen`}
                          onClick={() => startEditGroup(group)}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Workouts van ${group.name} openen`}
                          onClick={() => openGroup(group.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-emerald-400 transition-colors hover:bg-zinc-700"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* NIVEAU 2: Workouts binnen gekozen spiergroep */
        <div className="space-y-4">
          {/* Header met terug-knop en + knop bovenin voor nieuwe workout */}
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-emerald-500/30 bg-zinc-900 p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={backToGroups}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-600"
                aria-label="Terug naar spiergroepen"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  spiergroep
                </p>
                <h2 className="text-xl font-extrabold text-white">
                  {activeGroup.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={startNewWorkout}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 transition-all active:scale-95 hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>nieuwe workout</span>
            </button>
          </div>

          {/* Formulier voor nieuwe workout of bewerken van bestaande workout */}
          {editingWorkoutId && (
            <form
              onSubmit={(e) => void handleSaveWorkout(e)}
              className="space-y-4 rounded-3xl border border-emerald-500/40 bg-zinc-900 p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-white">
                  {editingWorkoutId === 'new'
                    ? `nieuwe workout in ${activeGroup.name}`
                    : 'workout bewerken'}
                </h3>
                {isWorkoutDirty && (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                    niet opgeslagen
                  </span>
                )}
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  naam workout
                </span>
                <input
                  type="text"
                  required
                  placeholder="bijv. incline dumbbell press"
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-white focus:border-emerald-400 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    duur (min)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    required
                    value={wDuration}
                    onChange={(e) => setWDuration(e.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-white tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    sets
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={wSets}
                    onChange={(e) => setWSets(e.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-white tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    kcal (opt.)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    placeholder="-"
                    value={wKcal}
                    onChange={(e) => setWKcal(e.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-white tabular-nums focus:border-emerald-400 focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={saving || !wName.trim()}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-zinc-950 transition-all active:scale-[0.99] hover:bg-emerald-400 disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'opslaan...' : 'wijzigingen opslaan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmDiscardIfDirty()) return
                    setEditingWorkoutId(null)
                  }}
                  className="min-h-12 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-300"
                >
                  annuleren
                </button>
              </div>
            </form>
          )}

          {/* Lijst met workouts binnen deze spiergroep */}
          {groupWorkouts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/70 p-8 text-center">
              <p className="text-base font-bold text-white">
                nog geen workouts voor {activeGroup.name}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                tik rechtsboven op <span className="font-bold text-emerald-400">+ nieuwe workout</span> om je eerste oefening toe te voegen.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {groupWorkouts.map((workout) => {
                const isSelected = editingWorkoutId === workout.id
                return (
                  <button
                    key={workout.id}
                    type="button"
                    onClick={() => startEditWorkout(workout)}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-3xl border p-4 text-left transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-950/35'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-emerald-400">
                        <Dumbbell className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {workout.name}
                        </p>
                        <p className="text-xs text-zinc-400 tabular-nums">
                          {workout.estimated_duration_min} min •{' '}
                          {workout.default_sets} sets
                          {workout.estimated_kcal !== null
                            ? ` • ${workout.estimated_kcal} kcal`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200">
                      wijzigen
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}