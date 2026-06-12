import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';

function generateShortId() {
	return Math.random().toString(36).substring(2, 8);
}
//handle post requests
export async function POST({ request }) {
	try {
		const data = await request.formData();

		const chunk = data.get('chunk') as Blob;
		const uploadId = data.get('uploadId') as string;
		const originalName = data.get('filename') as string;
		const chunkIndex = parseInt(data.get('chunkIndex') as string);
		const totalChunks = parseInt(data.get('totalChunks') as string);
		const totalSize = parseInt(data.get('totalSize') as string);

		if (!chunk || !uploadId) {
			return json({ error: 'missing chunk data' }, { status: 400 });
		}

		const arrayBuffer = await chunk.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const uploadDir = env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
		await fs.mkdir(uploadDir, { recursive: true });

		//save chunks in part file
		const tempFilePath = path.join(uploadDir, `${uploadId}.part`);
		await fs.appendFile(tempFilePath, buffer);

		//check if last chunk
		if (chunkIndex === totalChunks - 1) {
			const shortId = generateShortId();
			const safeFilename = `${shortId}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
			const finalFilePath = path.join(uploadDir, safeFilename);

			await fs.rename(tempFilePath, finalFilePath);

			const stmt = db.prepare(`
					INSERT INTO files (id, original_name, disk_name, size)
					VALUES (?, ?, ?, ?)
				`);
			stmt.run(shortId, originalName, safeFilename, totalSize);

			//return share link
			return json({
				success: true,
				message: 'Upload complete!',
				url: `/f/${shortId}`,
				finished: true
			});
		}
		//else send the next chunk
		return json({ success: true, finished: false });
	} catch (err) {
		console.error('Chunk upload error:', err);
		return json({ error: 'Internal server error during chunking' }, { status: 500 });
	}
}
