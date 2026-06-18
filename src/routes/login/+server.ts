import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/db';

export async function POST({ request, cookies, url }) {
	try {
		const { password, remember } = await request.json();

		const adminRecord = db.prepare("SELECT value FROM settings WHERE key = 'admin_hash'").get() as
			| { value: string }
			| undefined;

		if (!adminRecord) {
			return json({ error: 'App not set up' }, { status: 400 });
		}

		const isValid = await bcrypt.compare(password, adminRecord.value);

		if (!isValid) {
			return json({ error: 'Invalid password' }, { status: 401 });
		}

		const isSecure = url.protocol === 'https:';

		//generate secure session token
		const sessionId = crypto.randomUUID();
		db.prepare('INSERT INTO sessions (id) VALUES (?)').run(sessionId);

		cookies.set('admin_session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: isSecure,
			...(remember ? { maxAge: 60 * 60 * 24 * 7 } : {})
		});

		return json({ success: true });
	} catch {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}
