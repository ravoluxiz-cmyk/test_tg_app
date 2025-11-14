## Текущее состояние
- Аутентификация Telegram WebApp: реализованы парсинг/валидация initData и API-роуты GET/POST для проверки авторизации. <mcfile name="route.ts" path="/Users/dmitry/test_tg_app-1/frontend/app/api/auth/telegram/route.ts"></mcfile> <mcfile name="telegram.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/telegram.ts"></mcfile> <mcsymbol name="getTelegramUserFromHeaders" filename="telegram.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/telegram.ts" startline="111" type="function"></mcsymbol> <mcsymbol name="requireAdmin" filename="telegram.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/telegram.ts" startline="192" type="function"></mcsymbol>
- Домены турниров: CRUD, участники, туры, матчи, финализация, лидерборд — реализованы на серверной стороне и застримлены в API-роутах. <mcfile name="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts"></mcfile> <mcsymbol name="createTournament" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="253" type="function"></mcsymbol> <mcsymbol name="addTournamentParticipant" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="364" type="function"></mcsymbol> <mcsymbol name="createRound" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="447" type="function"></mcsymbol> <mcsymbol name="listMatches" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="485" type="function"></mcsymbol> <mcsymbol name="updateMatchResult" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="677" type="function"></mcsymbol> <mcsymbol name="finalizeTournamentIfExceeded" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="819" type="function"></mcsymbol> <mcsymbol name="finalizeTournament" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="878" type="function"></mcsymbol> <mcsymbol name="listLeaderboard" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="917" type="function"></mcsymbol>
- Генерация пар: включена интеграция с движком BBP (внешний бинарь), продуктовый режим — BBP-only без fallback. <mcfile name="bbp.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/bbp.ts"></mcfile> <mcsymbol name="generatePairingsWithBBP" filename="bbp.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/bbp.ts" startline="307" type="function"></mcsymbol> <mcfile name="route.tsx" path="/Users/dmitry/test_tg_app-1/frontend/app/api/tournaments/[id]/tours/[tourId]/pairings/route.tsx"></mcfile>
- Google Calendar: серверный клиент, парсер и API-роут с флагом симуляции ошибки для тестов. <mcfile name="client.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/google-calendar/client.ts"></mcfile> <mcfile name="parser.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/google-calendar/parser.ts"></mcfile> <mcfile name="route.ts" path="/Users/dmitry/test_tg_app-1/frontend/app/api/tournaments/calendar/route.ts"></mcfile>
- База данных: Supabase-клиент с in-memory fallback, полный SQL миграций (схема, индексы, RLS). <mcfile name="supabase.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/supabase.ts"></mcfile> <mcfile name="supabase-full-migration.sql" path="/Users/dmitry/test_tg_app-1/frontend/database/supabase-full-migration.sql"></mcfile>
- UI/страницы: админ-модули для создания/управления турнирами, публичные страницы, компоненты UI. <mcfolder name="tournaments" path="/Users/dmitry/test_tg_app-1/frontend/app/admin/tournaments"></mcfolder> <mcfolder name="components" path="/Users/dmitry/test_tg_app-1/frontend/components"></mcfolder>
- Тесты: Playwright e2e и сценарии Testsprite TC001–TC020 покрывают ключевые флоу, включая BBP 502 без fallback. <mcfile name="admin.tournament.spec.ts" path="/Users/dmitry/test_tg_app-1/frontend/tests/e2e/admin.tournament.spec.ts"></mcfile> <mcfile name="bbp-502.spec.ts" path="/Users/dmitry/test_tg_app-1/frontend/tests/e2e/bbp-502.spec.ts"></mcfile>

## Оставшиеся задачи
- Реализовать отправку изображения со standings в Telegram (сейчас TODO). <mcfile name="route.tsx" path="/Users/dmitry/test_tg_app-1/frontend/app/api/tournaments/[id]/tours/[tourId]/pairings/route.tsx"></mcfile>
- Усилить авторизацию: ограничить создание участников только для админов на API-уровне (POST). <mcfile name="route.ts" path="/Users/dmitry/test_tg_app-1/frontend/app/api/tournaments/[id]/participants/route.ts"></mcfile>
- Повысить устойчивость BBP: улучшить диагностику, таймауты, ретраи и конфигурацию `BBP_PAIRINGS_BIN`, опционально — фича-флаг fallback на простой Swiss. <mcfile name="bbp.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/bbp.ts"></mcfile> <mcsymbol name="simpleSwissPairings" filename="db.ts" path="/Users/dmitry/test_tg_app-1/frontend/lib/db.ts" startline="520" type="function"></mcsymbol>
- Оптимизация запросов: добавить недостающие индексы по FK (rounds.tournament_id, matches.round_id, tournament_participants.tournament_id, leaderboard.tournament_id). <mcfile name="supabase-full-migration.sql" path="/Users/dmitry/test_tg_app-1/frontend/database/supabase-full-migration.sql"></mcfile>
- Кэширование календаря Google и graceful degradation при ошибках/квотах.
- Расширить тестовое покрытие: unit/integration для `lib/bbp`, `lib/telegram`, негативные кейсы API.

## Приоритизация и последовательность
- Высокий приоритет: безопасность и доступы — авторизация на POST участников; устойчивость BBP (таймауты, ретраи, логгирование).
- Средний приоритет: отправка standings в Telegram; индексы БД для производительности.
- Низкий приоритет: кэширование календаря; фича-флаг на Swiss fallback; доп. UX/локализация ошибок.
- Последовательность: (1) авторизация API → (2) BBP устойчивость → (3) индексация БД → (4) отправка изображения → (5) кэш календаря → (6) тесты и документация конфигурации.

## Риски и сложности
- Доступность BBP бинаря и совместимость окружений (в репо — macOS arm64; нужны проверки на Linux/CI).
- Безопасное хранение `SUPABASE_SERVICE_ROLE_KEY` и `TELEGRAM_BOT_TOKEN`; недопустимо утекание в клиент.
- Квоты и ошибки Google Calendar; требуется бэкофф/кэш.

## Рекомендации по архитектуре/оптимизации/тестам
- Архитектура: единый слой авторизации-мидлварей для админ-роутов (реюз `requireAdmin`), централизованный error handling.
- БД: добавить индексы по часто используемым фильтрам; ввести ограничения уникальности на `tournament_participants (tournament_id, nickname)`.
- Производительность: избегать лишних round-trip к БД, батчировать чтение standings; продумать пулинг соединений Supabase.
- Тестирование: unit-тесты для валидации Telegram initData и парсинга TRF; e2e для отправки изображения; негативные тесты BBP (таймаут/невиданная ошибка).

## Ожидаемые результаты и критерии завершенности
- Конечные цели: стабильный админ-флоу от создания турнира до финализации; надёжная генерация пар; публикация standings в Telegram.
- Критерии: все e2e проходят; админ-операции требуют валидной авторизации; BBP недоступность обрабатывается предсказуемо; база имеет ключевые индексы и ограничения.
- Показатели качества: снижение p95 времени генерации пар и загрузки страниц; нулевые 5xx на стандартных сценариях; покрытие тестами ключевых модулей (>=80%).