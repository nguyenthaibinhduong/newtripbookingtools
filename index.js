/**
 * index.js - Điểm khởi chạy chính của Seat Bot
 *
 * Luồng hoạt động mỗi chu kỳ:
 *   1. GET  /api/csrf-token/          → lấy csrfToken
 *   2. POST /api/session/create/      → lấy sessionToken
 *   3. GET  /api/trips/{id}/seats/    → kiểm tra ghế trống
 *   4. POST /api/trips/seats/hold/    → giữ ghế
 *   5. Gửi thông báo Telegram/Discord khi kết quả có
 *
 * Chạy 1 lần:       node index.js --once
 * Chạy định kỳ:     node index.js
 */

const http = require('http');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');
const { retry, formatDateTime } = require('./utils/helpers');
const { getCsrfToken, createSession, holdSeats } = require('./services/bookingService');
const { getSeats } = require('./services/seatService');
const { notify } = require('./services/notifierService');

/**
 * Shuffle mảng (Fisher-Yates) rồi lấy `n` phần tử đầu.
 */
function pickRandomSeats(availableSeats, n) {
    const arr = [...availableSeats];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
}

async function runCheckAndHold() {
    logger.separator();
    logger.info('🚀 BẮT ĐẦU CHU KỲ — Kiểm tra & Giữ ghế');
    logger.separator('·');

    try {
        // Step 1: Lấy CSRF Token
        const csrfToken = await retry(() => getCsrfToken(), 3, 2000, logger);

        // Step 2: Tạo Session Token
        const sessionToken = await retry(() => createSession(csrfToken), 3, 2000, logger);

        // Step 3: Kiểm tra sơ đồ ghế
        const seatData = await retry(
            () => getSeats(csrfToken, sessionToken, config.tripId),
            3, 2000, logger
        );

        const allAvailableSeats = seatData.available_seats
            ? seatData.available_seats.map(String)
            : [];
        const totalFree = allAvailableSeats.length;

        logger.info(`Tổng ghế trống toàn xe: ${totalFree} | Ngưỡng kích hoạt giữ ghế: > ${config.minSeatsToHold}`);

        if (totalFree <= config.minSeatsToHold) {
            const watchMsg =
                `👀 Theo dõi ghế — Chuyến xe ID: ${config.tripId}\n` +
                `🪑 Ghế trống hiện tại: ${totalFree} ghế [${allAvailableSeats.join(', ')}]\n` +
                `⚠️ Chưa đủ điều kiện giữ (cần > ${config.minSeatsToHold} ghế trống). Bỏ qua chu kỳ này.`;
            logger.info(watchMsg);
            await notify('THEO DÕI GHẾ', watchMsg);
            logger.separator();
            return;
        }

        logger.info(`✅ Đủ điều kiện giữ ghế (${totalFree} > ${config.minSeatsToHold}). Đang chọn ngẫu nhiên ${config.seatCount} ghế...`);

        // Random chọn ghế từ danh sách đang trống
        const pickedSeats = pickRandomSeats(allAvailableSeats, config.seatCount);
        logger.info(`🎲 Ghế được chọn ngẫu nhiên: [${pickedSeats.join(', ')}] (từ pool: [${allAvailableSeats.join(', ')}])`);

        if (pickedSeats.length === 0) {
            logger.info('Không đủ ghế trống để chọn. Kết thúc chu kỳ.');
            logger.separator();
            return;
        }

        // Step 4: Giữ ghế
        const holdResult = await retry(
            () => holdSeats({ csrfToken, sessionToken, seats: pickedSeats, tripId: config.tripId }),
            3, 2000, logger
        );

        // Step 5: Thông báo thành công
        const rawHoldUntil = holdResult.hold_until || '';
        const holdUntilFormatted = formatDateTime(rawHoldUntil);
        const successMsg =
            `✅ Đã giữ thành công ghế: [${pickedSeats.join(', ')}]\n` +
            `🚌 Chuyến xe ID: ${config.tripId}\n` +
            `⏰ Giữ đến: ${holdUntilFormatted}\n` +
            `🔑 Session: ${sessionToken.substring(0, 12)}...`;

        logger.success(successMsg);
        await notify('GIỮ GHẾ THÀNH CÔNG', successMsg);

    } catch (err) {
        const errMsg = `❌ Lỗi hệ thống: ${err.message}`;
        logger.error(errMsg, err.stack);
        await notify('LỖI HỆ THỐNG', errMsg);
    }

    logger.separator();
}

// ─── Khởi chạy ──────────────────────────────────────────────────────────────

const isOnce = process.argv.includes('--once');

if (isOnce) {
    logger.info('Chạy bot 1 lần duy nhất (--once mode)...');
    runCheckAndHold().then(() => process.exit(0));
} else {
    logger.separator('═');
    logger.info(`🤖 Seat Bot khởi động  |  Trip: ${config.tripId}  |  Số ghế muốn giữ: ${config.seatCount} (random)`);
    logger.info(`⏱  Cron: ${config.cronInterval}  |  Ngưỡng giữ ghế: > ${config.minSeatsToHold} ghế trống`);
    logger.separator('═');

    // Mở Web Server đơn giản để Render Web Service gọi Health Check & UptimeRobot ping
    const PORT = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('🤖 Seat Bot is running 24/7 on Render!');
    }).listen(PORT, () => {
        logger.info(`🌐 HTTP Web Server đang lắng nghe tại port ${PORT}`);
    });

    // Chạy ngay lần đầu khi khởi động
    runCheckAndHold();

    // Sau đó chạy theo lịch cron
    cron.schedule(config.cronInterval, () => {
        runCheckAndHold();
    });
}
