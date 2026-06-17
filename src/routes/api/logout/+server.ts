import { json } from '@sveltejs/kit';
import db from '$lib/server/db';

export async function POST({ cookies }) {
	const sessionToken = cookies.get('admin_session');
	if (sessionToken) {
		db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionToken);
	}
	cookies.delete('admin_session', { path: '/' });
	return json({ success: true });
}
