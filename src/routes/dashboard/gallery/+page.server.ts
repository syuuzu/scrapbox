import db from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const files = db.prepare('SELECT * FROM files ORDER BY created_at DESC').all() as {
		id: string;
		original_name: string;
		disk_name: string;
		size: number;
		created_at: string;
	}[];

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
		files,
		siteDomain: settingsMap['site_domain'] || ''
	};
};

export const actions: Actions = {
	deleteFile: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing file ID' });
		}

		const file = db.prepare('SELECT disk_name FROM files WHERE id = ?').get(id) as
			| { disk_name: string }
			| undefined;

		if (!file) {
			return fail(404, { error: 'File not found' });
		}

		try {
			const uploadDir = env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
			const filePath = path.join(uploadDir, file.disk_name);

			//delete from disk
			await fs.unlink(filePath).catch((err) => {
				console.error(`Failed to delete file from disk: ${filePath}`, err);
			});

			//delete from database
			db.prepare('DELETE FROM files WHERE id = ?').run(id);

			return { success: true };
		} catch (err) {
			console.error('Delete error:', err);
			return fail(500, { error: 'Internal server error' });
		}
	}
};
