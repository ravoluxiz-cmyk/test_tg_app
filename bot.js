require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Токен бота из переменных окружения
const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = 'https://rep-chess-tg-app.vercel.app/';

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'друг';

  // Создаем клавиатуру с одной кнопкой для открытия веб-приложения
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🎯 Открыть приложение',
          web_app: { url: webAppUrl }
        }
      ]
    ]
  };

  bot.sendMessage(
    chatId,
    `Привет, ${userName}! 👋\n\nДобро пожаловать в обучающее приложение!\n\nНажми на кнопку ниже, чтобы начать:`,
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
