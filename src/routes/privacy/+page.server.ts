import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

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
