export type SessionAgentIconName =
  | 'android'
  | 'apple'
  | 'bot'
  | 'browser'
  | 'chrome'
  | 'desktop'
  | 'edge'
  | 'firefox'
  | 'linux'
  | 'mobile'
  | 'opera'
  | 'safari'
  | 'tablet'
  | 'windows';

type SessionAgentKnownState = {
  name: string;
  icon: SessionAgentIconName;
  known: boolean;
};

type SessionDeviceFamily = 'bot' | 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface SessionAgentDetails {
  browser: SessionAgentKnownState;
  os: SessionAgentKnownState;
  device: SessionAgentKnownState & { family: SessionDeviceFamily };
  primaryLabel: string;
  secondaryLabel: string;
}

const UNKNOWN_BROWSER: SessionAgentKnownState = {
  name: 'Браузер не определен',
  icon: 'browser',
  known: false,
};

const UNKNOWN_OS: SessionAgentKnownState = {
  name: 'ОС не определена',
  icon: 'desktop',
  known: false,
};

const UNKNOWN_DEVICE: SessionAgentDetails['device'] = {
  name: 'Устройство не определено',
  icon: 'desktop',
  family: 'unknown',
  known: false,
};

export function getSessionAgentDetails(userAgent: string | null): SessionAgentDetails {
  const normalized = userAgent?.toLowerCase().trim() ?? '';
  const browser = detectBrowser(normalized);
  const os = detectOs(normalized);
  const device = detectDevice(normalized);

  return {
    browser,
    os,
    device,
    primaryLabel: getPrimaryLabel(browser, os),
    secondaryLabel: getSecondaryLabel(device, browser, os, normalized),
  };
}

function detectBrowser(userAgent: string): SessionAgentKnownState {
  if (!userAgent) return UNKNOWN_BROWSER;
  if (userAgent.includes('edg/')) {
    return { name: 'Microsoft Edge', icon: 'edge', known: true };
  }
  if (userAgent.includes('opr/') || userAgent.includes('opera/')) {
    return { name: 'Opera', icon: 'opera', known: true };
  }
  if (userAgent.includes('firefox/') || userAgent.includes('fxios/')) {
    return { name: 'Firefox', icon: 'firefox', known: true };
  }
  if (userAgent.includes('crios/') || (userAgent.includes('chrome/') && !userAgent.includes('samsungbrowser/'))) {
    return { name: 'Google Chrome', icon: 'chrome', known: true };
  }
  if (userAgent.includes('samsungbrowser/')) {
    return { name: 'Samsung Internet', icon: 'browser', known: true };
  }
  if (
    userAgent.includes('safari/') &&
    !userAgent.includes('chrome/') &&
    !userAgent.includes('crios/') &&
    !userAgent.includes('android')
  ) {
    return { name: 'Safari', icon: 'safari', known: true };
  }
  if (userAgent.includes('trident/') || userAgent.includes('msie ')) {
    return { name: 'Internet Explorer', icon: 'browser', known: true };
  }
  return UNKNOWN_BROWSER;
}

function detectOs(userAgent: string): SessionAgentKnownState {
  if (!userAgent) return UNKNOWN_OS;
  if (userAgent.includes('windows nt')) {
    return { name: 'Windows', icon: 'windows', known: true };
  }
  if (userAgent.includes('iphone') || userAgent.includes('ipod')) {
    return { name: 'iOS', icon: 'apple', known: true };
  }
  if (userAgent.includes('ipad')) {
    return { name: 'iPadOS', icon: 'apple', known: true };
  }
  if (userAgent.includes('mac os x') || userAgent.includes('macintosh')) {
    return { name: 'macOS', icon: 'apple', known: true };
  }
  if (userAgent.includes('android')) {
    return { name: 'Android', icon: 'android', known: true };
  }
  if (userAgent.includes('cros')) {
    return { name: 'ChromeOS', icon: 'desktop', known: true };
  }
  if (userAgent.includes('linux') || userAgent.includes('x11')) {
    return { name: 'Linux', icon: 'linux', known: true };
  }
  return UNKNOWN_OS;
}

function detectDevice(userAgent: string): SessionAgentDetails['device'] {
  if (!userAgent) return UNKNOWN_DEVICE;
  if (/(bot|spider|crawler|curl|postmanruntime|insomnia)/.test(userAgent)) {
    return { name: 'Сервисный или автоматизированный клиент', icon: 'bot', family: 'bot', known: true };
  }
  if (/(ipad|tablet|sm-t|kindle|silk)/.test(userAgent)) {
    return { name: 'Планшет', icon: 'tablet', family: 'tablet', known: true };
  }
  if (/(iphone|ipod)/.test(userAgent)) {
    return { name: 'Смартфон', icon: 'mobile', family: 'mobile', known: true };
  }
  if (userAgent.includes('android') && !userAgent.includes('mobile')) {
    return { name: 'Планшет или Android-устройство', icon: 'tablet', family: 'tablet', known: true };
  }
  if (userAgent.includes('mobile')) {
    return { name: 'Смартфон', icon: 'mobile', family: 'mobile', known: true };
  }
  return { name: 'Ноутбук или настольный компьютер', icon: 'desktop', family: 'desktop', known: true };
}

function getPrimaryLabel(browser: SessionAgentKnownState, os: SessionAgentKnownState) {
  if (browser.known && os.known) return `${browser.name} на ${os.name}`;
  if (browser.known) return browser.name;
  if (os.known) return os.name;
  return 'Среда входа не определена';
}

function getSecondaryLabel(
  device: SessionAgentDetails['device'],
  browser: SessionAgentKnownState,
  os: SessionAgentKnownState,
  userAgent: string
) {
  if (!userAgent) {
    return 'Сервис не передал user-agent, поэтому среда определена не полностью.';
  }
  if (!browser.known && !os.known && device.family === 'unknown') {
    return 'Недостаточно данных для точного определения устройства.';
  }
  if (device.family === 'bot') {
    return 'Похоже на сервисный клиент, скрипт или API-интеграцию.';
  }
  if (!browser.known || !os.known) {
    return `${device.name}. Часть параметров определена приблизительно.`;
  }
  return device.name;
}
