// src/lib/server/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '$env/dynamic/private';

//use env to set data dir
const dataDir = env.DATA_DIR || path.resolve(process.cwd(), 'local_data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

//join to db
const dbPath = path.join(dataDir, 'scrapbox.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.exec(`
	CREATE TABLE IF NOT EXISTS files (
		id TEXT PRIMARY KEY,
		original_name TEXT NOT NULL,
		disk_name TEXT NOT NULL,
		size INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)
`);

export default db;
