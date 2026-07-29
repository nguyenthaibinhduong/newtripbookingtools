const { chromium } = require('playwright');
const config = require('../config');
const logger = require('../utils/logger');

async function openBookingSession(tripId) {
    const targetTripId = tripId || config.tripId;
    logger.info(`Đang khởi tạo trình duyệt Playwright cho chuyến xe ID: ${targetTripId}...`);
    
    const browser = await chromium.launch({
        headless: config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    let csrfToken = null;
    let sessionToken = null;
    const capturedHeaders = {};

    page.on('request', (req) => {
        const headers = req.headers();
        if (headers['x-csrf-token']) csrfToken = headers['x-csrf-token'];
        if (headers['x-session-token']) sessionToken = headers['x-session-token'];
        if (headers['authorization']) capturedHeaders['authorization'] = headers['authorization'];
    });

    const targetUrl = `${config.baseUrl}/booking/${targetTripId}`;
    logger.info(`Đang mở trang booking: ${targetUrl}`);

    await page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 45000
    }).catch(async (err) => {
        logger.warn(`Chờ networkidle bị timeout, tiếp tục với waitUntil domcontentloaded: ${err.message}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    if (!csrfToken) {
        csrfToken = await page.evaluate(() => {
            const metaCsrf = document.querySelector('meta[name="csrf-token"]') || document.querySelector('meta[name="X-CSRF-TOKEN"]');
            if (metaCsrf) return metaCsrf.getAttribute('content');
            if (window.__CSRF_TOKEN__) return window.__CSRF_TOKEN__;
            return null;
        }).catch(() => null);
    }

    if (!sessionToken) {
        sessionToken = await page.evaluate(() => {
            if (window.__SESSION_ID__) return window.__SESSION_ID__;
            if (window.localStorage) {
                return localStorage.getItem('session_id') || localStorage.getItem('session_token');
            }
            return null;
        }).catch(() => null);
    }

    logger.info(`Đã trích xuất thông tin phiên thành công. Số lượng Cookies: ${cookies.length}, CSRF Token: ${csrfToken ? 'Đã lấy' : 'Không tìm thấy'}, Session Token: ${sessionToken ? 'Đã lấy' : 'Không tìm thấy'}`);

    return {
        browser,
        context,
        page,
        cookieHeader,
        csrfToken,
        sessionToken,
        capturedHeaders
    };
}

module.exports = {
    openBookingSession
};
