const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dataConfigPath = path.join(__dirname, 'data', 'config.json');
let dataConfig = {
    tripId: 133,
    seatCount: 10,         // Số ghế muốn giữ (random từ danh sách ghế trống)
    holdStrategy: "all_or_any",
    cronInterval: "*/5 * * * *",
    minSeatsToHold: 10,   // Chỉ giữ ghế khi tổng ghế trống TRÊN XE > giá trị này
    headless: true
};

if (fs.existsSync(dataConfigPath)) {
    try {
        const rawData = fs.readFileSync(dataConfigPath, 'utf8');
        dataConfig = { ...dataConfig, ...JSON.parse(rawData) };
    } catch (e) {
        console.error("Warning: Failed to parse data/config.json, using default settings.");
    }
}

module.exports = {
    tripId: process.env.TRIP_ID
        ? parseInt(process.env.TRIP_ID, 10)
        : (dataConfig.tripId || 133),
    // Số ghế muốn giữ — sẽ random từ danh sách ghế đang trống
    seatCount: process.env.SEAT_COUNT
        ? parseInt(process.env.SEAT_COUNT, 10)
        : (dataConfig.seatCount ?? 10),
    holdStrategy: dataConfig.holdStrategy || "all_or_any",
    cronInterval: process.env.CRON_INTERVAL || dataConfig.cronInterval || "*/5 * * * *",
    // Số ghế trống toàn xe TỐI THIỂU để kích hoạt giữ ghế.
    // Nếu ghế trống <  minSeatsToHold → chỉ theo dõi, KHÔNG giữ.
    // Nếu ghế trống >= minSeatsToHold → tiến hành giữ ghế.
    minSeatsToHold: process.env.MIN_SEATS_TO_HOLD
        ? parseInt(process.env.MIN_SEATS_TO_HOLD, 10)
        : (dataConfig.minSeatsToHold ?? 10),
    headless: process.env.HEADLESS !== undefined ? process.env.HEADLESS === 'true' : dataConfig.headless,
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || ''
    },
    discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || ''
    },
    baseUrl: "https://newtrip.com.vn"
};
