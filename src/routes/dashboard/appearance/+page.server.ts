import db from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const settings = db.prepare('SELECT key, value FROM settings').all() as {
		key: string;
		value: string;
	}[];

	const settingsMap = settings.reduce(
		(acc, { key, value }) => {
			acc[key] = value;
			return acc;
		},
		{} as Record<string, string>
	);

	return {
		settings: settingsMap
	};
};

export const actions: Actions = {
	updateAppearance: async ({ request }) => {
		const data = await request.formData();
		const theme = data.get('theme');
		const siteTitle = data.get('site_title');
		const bannerText = data.get('banner_text');
		const tosContent = data.get('tos_content');
		const customCss = data.get('custom_css');

		const updateSetting = db.prepare('UPDATE settings SET value = ? WHERE key = ?');

		if (theme !== null) updateSetting.run(theme.toString(), 'theme');
		if (siteTitle !== null) updateSetting.run(siteTitle.toString(), 'site_title');
		if (bannerText !== null) updateSetting.run(bannerText.toString(), 'banner_text');
		if (tosContent !== null) updateSetting.run(tosContent.toString(), 'tos_content');
		if (customCss !== null) updateSetting.run(customCss.toString(), 'custom_css');

		return { success: true };
	}
};
