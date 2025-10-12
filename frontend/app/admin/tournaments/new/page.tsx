"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"

export default function AdminCreateTournamentPage() {
  const router = useRouter()
  const { initData } = useTelegramWebApp()
  const [title, setTitle] = useState("My Tournament")
  const [format, setFormat] = useState("swiss_fide_javafo")
  const [pointsWin, setPointsWin] = useState(1)
  const [pointsLoss, setPointsLoss] = useState(0)
  const [pointsDraw, setPointsDraw] = useState(0.5)
  const [byePoints, setByePoints] = useState(0)
  const [rounds, setRounds] = useState(5)
  const tiebreakers: string[] = ["head_to_head", "buchholz_cut1", "buchholz"]
  const [teamMode, setTeamMode] = useState("none")

  // Options
  const [allowJoin, setAllowJoin] = useState(false)
  const [allowEditResults, setAllowEditResults] = useState(false)
  const [allowDangerChanges, setAllowDangerChanges] = useState(false)
  const [forbidRepeatBye, setForbidRepeatBye] = useState(true)
  const [lateJoinPoints, setLateJoinPoints] = useState(false)
  const [hideRating, setHideRating] = useState(false)
  const [hideNewRating, setHideNewRating] = useState(false)
  const [computePerformance, setComputePerformance] = useState(false)
  const [hideColorNames, setHideColorNames] = useState(false)
  const [showOpponentNames, setShowOpponentNames] = useState(true)
  const [archived, setArchived] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
        body: JSON.stringify({
          title,
          format,
          points_win: pointsWin,
          points_loss: pointsLoss,
          points_draw: pointsDraw,
          bye_points: byePoints,
          rounds,
          tiebreakers: tiebreakers.join(", "),
          team_mode: teamMode,
          allow_join: allowJoin ? 1 : 0,
          allow_edit_results: allowEditResults ? 1 : 0,
          allow_danger_changes: allowDangerChanges ? 1 : 0,
          forbid_repeat_bye: forbidRepeatBye ? 1 : 0,
          late_join_points: lateJoinPoints ? 1 : 0,
          hide_rating: hideRating ? 1 : 0,
          hide_new_rating: hideNewRating ? 1 : 0,
          compute_performance: computePerformance ? 1 : 0,
          hide_color_names: hideColorNames ? 1 : 0,
          show_opponent_names: showOpponentNames ? 1 : 0,
          archived: archived ? 1 : 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось создать турнир")
      }
      const created = await res.json()
      router.push(`/admin/tournaments/${created.id}/participants`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-3 text-white">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5" />
      {label}
    </label>
  )

  return (
    <ChessBackground>
      <div className="min-h-screen px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-black text-white mb-6">Создать турнир</h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white rounded-lg p-4 mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Имя */}
            <div>
              <label className="text-white block mb-2">Имя</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                placeholder="My Tournament"
              />
            </div>

            {/* Формат турнира */}
            <div>
              <label className="text-white block mb-2">Формат турнира</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
              >
                <option value="swiss_fide_javafo">Швейцарская система по правилам ФИДЕ (движок JaVaFo)</option>
              </select>
            </div>

            {/* Очки за игру */}
            <div>
              <label className="text-white block mb-2">Очки за игру</label>
              <select
                value={`${pointsWin}-${pointsLoss}, ${pointsDraw}-${pointsDraw}`}
                onChange={() => {
                  // фиксированный пресет 1-0, 0.5-0.5
                  setPointsWin(1); setPointsLoss(0); setPointsDraw(0.5)
                }}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
              >
                <option>1-0, 0-1, 0.5-0.5</option>
              </select>
            </div>

            {/* Очки при пропуске */}
            <div>
              <label className="text-white block mb-2">Очки при пропуске</label>
              <select
                value={byePoints}
                onChange={(e) => setByePoints(Number(e.target.value))}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
              >
                <option value={0}>Ничья</option>
                <option value={0.5}>0.5</option>
                <option value={1}>1</option>
              </select>
            </div>

            {/* Всего раундов */}
            <div>
              <label className="text-white block mb-2">Всего раундов</label>
              <input
                type="number"
                min={1}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
              />
            </div>

            {/* Тай-брейки */}
            <div>
              <label className="text-white block mb-2">Тай-брейки</label>
              <div className="flex flex-wrap gap-2">
                {tiebreakers.map((tb) => (
                  <span key={tb} className="bg-white/10 text-white px-3 py-2 rounded-lg">{tb}</span>
                ))}
              </div>
            </div>

            {/* Командный режим */}
            <div>
              <label className="text-white block mb-2">Командный режим</label>
              <select
                value={teamMode}
                onChange={(e) => setTeamMode(e.target.value)}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
              >
                <option value="none">Без команд</option>
              </select>
            </div>

            {/* Разделы настроек */}
            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">Редактирование</h2>
              <Toggle checked={allowJoin} onChange={setAllowJoin} label="Разрешить игрокам присоединяться" />
              <Toggle checked={allowEditResults} onChange={setAllowEditResults} label="Разрешить игрокам менять свои результаты" />
              <Toggle checked={allowDangerChanges} onChange={setAllowDangerChanges} label="Разрешить опасные изменения" />
            </div>

            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">Расчеты</h2>
              <Toggle checked={forbidRepeatBye} onChange={setForbidRepeatBye} label="Запретить повторный пропуск" />
              <Toggle checked={lateJoinPoints} onChange={setLateJoinPoints} label="Давать очки за позднее присоединение" />
            </div>

            <div className="space-y-4">
              <h2 className="text-white text-xl font-bold">Интерфейс</h2>
              <Toggle checked={hideRating} onChange={setHideRating} label="Скрыть рейтинг" />
              <Toggle checked={hideNewRating} onChange={setHideNewRating} label="Скрыть новый рейтинг" />
              <Toggle checked={computePerformance} onChange={setComputePerformance} label="Рассчитывать производительность" />
              <Toggle checked={hideColorNames} onChange={setHideColorNames} label="Скрывать названия цветов" />
              <Toggle checked={showOpponentNames} onChange={setShowOpponentNames} label="Показывать имена противников в итогах" />
              <Toggle checked={archived} onChange={setArchived} label="В архиве" />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Создание..." : "Создать турнир"}
            </button>
          </form>
        </div>
      </div>
    </ChessBackground>
  )
}