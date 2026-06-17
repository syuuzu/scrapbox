import { redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';

//removes old files and abandoned chunks
async function cleanupFiles() {
	try {
		const uploadDir = env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
		//expired files
		const settings = db
			.prepare('SELECT value FROM settings WHERE key = ?')
			.get('retention_policy') as { value: string } | undefined;
		const retention = settings ? parseInt(settings.value) : 0;

		if (retention !== 0) {
			//clean up files based on either custom_retention or global policy
			const oldFiles = db
				.prepare(
					`
				SELECT id, disk_name FROM files
				WHERE (custom_retention IS NOT NULL AND created_at < datetime('now', '-' || custom_retention || ' minutes'))
				OR (custom_retention IS NULL AND created_at < datetime('now', '-' || ? || ' minutes'))
			`
				)
				.all(retention) as { id: string; disk_name: string }[];

			for (const file of oldFiles) {
				const filePath = path.join(uploadDir, file.disk_name);
				try {
					await fs.unlink(filePath);
					db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
					console.log(`[Cleanup] Deleted expired file: ${file.disk_name}`);
				} catch (err) {
					if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
						db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
					}
				}
			}
		} else {
			const oldFiles = db
				.prepare(
					`
				SELECT id, disk_name FROM files
				WHERE custom_retention IS NOT NULL AND created_at < datetime('now', '-' || custom_retention || ' minutes')
			`
				)
				.all() as { id: string; disk_name: string }[];

			for (const file of oldFiles) {
				const filePath = path.join(uploadDir, file.disk_name);
				try {
					await fs.unlink(filePath);
					db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
					console.log(`[Cleanup] Deleted expired file with custom retention: ${file.disk_name}`);
				} catch (err) {
					if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
						db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
					}
				}
			}
		}

		//clean up old part files
		const files = await fs.readdir(uploadDir).catch(() => []);
		const now = Date.now();

		for (const file of files) {
			if (file.endsWith('.part')) {
				const filePath = path.join(uploadDir, file);
				const stats = await fs.stat(filePath);
				//uploads longer than 24 hours get deleted
				if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
					await fs.unlink(filePath);
					console.log(`[Cleanup] Deleted abandoned partial upload: ${file}`);
				}
			}
		}
	} catch (err) {
		console.error('[Cleanup] Error during cleanup:', err);
	}
}

//run cleanup every minute
setInterval(cleanupFiles, 60 * 1000);

//rate limiting storage
const rateLimits = new Map<string, { count: number; reset: number }>();

export const handle = async ({ event, resolve }) => {
	//check if the app has been set up yet
	const stmt = db.prepare('SELECT key, value FROM settings');
	const allSettings = stmt.all() as { key: string; value: string }[];
	const settingsMap = allSettings.reduce(
		(acc, { key, value }) => {
			acc[key] = value;
			return acc;
		},
		{} as Record<string, string>
	);

	const adminRecord = settingsMap['admin_hash'];
	const isSetupComplete = !!adminRecord;

	//rate limiting
	const clientIp = event.getClientAddress();
	const windowMs = parseInt(settingsMap['rate_limit_window'] || '1000');
	const maxRequests = parseInt(settingsMap['rate_limit_max'] || '100');

	const now = Date.now();
	const userLimit = rateLimits.get(clientIp);

	if (userLimit && now < userLimit.reset) {
		userLimit.count++;
		if (userLimit.count > maxRequests) {
			return new Response(JSON.stringify({ error: 'Too many requests' }), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': Math.ceil((userLimit.reset - now) / 1000).toString()
				}
			});
		}
	} else {
		rateLimits.set(clientIp, { count: 1, reset: now + windowMs });
	}

	//cleanup rateLimits map occasionally
	if (rateLimits.size > 10000) {
		for (const [ip, limit] of rateLimits.entries()) {
			if (now > limit.reset) rateLimits.delete(ip);
		}
	}

	const path = event.url.pathname;
	const isSetupRoute = path.startsWith('/setup');
	const isAdminRoute = path.startsWith('/dashboard');

	//if no password is in the database stop the app from working
	if (!isSetupComplete && !isSetupRoute) {
		throw redirect(302, '/setup');
	}

	//once setup is done stop people from running the password setup again
	if (isSetupComplete && isSetupRoute) {
		throw redirect(302, '/');
	}

	//if they are trying to login as admin check their cookie
	if (isAdminRoute && path !== '/login') {
		const sessionToken = event.cookies.get('admin_session');

		//check if session token exists in DB
		const session = sessionToken
			? db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionToken)
			: null;

		//stop them if they dont have a valid session
		if (!session) {
			throw redirect(302, '/login');
		}
	}

	if (path === '/login') {
		const sessionToken = event.cookies.get('admin_session');
		const session = sessionToken
			? db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionToken)
			: null;

		if (session) {
			throw redirect(302, '/dashboard/settings');
		}
	}

	//if they pass all tests
	return resolve(event);
};
