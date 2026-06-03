const CONVERSION_ID = 'AW-18085254361';
const SIGNUP_LABEL = 'xvVsCJDByrgcENmp3K9D';
const DEPOSIT_LABEL = 'zi8xCNaRi5scENmp3K9D';

function fireConversion(sendTo: string, value?: number, currency = 'USD') {
  try {
    const g = (window as any).gtag;
    if (typeof g !== 'function') return;
    const params: Record<string, unknown> = { send_to: sendTo };
    if (typeof value === 'number' && isFinite(value) && value > 0) {
      params.value = Math.round(value * 100) / 100;
      params.currency = currency;
    }
    g('event', 'conversion', params);
  } catch (_) {}
}

export function fireSignupConversion() {
  fireConversion(`${CONVERSION_ID}/${SIGNUP_LABEL}`, 1.0);
}

export function fireDepositConversion(amountUsd: number) {
  fireConversion(`${CONVERSION_ID}/${DEPOSIT_LABEL}`, amountUsd);
}
