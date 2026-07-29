const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const BASE_HEADERS = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'Referer': `${config.baseUrl}/booking/${config.tripId}`
};

/**
 * Lấy danh sách tất cả ghế cho chuyến xe
 * Không cần token — API công khai
 */
async function getSeats(csrfToken, sessionToken, tripId) {
    const targetTripId = tripId || config.tripId;
    const url = `${config.baseUrl}/api/trips/${targetTripId}/seats/`;
    logger.info(`Đang lấy sơ đồ ghế từ: ${url}`);

    const headers = { ...BASE_HEADERS };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    if (sessionToken) headers['x-session-token'] = sessionToken;

    const response = await axios.get(url, { headers });
    logger.info(`Lấy sơ đồ ghế thành công. HTTP Status: ${response.status}`);
    return response.data;
}

/**
 * Phân tích danh sách ghế và trả về các ghế còn trống trong danh sách mong muốn
 *
 * Cấu trúc API thực tế của newtrip.com.vn:
 * {
 *   available_seats: ["23", "25", "26"],
 *   booked_seats:    ["3", "4", "5", ...],
 *   held_seats:      ["10", "24"],
 *   locked_seats:    ["1", "2"]
 * }
 */
function parseAvailableSeats(seatData, seatNeed) {
    if (!seatData) return [];

    const targetSeats = seatNeed || config.seatNeed;

    // Cấu trúc có available_seats trực tiếp
    if (seatData.available_seats) {
        const available = seatData.available_seats.map(String);
        const booked    = (seatData.booked_seats   || []).map(String);
        const held      = (seatData.held_seats      || []).map(String);
        const locked    = (seatData.locked_seats    || []).map(String);

        logger.info(`Sơ đồ ghế — Trống: [${available.join(', ')}] | Đã giữ: [${held.join(', ')}] | Đã đặt: [${booked.join(', ')}] | Khoá: [${locked.join(', ')}]`);

        const freeSeats = [];
        for (const seat of targetSeats) {
            const seatStr = String(seat);
            if (available.includes(seatStr)) {
                logger.info(`  Ghế ${seatStr}: TRỐNG ✓`);
                freeSeats.push(seatStr);
            } else if (held.includes(seatStr)) {
                logger.info(`  Ghế ${seatStr}: ĐÃ GIỮ (held) ✗`);
            } else if (booked.includes(seatStr)) {
                logger.info(`  Ghế ${seatStr}: ĐÃ ĐẶT (booked) ✗`);
            } else if (locked.includes(seatStr)) {
                logger.info(`  Ghế ${seatStr}: BỊ KHOÁ (locked) ✗`);
            } else {
                logger.warn(`  Ghế ${seatStr}: Không tìm thấy trong sơ đồ ghế`);
            }
        }
        return freeSeats;
    }

    // Fallback: cấu trúc mảng object cũ
    const seatsList = Array.isArray(seatData) ? seatData : (seatData.seats || seatData.data || []);
    logger.info(`Tổng số ghế trên xe: ${seatsList.length}. Ghế cần giữ: [${targetSeats.join(', ')}]`);

    const freeSeats = [];
    seatsList.forEach(seat => {
        const seatNo = String(seat.number || seat.name || seat.seat_number || seat.code || seat.id || '').trim();
        const isFree = seat.status === 'available' || seat.is_available === true
            || seat.available === true || seat.status === 0
            || seat.status === 'free' || seat.is_booked === false;

        if (targetSeats.includes(seatNo)) {
            logger.info(`  Ghế ${seatNo}: ${isFree ? 'TRỐNG ✓' : 'ĐÃ GIỮ/ĐÃ BÁN ✗'}`);
            if (isFree) freeSeats.push(seatNo);
        }
    });
    return freeSeats;
}

module.exports = {
    getSeats,
    parseAvailableSeats
};
