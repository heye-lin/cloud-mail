import { settingConst } from '../const/entity-const.js';
import turnstileService from './turnstile-service.js';

const DISABLED_PROVIDER = 'disabled';
const TURNSTILE_PROVIDER = 'turnstile';

function normalizeProvider(value) {
	if (!value) {
		return '';
	}

	return String(value).trim().toLowerCase();
}

const captchaService = {
	provider(c, settingRow = null) {
		const provider = normalizeProvider(c?.env?.captcha_provider || c?.env?.captchaProvider);

		if (provider) {
			return provider;
		}

		if (settingRow?.siteKey && settingRow?.secretKey) {
			return TURNSTILE_PROVIDER;
		}

		return DISABLED_PROVIDER;
	},

	isEnabled(c, settingRow = null) {
		return this.provider(c, settingRow) === TURNSTILE_PROVIDER
			&& !!settingRow?.siteKey
			&& !!settingRow?.secretKey;
	},

	applySetting(c, settingRow) {
		settingRow.captchaProvider = this.provider(c, settingRow);
		settingRow.captchaEnabled = this.isEnabled(c, settingRow);

		if (!settingRow.captchaEnabled) {
			settingRow.siteKey = null;
		}

		return settingRow;
	},

	effectiveVerifyMode(c, settingRow, verifyMode) {
		if (!this.isEnabled(c, settingRow)) {
			return settingConst.registerVerify.CLOSE;
		}

		return verifyMode;
	},

	async verify(c, token, settingRow = null) {
		const resolvedSetting = settingRow || await import('./setting-service.js').then(({ default: settingService }) => settingService.query(c));

		if (!this.isEnabled(c, resolvedSetting)) {
			return;
		}

		await turnstileService.verify(c, token, resolvedSetting);
	}
};

export default captchaService;
