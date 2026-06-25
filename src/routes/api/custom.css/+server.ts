import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('custom_css') as
		| { value: string }
		| undefined;

	return new Response(setting?.value || '', {
		headers: {
			'Content-Type': 'text/css'
		}
	});
};
