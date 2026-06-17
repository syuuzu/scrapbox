import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const settings = db.prepare('SELECT value FROM settings WHERE key = ?').get('tos_content') as { value: string } | undefined;

	return {
		tosContent: settings?.value || 'No Terms of Service have been defined for this instance.'
	};
};
