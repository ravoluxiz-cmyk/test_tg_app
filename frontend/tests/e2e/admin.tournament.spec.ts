import { test, expect } from '@playwright/test'

test.describe('Admin tournament flow', () => {
  test('create tournament, add participants, start tour, pairings and update result', async ({ page }) => {
    // Stub admin check to allow access
    await page.route('**/api/admin/check', async (route) => {
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    // Go to admin panel
    await page.goto('/admin')
    await expect(page.getByText('Выберите действие')).toBeVisible()

    // Create new tournament
    await page.route('**/api/tournaments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 101 } })
      } else {
        await route.continue()
      }
    })

    await page.getByRole('button', { name: 'Создать новый турнир' }).click()
    await expect(page.getByRole('heading', { name: 'Создать турнир' })).toBeVisible()

    await page.getByRole('button', { name: 'Создать турнир' }).click()

    // Participants page: stub users and participants fetches
    await page.route('**/api/users', async (route) => {
      await route.fulfill({ status: 200, json: [
        { id: 1, telegram_id: '1001', username: 'alice', first_name: 'Alice', last_name: 'A' },
        { id: 2, telegram_id: '1002', username: 'bob', first_name: 'Bob', last_name: 'B' },
        { id: 3, telegram_id: '1003', username: 'charlie', first_name: 'Charlie', last_name: 'C' },
      ] })
    })
    await page.route('**/api/tournaments/101/participants', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [] })
      } else if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON()
        const now = new Date().toISOString()
        const createdId = body.user_id === 1 ? 501 : 502
        await route.fulfill({ status: 201, json: {
          id: createdId,
          tournament_id: 101,
          user_id: body.user_id,
          nickname: body.nickname,
          created_at: now,
        } })
      } else {
        await route.continue()
      }
    })

    // Wait for participants page to load
    await expect(page.getByRole('heading', { name: 'Добавить участников' })).toBeVisible()

    // Add first participant (alice)
    await page.locator('select').first().selectOption('1')
    await page.getByPlaceholder('Уникальный никнейм').fill('alice')
    await page.getByRole('button', { name: 'Добавить участника' }).click()
    await expect(page.getByRole('cell', { name: 'alice', exact: true })).toBeVisible()

    // Add second participant (bob)
    await page.locator('select').first().selectOption('2')
    await page.getByPlaceholder('Уникальный никнейм').fill('bob')
    await page.getByRole('button', { name: 'Добавить участника' }).click()
    await expect(page.getByRole('cell', { name: 'bob', exact: true })).toBeVisible()

    // Start tour: stub creation and pairings
    await page.route('**/api/tournaments/101/tours', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 201, tournament_id: 101, number: 1, status: 'active', created_at: new Date().toISOString() } })
      } else {
        await route.fulfill({ status: 200, json: [] })
      }
    })
    const matches = [
      { id: 701, round_id: 201, white_participant_id: 501, black_participant_id: 502, board_no: 1, result: 'not_played', score_white: 0, score_black: 0, source: 'system', white_nickname: 'alice', black_nickname: 'bob' },
    ]
    await page.route('**/api/tournaments/101/tours/201/pairings', async (route) => {
      await route.fulfill({ status: 200, json: matches })
    })
    await page.route('**/api/tournaments/101/tours/201/matches', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: matches })
      } else if (route.request().method() === 'PATCH') {
        const body = await route.request().postDataJSON() as { matchId: number; result: string }
        const updated = { ...matches[0], result: body.result, score_white: body.result === 'white' ? 1 : 0, score_black: body.result === 'white' ? 0 : 1 }
        await route.fulfill({ status: 200, json: updated })
      } else {
        await route.continue()
      }
    })

    await page.getByRole('button', { name: 'Начать тур' }).click()

    // Tour manage page
    await expect(page.getByText('Управление туром')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Сгенерировать пары' })).toBeVisible()

    // Update first match result to white victory
    const row = page.locator('tr').filter({ hasText: 'alice' })
    await row.locator('select').selectOption('white')

    // Verify scores updated
    await expect(row.getByText('1 : 0')).toBeVisible()
  })
})