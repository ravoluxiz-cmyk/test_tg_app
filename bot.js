require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Токен бота из переменных окружения
const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}

if (!webAppUrl) {
  console.error('Error: WEB_APP_URL is not set in environment variables.');
  process.exit(1);
}

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'шахматист';

  // Создаем клавиатуру с кнопкой для открытия веб-приложения
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '♟️ Открыть шахматное приложение',
          web_app: { url: webAppUrl }
        }
      ]
    ]
  };

  bot.sendMessage(
    chatId,
    `Привет, ${userName}! ♟️\n\nДобро пожаловать в RepChessBot!\n\n` +
    `📅 Расписание турниров\n` +
    `👨‍🏫 Платные консультации с тренерами\n` +
    `🛍️ Фирменный мерч\n\n` +
    `Нажми на кнопку ниже, чтобы начать:`,
    {
      reply_markup: keyboard
    }
  );
});

// Логирование запуска
console.log('🤖 Бот запущен и готов к работе!');
console.log(`📱 Web App URL: ${webAppUrl}`);

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
