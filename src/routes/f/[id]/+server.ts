import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';

//temp dictionary
function getMimeType(filename: string) {
	const ext = filename.split('.').pop()?.toLowerCase();
	const mimeTypes: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		webp: 'image/webp',
		mp4: 'video/mp4',
		webm: 'video/webm',
		mp3: 'audio/mpeg',
		pdf: 'application/pdf',
		txt: 'text/plain',
		json: 'application/json'
	};
	//else generic downloadable file
	return mimeTypes[ext || ''] || 'application/octet-stream';
}

export async function GET({ params }) {
	const { id } = params;

	//look up the file
	const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
	const fileRecord = stmt.get(id) as
		| { disk_name: string; original_name: string; size: number }
		| undefined;

	//if the if isn't in db, 404
	if (!fileRecord) {
		error(404, 'File not found');
	}

	//find file
	const uploadDir = env.UPLOAD_DIR || path.resolve(process.cwd(), 'local_uploads');
	const filePath = path.join(uploadDir, fileRecord.disk_name);

	if (!fs.existsSync(filePath)) {
		error(404, 'File missing from disk');
	}

	//size and file type
	const stat = fs.statSync(filePath);
	const mimeType = getMimeType(fileRecord.original_name);

	//web stream
	const nodeStream = fs.createReadStream(filePath);
	const webStream = Readable.toWeb(nodeStream);

	return new Response(webStream as ReadableStream, {
		headers: {
			'Content-Type': mimeType,
			'Content-Length': stat.size.toString(),
			'Content-Disposition': `inline; filename="${fileRecord.original_name}"`,
			//tell apps they can cache this image for awhile
			'Cache-Control': 'public, max-age=31536000'
		}
	});
}
