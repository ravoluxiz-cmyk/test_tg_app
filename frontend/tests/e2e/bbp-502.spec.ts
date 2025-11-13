import { test, expect } from '@playwright/test'

// These tests verify BBP-only behavior: when BBP pairings API returns 502,
// the UI surfaces a specific Russian message and does not fall back to any built-in Swiss pairing.

test.describe('BBP-only mode: 502 error messaging', () => {
  test('Tour page: shows 502-specific BBP error when generating pairings fails', async ({ page }) => {
    // Allow admin access
    await page.route('**/api/admin/check', async (route) => {
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    // Create a new tournament
    await page.route('**/api/tournaments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 101 } })
      } else {
        await route.continue()
      }
    })

    // Stub common fetches used by participants and tour pages
    await page.route('**/api/users', async (route) => {
      await route.fulfill({ status: 200, json: [
        { id: 1, telegram_id: '1001', username: 'alice', first_name: 'Alice', last_name: 'A' },
        { id: 2, telegram_id: '1002', username: 'bob', first_name: 'Bob', last_name: 'B' },
      ] })
    })
    await page.route('**/api/tournaments/*/participants', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, json: [] })
      } else if (method === 'POST') {
        const body = await route.request().postDataJSON()
        const now = new Date().toISOString()
        const createdId = body.user_id === 1 ? 501 : 502
        await route.fulfill({ status: 201, json: {
          id: createdId,
          tournament_id: Number(route.request().url().match(/tournaments\/(\d+)/)?.[1] ?? 101),
          user_id: body.user_id,
          nickname: body.nickname,
          created_at: now,
        } })
      } else {
        await route.continue()
      }
    })
    await page.route('**/api/tournaments/*/tours', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, json: [] })
      } else {
        await route.continue()
      }
    })
    await page.route('**/api/tournaments/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { rounds: 3, archived: 0, title: 'Test' } })
      } else {
        await route.continue()
      }
    })

    await page.goto('/admin')
    await expect(page.getByText('Выберите действие')).toBeVisible()
    await page.getByRole('button', { name: 'Создать новый турнир' }).click()
    await expect(page.getByRole('heading', { name: 'Создать турнир' })).toBeVisible()
    await page.getByRole('button', { name: 'Создать турнир' }).click()

    // Add two participants via search input and nickname field
    await expect(page.getByRole('heading', { name: 'Добавить участников' })).toBeVisible()

    // Add alice
    await page.locator('input[placeholder*="Введите ник"]').fill('alice')
    await page.getByRole('button', { name: /@alice/ }).first().click()
    await page.getByPlaceholder('Уникальный никнейм').fill('alice')
    await page.getByRole('button', { name: 'Добавить участника' }).click()
    await expect(page.getByRole('cell', { name: 'alice', exact: true })).toBeVisible()

    // Add bob
    await page.locator('input[placeholder*="Введите ник"]').fill('bob')
    await page.getByRole('button', { name: /@bob/ }).first().click()
    await page.getByPlaceholder('Уникальный никнейм').fill('bob')
    await page.getByRole('button', { name: 'Добавить участника' }).click()
    await expect(page.getByRole('cell', { name: 'bob', exact: true })).toBeVisible()

    // Create the first tour
    await page.route('**/api/tournaments/101/tours', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 201, tournament_id: 101, number: 1, status: 'active', created_at: new Date().toISOString() } })
      } else {
        await route.fulfill({ status: 200, json: [] })
      }
    })

    // Pairings API will return 502 to simulate BBP failure/unavailability (BBP-only mode)
    await page.route('**/api/tournaments/101/tours/201/pairings', async (route) => {
      await route.fulfill({ status: 502, json: { error: 'BBP Pairings produced no matches. Check BBP configuration/binary.' } })
    })
    await page.route('**/api/tournaments/101/tours/201/matches', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [] })
      } else {
        await route.continue()
      }
    })
    await page.route('**/api/tournaments/101/leaderboard', async (route) => {
      await route.fulfill({ status: 200, json: [] })
    })

    // Start tour and navigate to manage page
    await page.getByRole('button', { name: 'Начать тур' }).click()
    await expect(page.getByText('Управление туром')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Сгенерировать пары', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Сгенерировать пары', exact: true }).click()
    await expect(page.getByText('BBP недоступен или вернул пустой результат. Проверьте BBP_PAIRINGS_BIN в .env.local, путь к бинарю и логи сервера.')).toBeVisible()
  })

  test('Start tour from participants page and hit BBP 502 on pairings (no Swiss fallback)', async ({ page }) => {
    // Allow admin access
    await page.route('**/api/admin/check', async (route) => {
      await route.fulfill({ status: 200, json: { ok: true } })
    })

    // Create a new tournament
    await page.route('**/api/tournaments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 102 } })
      } else {
        await route.continue()
      }
    })

    // Common fetches
    await page.route('**/api/users', async (route) => {
      await route.fulfill({ status: 200, json: [
        { id: 1, telegram_id: '1001', username: 'alice', first_name: 'Alice', last_name: 'A' },
        { id: 2, telegram_id: '1002', username: 'bob', first_name: 'Bob', last_name: 'B' },
      ] })
    })
    await page.route('**/api/tournaments/*/participants', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, json: [] })
      } else if (method === 'POST') {
        const body = await route.request().postDataJSON()
        const now = new Date().toISOString()
        const createdId = body.user_id === 1 ? 601 : 602
        await route.fulfill({ status: 201, json: {
          id: createdId,
          tournament_id: Number(route.request().url().match(/tournaments\/(\d+)/)?.[1] ?? 102),
          user_id: body.user_id,
          nickname: body.nickname,
          created_at: now,
        } })
      } else {
        await route.continue()
      }
    })
    await page.route('**/api/tournaments/*/tours', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, json: [] })
      } else {
        await route.continue()
      }
    })
    await page.route('**/api/tournaments/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { rounds: 3, archived: 0, title: 'Test' } })
      } else {
        await route.continue()
      }
    })

    await page.goto('/admin')
    await expect(page.getByText('Выберите действие')).toBeVisible()
    await page.getByRole('button', { name: 'Создать новый турнир' }).click()
    await expect(page.getByRole('heading', { name: 'Создать турнир' })).toBeVisible()
    await page.getByRole('button', { name: 'Создать турнир' }).click()

    // Add two participants via search input and nickname field
    await expect(page.getByRole('heading', { name: 'Добавить участников' })).toBeVisible()

    // Add alice
    await page.locator('input[placeholder*="Введите ник"]').fill('alice')
    await page.getByRole('button', { name: /@alice/ }).first().click()
    await page.getByPlaceholder('Уникальный никнейм').fill('alice')
    await page.getByRole('button', { name: 'Добавить участника' }).click()
    await expect(page.getByRole('cell', { name: 'alice', exact: true })).toBeVisible()

    // Add bob
    await page.locator('input[placeholder*="Введите ник"]').fill('bob')
    await page.getByRole('button', { name: /@bob/ }).first().click()
    await page.getByPlaceholder('Уникальный никнейм').fill('bob')
    await page.getByRole('button', { name: 'Добавить участника' }).click()
    await expect(page.getByRole('cell', { name: 'bob', exact: true })).toBeVisible()

    // Create first tour
    await page.route('**/api/tournaments/102/tours', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 301, tournament_id: 102, number: 1, status: 'active', created_at: new Date().toISOString() } })
      } else {
        await route.fulfill({ status: 200, json: [] })
      }
    })

    // Pairings API: return 502 for this new tour
    await page.route('**/api/tournaments/102/tours/301/pairings', async (route) => {
      await route.fulfill({ status: 502, json: { error: 'BBP Pairings produced no matches. Check BBP configuration/binary.' } })
    })
    await page.route('**/api/tournaments/102/tours/301/matches', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [] })
      } else {
        await route.continue()
      }
    })
    await page.route('**/api/tournaments/102/leaderboard', async (route) => {
      await route.fulfill({ status: 200, json: [] })
    })

    // Start tour from participants page -> you will be navigated to the tour page regardless of pairings error (BBP-only mode, no fallback)
    await page.getByRole('button', { name: 'Начать тур' }).click()
    await expect(page.getByText('Управление туром')).toBeVisible()

    // On the tour page, explicitly try to generate pairings and expect the BBP-specific 502 message (no fallback)
    await expect(page.getByRole('button', { name: 'Сгенерировать пары', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Сгенерировать пары', exact: true }).click()
    await expect(page.getByText('BBP недоступен или вернул пустой результат. Проверьте BBP_PAIRINGS_BIN в .env.local, путь к бинарю и логи сервера.')).toBeVisible()
  })
})