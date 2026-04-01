import { inspect } from 'node:util';

type LogMeta = Record<string, unknown>;

const tty = typeof process.stdout.isTTY === 'boolean' && process.stdout.isTTY;
const color =
  tty && process.env.NO_COLOR == null && process.env.FORCE_COLOR !== '0';

const ansi = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function paint(s: string, code: string): string {
  return color ? `${code}${s}${ansi.reset}` : s;
}

function safeMeta(meta?: LogMeta): string {
  if (meta == null || Object.keys(meta).length === 0) {
    return '';
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' [meta]';
  }
}

function timestamp(): string {
  return paint(new Date().toISOString(), ansi.dim);
}

function baseLine(
  levelLabel: string,
  levelColor: string,
  message: string,
  meta?: LogMeta
): void {
  const head = paint(levelLabel.padEnd(7), levelColor);
  console.log(`${timestamp()} ${head} ${message}${safeMeta(meta)}`);
}

function formatUnknown(cause: unknown): string {
  if (cause instanceof Error) {
    if (process.env.NODE_ENV !== 'production' && cause.stack) {
      return cause.stack;
    }
    return `${cause.name}: ${cause.message}`;
  }
  return inspect(cause, { depth: 3, colors: color });
}

/**
 * Единая точка логирования: уровни, время, опционально цвет в TTY.
 */
export const Log = {
  /** Неожиданные сбои, падения, 500 */
  error(message: string, cause?: unknown, meta?: LogMeta): void {
    const m = meta && Object.keys(meta).length > 0 ? safeMeta(meta) : '';
    const head = `${timestamp()} ${paint('ERROR', ansi.red)} ${message}${m}`;
    if (cause === undefined) {
      console.error(head);
      return;
    }
    console.error(`${head}\n${formatUnknown(cause)}`);
  },

  /** Подозрительно, деградация, то что стоит заметить без падения */
  warn(message: string, meta?: LogMeta): void {
    baseLine('WARN', ansi.yellow, message, meta);
  },

  /** Обычные события, диагностика */
  info(message: string, meta?: LogMeta): void {
    baseLine('INFO', ansi.cyan, message, meta);
  },

  /** Успешные бизнес-события (регистрация, вход, выдача кода OAuth и т.д.) */
  success(message: string, meta?: LogMeta): void {
    baseLine('OK', ansi.green, message, meta);
  },

  /** Шумная отладка (по умолчанию выключена) */
  debug(message: string, meta?: LogMeta): void {
    if (process.env.LOG_DEBUG !== '1' && process.env.LOG_DEBUG !== 'true') {
      return;
    }
    baseLine('DEBUG', ansi.magenta, message, meta);
  },
};
