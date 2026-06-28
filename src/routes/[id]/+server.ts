import { error, redirect } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';
import mime from 'mime-types';

export async function GET({ params, url }) {
	const { id } = params;

	//look up the file
	const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
	const fileRecord = stmt.get(id) as
		| { disk_name: string; original_name: string; size: number; is_encrypted: number }
		| undefined;

	//if the if isn't in db, 404
	if (!fileRecord) {
		error(404, 'File not found');
	}

	if (fileRecord.is_encrypted && !url.searchParams.has('download')) {
		throw redirect(302, `/${id}/locked`);
	}

	//find file
	const uploadDir = env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
	const filePath = path.join(uploadDir, fileRecord.disk_name);

	if (!fs.existsSync(filePath)) {
		error(404, 'File missing from disk');
	}

	const stat = fs.statSync(filePath);

	//eslint-disable-next-line no-control-regex
	const safeName = fileRecord.original_name.replace(/[\x00-\x1F\x7F]/g, '').replace(/"/g, '\\"');

	//new mime logic to avoid dictionary of filetypes
	const mimeType = mime.lookup(fileRecord.original_name) || 'application/octet-stream';
	let displayAs = 'attachment';
	if (
		mimeType.startsWith('image/') ||
		mimeType.startsWith('video/') ||
		mimeType.startsWith('audio/') ||
		mimeType.startsWith('text/') ||
		mimeType === 'application/pdf'
	) {
		displayAs = 'inline';
	}

	//web stream
	const nodeStream = fs.createReadStream(filePath);
	const webStream = Readable.toWeb(nodeStream);

	return new Response(webStream as ReadableStream, {
		headers: {
			'Content-Type': mimeType,
			'Content-Length': stat.size.toString(),
			'Content-Disposition': `${displayAs}; filename="${safeName}"`,
			//tell apps they can cache this image for awhile
			'Cache-Control': 'public, max-age=31536000'
		}
	});
}
