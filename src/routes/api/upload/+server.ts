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
		const folderId = data.get('folderId') as string | null;

		//validate uploadId to prevent path traversal
		if (!uploadId || !/^[a-z0-9]+$/.test(uploadId)) {
			return json({ error: 'invalid upload identifier' }, { status: 400 });
		}

		const originalName = data.get('filename') as string;
		const chunkIndex = parseInt(data.get('chunkIndex') as string);
		const totalChunks = parseInt(data.get('totalChunks') as string);
		const totalSize = parseInt(data.get('totalSize') as string);
		const isEncrypted = data.get('isEncrypted') === 'true' ? 1 : 0;
		const userRetention = data.get('retention') ? parseInt(data.get('retention') as string) : null;

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

		const globalRetention = parseInt(settingsMap['retention_policy'] || '0');
		let finalRetention = userRetention;

		if (globalRetention !== 0) {
			if (userRetention === null || userRetention > globalRetention || userRetention === 0) {
				finalRetention = globalRetention;
			}
		}

		const maxSize = parseInt(settingsMap['max_upload_size']);
		if (totalSize > maxSize) {
			return json(
				{ error: `File too large. Max size is ${(maxSize / (1024 * 1024)).toFixed(2)} MB` },
				{ status: 400 }
			);
		}

		const bannedTypes = settingsMap['banned_file_types'] || '';
		if (bannedTypes.trim() !== '') {
			const extensions = bannedTypes
				.split(',')
				.map((ext) => ext.trim().toLowerCase().replace(/^\./, ''));
			const fileExt = path.extname(originalName).toLowerCase().replace(/^\./, '');

			const isBanned = extensions.some((ext) => {
				if (ext === 'none' && fileExt === '') return true;
				return ext === fileExt;
			});

			if (isBanned) {
				return json(
					{ error: `File type ${fileExt ? '.' + fileExt : 'with no extension'} is banned` },
					{ status: 400 }
				);
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

			//generic filename on disk for encrypted files
			const safeFilename = isEncrypted
				? `${shortId}-encrypted`
				: `${shortId}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

			const finalFilePath = path.join(uploadDir, safeFilename);

			await fs.rename(tempFilePath, finalFilePath);

			const stmt = db.prepare(`
					INSERT INTO files (id, original_name, disk_name, size, is_encrypted, custom_retention, folder_id)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`);
			stmt.run(shortId, originalName, safeFilename, totalSize, isEncrypted, finalRetention, folderId);

			//generate full url if site_domain is set
			const domain = settingsMap['site_domain']?.replace(/\/$/, '') || '';
			const ext = path.extname(originalName);
			const shareUrl = domain ? `${domain}/${shortId}${ext}` : `/${shortId}${ext}`;

			//return share link
			return json({
				success: true,
				message: 'Upload complete!',
				url: shareUrl,
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
