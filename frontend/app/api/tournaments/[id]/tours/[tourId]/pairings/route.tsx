import { NextResponse, NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import React from 'react'
import {
  getTournamentById,
  listTournamentParticipants,
  listMatches,
  getStandings,
  finalizeTournamentIfExceeded,
  type Match,
} from '@/lib/db'
import { generatePairingsWithBBP } from '@/lib/bbp'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; tourId: string }> }) {
  const { id, tourId } = await context.params
  const tournamentId = Number(id)
  const roundId = Number(tourId)
  if (!Number.isFinite(tournamentId) || !Number.isFinite(roundId)) {
    return NextResponse.json({ error: 'Invalid tournamentId/tourId' }, { status: 400 })
  }

  try {
    // Idempotence: if pairings already exist for this round, return them without regenerating
    const existing = await listMatches(roundId)
    if (existing && existing.length > 0) {
      console.warn('[Pairings] Matches already exist for this round; skipping generation')
      return NextResponse.json(existing, { status: 200 })
    }

    const tournament = await getTournamentById(tournamentId)
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const participants = await listTournamentParticipants(tournamentId)
    if (participants.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 participants to generate pairings' }, { status: 400 })
    }

    let generated: Match[] | null = null

    // BBP ONLY: generate using external BBP Pairings engine
    generated = await generatePairingsWithBBP(tournamentId, roundId)

    if (!generated || generated.length === 0) {
      // No fallback to simple Swiss — BBP-only mode per product decision
      return NextResponse.json({ error: 'BBP Pairings produced no matches. Check BBP configuration/binary.' }, { status: 502 })
    }

    // Always return the current round pairings after generation to keep response unified
    const matches = await listMatches(roundId)

    // Generate standings screenshot (non-blocking)
    try {
      const standings = await getStandings(tournamentId)
      const img = new ImageResponse(
        React.createElement(
          'div',
          {
            style: {
              fontSize: 16,
              width: 800,
              height: 1200,
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              background: '#0b1220',
              color: 'white',
              fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system',
            },
          },
          [
            React.createElement('div', { style: { fontSize: 22, fontWeight: 700, marginBottom: 12 } }, `Турнир: ${tournament?.title || 'Без названия'}`),
            React.createElement('div', { style: { fontSize: 18, opacity: 0.8, marginBottom: 16 } }, `Раунд ${roundId}`),
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              [
                React.createElement(
                  'div',
                  { style: { display: 'flex', justifyContent: 'space-between', opacity: 0.8, marginBottom: 6 } },
                  [
                    React.createElement('div', null, 'Участник'),
                    React.createElement('div', { style: { textAlign: 'right' } }, 'Очки'),
                  ]
                ),
                ...standings.slice(0, 25).map((s, i: number) =>
                  React.createElement(
                    'div',
                    {
                      key: `row-${i}-${s.participant_id}`,
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        background: i % 2 === 0 ? '#111827' : '#0b1220',
                        padding: '10px 12px',
                        borderRadius: 8,
                      },
                    },
                    [
                      React.createElement('div', null, `${i + 1}. ${s.nickname}`),
                      React.createElement('div', { style: { textAlign: 'right' } }, s.points.toFixed(2)),
                    ]
                  )
                ),
              ]
            ),
          ]
        ),
        { width: 800, height: 1200 }
      )

      // TODO: send img to Telegram
      void img
    } catch (sErr) {
      console.error('[Pairings] Screenshot generation/send failed:', sErr)
    }

    // Finalize tournament if exceeded rounds
    await finalizeTournamentIfExceeded(tournamentId)

    return NextResponse.json(matches, { status: 201 })
  } catch (err) {
    console.error('[Pairings] generation failed:', err)
    return NextResponse.json({ error: 'Pairings generation failed' }, { status: 500 })
  }
}