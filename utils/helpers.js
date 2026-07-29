const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry(fn, retries = 3, delayMs = 2000, logger = console) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (logger.warn) {
                logger.warn(`Thử lại lần ${attempt}/${retries} thất bại: ${err.message}`);
            }
            if (attempt < retries) {
                await sleep(delayMs);
            }
        }
    }
    throw lastError;
}

function formatDateTime(isoStr) {
    if (!isoStr) return '(không rõ)';
    const match = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
        const [, yyyy, mm, dd, hh, min, ss] = match;
        return `${hh}:${min}:${ss} ${dd}/${mm}/${yyyy}`;
    }
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    } catch (e) {
        return isoStr;
    }
}

module.exports = {
    sleep,
    retry,
    formatDateTime
};

