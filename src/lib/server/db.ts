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

//settings table
db.exec(`
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	)
`);

//default will be 50MB, forever upload time, all file types
const defaultSettings = [
	{ key: 'retention_policy', value: '0' },
	{ key: 'max_upload_size', value: '52428800' },
	{ key: 'allowed_file_types', value: '*' },
	{ key: 'theme', value: 'default' },
	{ key: 'rate_limit_window', value: '1000' },
	{ key: 'rate_limit_max', value: '100' },
	{ key: 'short_id_length', value: '8' }
];

//load settings
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const setting of defaultSettings) {
	insertSetting.run(setting.key, setting.value);
}

export default db;
