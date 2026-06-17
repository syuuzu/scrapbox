import db from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
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

	//protect admin password
	delete settingsMap.admin_hash;

	const sessionToken = event.cookies.get('admin_session');
	const session = sessionToken
		? db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionToken)
		: null;
	const isAdmin = !!session;

	return {
		settings: settingsMap,
		theme: settingsMap.theme || 'default',
		isAdmin
	};
};
