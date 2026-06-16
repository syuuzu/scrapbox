import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';

function generateShortId(length: number) {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
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

		//check settings
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

		const maxSize = parseInt(settingsMap['max_upload_size']);
		if (totalSize > maxSize) {
			return json(
				{ error: `File too large. Max size is ${(maxSize / (1024 * 1024)).toFixed(2)} MB` },
				{ status: 400 }
			);
		}

		const allowedTypes = settingsMap['allowed_file_types'];
		if (allowedTypes !== '*') {
			const extensions = allowedTypes
				.split(',')
				.map((ext) => ext.trim().toLowerCase().replace(/^\./, ''));
			const fileExt = path.extname(originalName).toLowerCase().replace(/^\./, '');
			if (!extensions.includes(fileExt)) {
				return json({ error: `File type .${fileExt} not allowed` }, { status: 400 });
			}
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
			const idLength = parseInt(settingsMap['short_id_length'] || '8');
			const shortId = generateShortId(idLength);
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
