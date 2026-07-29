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
 * Step 1: GET /api/csrf-token/
 * Lấy CSRF Token mới — không cần cookie, không cần browser
 */
async function getCsrfToken() {
    const url = `${config.baseUrl}/api/csrf-token/`;
    logger.info(`[Step 1] Đang lấy CSRF Token từ: ${url}`);

    const response = await axios.get(url, {
        headers: { ...BASE_HEADERS }
    });

    const { csrf_token } = response.data;
    if (!csrf_token) throw new Error('CSRF token không có trong response!');

    logger.info(`[Step 1] Lấy CSRF Token thành công. Hết hạn sau: ${response.data.expires_in}s`);
    return csrf_token;
}

/**
 * Step 2: POST /api/session/create/
 * Tạo phiên mới — trả về session_token dùng cho bước hold
 */
async function createSession(csrfToken) {
    const url = `${config.baseUrl}/api/session/create/`;
    logger.info(`[Step 2] Đang tạo Session Token từ: ${url}`);

    const response = await axios.post(url, null, {
        headers: {
            ...BASE_HEADERS,
            'x-csrf-token': csrfToken
        }
    });

    const { session_token } = response.data;
    if (!session_token) throw new Error('Session token không có trong response!');

    logger.info(`[Step 2] Tạo Session Token thành công. Hết hạn sau: ${response.data.expires_in}s`);
    return session_token;
}

/**
 * Step 3: POST /api/trips/seats/hold/
 * Giữ ghế — gửi kèm cả csrfToken, sessionToken và danh sách ghế
 */
async function holdSeats({ csrfToken, sessionToken, seats, tripId }) {
    const url = `${config.baseUrl}/api/trips/seats/hold/`;
    const targetTripId = tripId || config.tripId;
    const seatArray = Array.isArray(seats) ? seats : [seats];

    logger.info(`[Step 3] Đang giữ ghế [${seatArray.join(', ')}] cho chuyến xe ID: ${targetTripId}...`);

    const response = await axios.post(url,
        {
            trip_id: targetTripId,
            seat_numbers: seatArray,
            session_id: sessionToken
        },
        {
            headers: {
                ...BASE_HEADERS,
                'content-type': 'application/json',
                'x-csrf-token': csrfToken,
                'x-session-token': sessionToken
            }
        }
    );

    logger.success(`[Step 3] Giữ ghế thành công! Dữ liệu phản hồi:`, response.data);
    return response.data;
}

module.exports = {
    getCsrfToken,
    createSession,
    holdSeats
};
