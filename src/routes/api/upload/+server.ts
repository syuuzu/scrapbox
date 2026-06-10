import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

//handle post requests
export async function POST({ request }) {
	try {
		//get the form data from the incoming request
		const data = await request.formData();
		const file = data.get('file') as File;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		//convert the web File into a node.js buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		//temp upload dir
		const uploadDir = path.resolve(process.cwd(), 'uploads');
		await fs.mkdir(uploadDir, { recursive: true });

		//strip weird file names avoid command injection
		const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
		const filePath = path.join(uploadDir, safeFilename);

		//write file
		await fs.writeFile(filePath, buffer);

		//send awk
		return json({
			success: true,
			message: 'file uploaded successfully',
			filename: safeFilename
		});
	} catch (err) {
		console.error('backend upload error:', err);
		return json({ error: 'Server error during upload' }, { status: 500 });
	}
}
