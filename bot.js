require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Токен бота из переменных окружения
const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'друг';

  // Создаем клавиатуру с кнопкой для открытия веб-приложения
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '📚 Открыть обучающее приложение',
          web_app: { url: webAppUrl }
        }
      ],
      [
        {
          text: '📊 Мой прогресс',
          callback_data: 'progress'
        }
      ],
      [
        {
          text: '⭐ Избранное',
          callback_data: 'favorites'
        }
      ]
    ]
  };

  bot.sendMessage(
    chatId,
    `Привет, ${userName}! 👋\n\nДобро пожаловать в обучающее приложение!\n\nНажми на кнопку ниже, чтобы начать обучение:`,
    {
      reply_markup: keyboard
    }
  );
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `🤖 Доступные команды:\n\n` +
    `/start - Главное меню\n` +
    `/help - Справка\n` +
    `/lessons - Открыть уроки\n\n` +
    `Используй кнопки для навигации по приложению!`
  );
});

// Команда /lessons
bot.onText(/\/lessons/, (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '📚 Открыть уроки',
          web_app: { url: webAppUrl }
        }
      ]
    ]
  };

  bot.sendMessage(
    chatId,
    'Нажми на кнопку, чтобы открыть список уроков:',
    {
      reply_markup: keyboard
    }
  );
});

// Обработка callback-кнопок
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Отвечаем на callback query
  bot.answerCallbackQuery(query.id);

  if (data === 'progress') {
    bot.sendMessage(
      chatId,
      '📊 Здесь будет отображаться ваш прогресс:\n\n' +
      '• Завершено уроков: 0\n' +
      '• В избранном: 0\n\n' +
      'Откройте приложение для начала обучения!'
    );
  } else if (data === 'favorites') {
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '⭐ Открыть избранное',
            web_app: { url: `${webAppUrl}/favorites` }
          }
        ]
      ]
    };

    bot.sendMessage(
      chatId,
      '⭐ Ваше избранное пусто.\n\nОткройте приложение и добавьте интересные уроки в избранное!',
      {
        reply_markup: keyboard
      }
    );
  }
});

// Обработка данных из Web App
bot.on('web_app_data', (msg) => {
  const chatId = msg.chat.id;
  const data = JSON.parse(msg.web_app_data.data);

  bot.sendMessage(chatId, `Получены данные: ${JSON.stringify(data, null, 2)}`);
});

// Логирование запуска
console.log('🤖 Бот запущен и готов к работе!');
console.log(`📱 Web App URL: ${webAppUrl}`);

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
