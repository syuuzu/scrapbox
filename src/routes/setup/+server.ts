import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/db';

export async function POST({ request, cookies, url }) {
	try {
		const { password, domain } = await request.json();

		if (!password || password.length < 8) {
			return json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
		}

		if (!domain) {
			return json({ error: 'Domain name is required' }, { status: 400 });
		}

		//check if setup is already complete
		const existingAdmin = db.prepare("SELECT value FROM settings WHERE key = 'admin_hash'").get();
		if (existingAdmin) {
			return json({ error: 'Setup already complete' }, { status: 403 });
		}

		//hash password
		const hash = await bcrypt.hash(password, 10);

		//save to db
		db.prepare("INSERT INTO settings (key, value) VALUES ('admin_hash', ?)").run(hash);

		db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
			'site_domain',
			domain
		);

		const isSecure = url.protocol === 'https:';

		//generate secure session token
		const sessionId = crypto.randomUUID();
		db.prepare('INSERT INTO sessions (id) VALUES (?)').run(sessionId);

		//make cookie
		cookies.set('admin_session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: isSecure, //true for https
			maxAge: 60 * 60 * 24 * 7 //1 week
		});

		return json({ success: true });
	} catch {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}
