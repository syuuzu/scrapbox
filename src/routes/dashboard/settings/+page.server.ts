import db from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
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
	updateSettings: async ({ request }) => {
		const data = await request.formData();
		const retention = data.get('retention_policy');
		const maxSize = data.get('max_upload_size');
		const bannedTypes = data.get('banned_file_types');
		const theme = data.get('theme');
		const rateLimitWindow = data.get('rate_limit_window');
		const rateLimitMax = data.get('rate_limit_max');
		const shortIdLength = data.get('short_id_length');
		const siteDomain = data.get('site_domain');

		const updateSetting = db.prepare('UPDATE settings SET value = ? WHERE key = ?');

		if (retention !== null) updateSetting.run(retention.toString(), 'retention_policy');
		if (maxSize !== null) updateSetting.run(maxSize.toString(), 'max_upload_size');
		if (bannedTypes !== null) updateSetting.run(bannedTypes.toString(), 'banned_file_types');
		if (theme !== null) updateSetting.run(theme.toString(), 'theme');
		if (rateLimitWindow !== null)
			updateSetting.run(rateLimitWindow.toString(), 'rate_limit_window');
		if (rateLimitMax !== null) updateSetting.run(rateLimitMax.toString(), 'rate_limit_max');
		if (shortIdLength !== null) updateSetting.run(shortIdLength.toString(), 'short_id_length');
		if (siteDomain !== null) updateSetting.run(siteDomain.toString(), 'site_domain');

		return { success: true };
	},

	changePassword: async ({ request }) => {
		const data = await request.formData();
		const newPassword = data.get('newPassword')?.toString();
		const confirmPassword = data.get('confirmPassword')?.toString();

		if (!newPassword || newPassword.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match' });
		}

		const hash = await bcrypt.hash(newPassword, 10);
		db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_hash'").run(hash);

		return { success: true };
	}
};
