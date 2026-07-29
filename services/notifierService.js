const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

async function sendTelegramMessage(message) {
    const { botToken, chatId } = config.telegram;
    if (!botToken || !chatId) {
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        logger.info('Đã gửi thông báo Telegram thành công.');
    } catch (err) {
        logger.error('Gửi thông báo Telegram thất bại:', err.message);
    }
}

async function sendDiscordMessage(message) {
    const { webhookUrl } = config.discord;
    if (!webhookUrl) {
        return;
    }

    try {
        await axios.post(webhookUrl, {
            content: message
        });
        logger.info('Đã gửi thông báo Discord thành công.');
    } catch (err) {
        logger.error('Gửi thông báo Discord thất bại:', err.message);
    }
}

async function notify(title, details) {
    const fullMsg = `<b>[SEAT BOT] ${title}</b>\n${details}`;
    logger.info(`Notification Triggered: ${title} - ${details}`);
    await Promise.allSettled([
        sendTelegramMessage(fullMsg),
        sendDiscordMessage(`**[SEAT BOT] ${title}**\n${details}`)
    ]);
}

module.exports = {
    notify,
    sendTelegramMessage,
    sendDiscordMessage
};
