import { error, redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	//look up the file
	const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
	const fileRecord = stmt.get(id) as
		| { disk_name: string; original_name: string; size: number; is_encrypted: number }
		| undefined;

	if (!fileRecord) {
		error(404, 'File not found');
	}

	//if not encrypted goto file directly
	if (!fileRecord.is_encrypted) {
		throw redirect(302, `/${id}`);
	}

	return {
		id,
		originalName: fileRecord.original_name
	};
};
