const fs   = require('fs');
const path = require('path');

// ─── Thư mục & file log ──────────────────────────────────────────────────────
const logDir     = path.join(__dirname, '..', 'logs');
const logFilePath = path.join(logDir, 'app.log');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// ─── ANSI color codes ────────────────────────────────────────────────────────
const C = {
    reset   : '\x1b[0m',
    bold    : '\x1b[1m',
    dim     : '\x1b[2m',

    // Text
    white   : '\x1b[97m',
    gray    : '\x1b[90m',
    cyan    : '\x1b[96m',
    green   : '\x1b[92m',
    yellow  : '\x1b[93m',
    red     : '\x1b[91m',
    magenta : '\x1b[95m',
    blue    : '\x1b[94m',

    // Background
    bgGreen  : '\x1b[42m',
    bgRed    : '\x1b[41m',
    bgYellow : '\x1b[43m',
    bgBlue   : '\x1b[44m',
};

// ─── Cấu hình từng level ─────────────────────────────────────────────────────
const LEVELS = {
    INFO    : { label: ' INFO ',    color: C.cyan,    badge: `${C.bgBlue}${C.white}${C.bold}`    },
    WARN    : { label: ' WARN ',    color: C.yellow,  badge: `${C.bgYellow}${C.white}${C.bold}`  },
    ERROR   : { label: ' ERROR ',   color: C.red,     badge: `${C.bgRed}${C.white}${C.bold}`     },
    SUCCESS : { label: ' OK ✓ ',    color: C.green,   badge: `${C.bgGreen}${C.white}${C.bold}`   },
};

// ─── Thời gian theo giờ Việt Nam ─────────────────────────────────────────────
function getVNTime() {
    const now = new Date();
    // UTC+7
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');

    const hh   = pad(vn.getUTCHours());
    const mm   = pad(vn.getUTCMinutes());
    const ss   = pad(vn.getUTCSeconds());
    const dd   = pad(vn.getUTCDate());
    const mo   = pad(vn.getUTCMonth() + 1);
    const yyyy = vn.getUTCFullYear();

    return {
        display : `${hh}:${mm}:${ss}  ${dd}/${mo}/${yyyy}`,  // cho console
        file    : `${yyyy}-${mo}-${dd} ${hh}:${mm}:${ss}`,   // cho file
    };
}

// ─── Ghi log ─────────────────────────────────────────────────────────────────
function writeLog(level, message, meta) {
    const cfg  = LEVELS[level] || LEVELS.INFO;
    const time = getVNTime();

    const metaStr = meta
        ? (typeof meta === 'object' ? '\n' + JSON.stringify(meta, null, 2) : '\n' + meta)
        : '';

    // ── Console (màu sắc) ──
    const consoleLine =
        `${C.gray}${time.display}${C.reset}  ` +
        `${cfg.badge}${cfg.label}${C.reset}  ` +
        `${cfg.color}${message}${C.reset}` +
        `${C.dim}${metaStr}${C.reset}`;

    // ── File (plain text, không có mã màu) ──
    const fileLine =
        `[${time.file}] [${level.padEnd(7)}] ${message}${metaStr}`;

    console.log(consoleLine);

    try {
        fs.appendFileSync(logFilePath, fileLine + '\n', 'utf8');
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

// ─── Separator tiện dụng ─────────────────────────────────────────────────────
function separator(char = '─', len = 60) {
    const line = char.repeat(len);
    console.log(`${C.gray}${line}${C.reset}`);
    try {
        fs.appendFileSync(logFilePath, line + '\n', 'utf8');
    } catch (_) {}
}

// ─── Export ──────────────────────────────────────────────────────────────────
module.exports = {
    info      : (msg, meta) => writeLog('INFO',    msg, meta),
    warn      : (msg, meta) => writeLog('WARN',    msg, meta),
    error     : (msg, meta) => writeLog('ERROR',   msg, meta),
    success   : (msg, meta) => writeLog('SUCCESS', msg, meta),
    separator,
};
