import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { folderId } = params;

	const files = db.prepare('SELECT * FROM files WHERE folder_id = ? ORDER BY created_at DESC').all(folderId) as {
		id: string;
		original_name: string;
		disk_name: string;
		size: number;
		is_encrypted: number;
		custom_retention: number | null;
		created_at: string;
	}[];

	if (!files || files.length === 0) {
		error(404, 'Folder not found or empty');
	}

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
		siteDomain: settingsMap['site_domain'] || '',
		retentionPolicy: parseInt(settingsMap['retention_policy'] || '0'),
		siteTitle: settingsMap['site_title'] || 'scrapbox'
	};
};
