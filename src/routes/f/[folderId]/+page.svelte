<script lang="ts">
	import {
		File,
		Copy,
		Check,
		HardDrive,
		Calendar,
		ArrowLeft,
		Clock,
		Lock,
		FolderOpen
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	interface FileRecord {
		id: string;
		original_name: string;
		disk_name: string;
		size: number;
		is_encrypted: number;
		custom_retention: number | null;
		created_at: string;
	}

	let { data }: { data: PageData & { files: FileRecord[] } } = $props();

	let copiedId = $state('');
	let allCopied = $state(false);

	async function copyLink(id: string) {
		const url = getFileUrl(id);
		try {
			const absoluteUrl = url.startsWith('http')
				? url
				: window.location.origin + (url.startsWith('/') ? '' : '/') + url;

			await navigator.clipboard.writeText(absoluteUrl);
			copiedId = id;
			setTimeout(() => {
				if (copiedId === id) copiedId = '';
			}, 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
		}
	}

	async function copyAllLinks() {
		try {
			const links = data.files
				.map((file: FileRecord) => {
					const url = getFileUrl(file.id);
					return url.startsWith('http')
						? url
						: window.location.origin + (url.startsWith('/') ? '' : '/') + url;
				})
				.join('\n');

			await navigator.clipboard.writeText(links);
			allCopied = true;
			setTimeout(() => {
				allCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy all links:', err);
		}
	}

	function formatSize(bytes: number) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function isImage(file: FileRecord) {
		if (file.is_encrypted) return false;
		return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.original_name);
	}

	function getFileUrl(id: string) {
		const domain = data.siteDomain.replace(/\/$/, '') || '';
		return domain ? `${domain}/${id}` : `/${id}`;
	}

	function getTimeLeft(file: FileRecord) {
		const retention = file.custom_retention ?? data.retentionPolicy;
		if (retention === 0) return 'forever';

		const createdAt = file.created_at.includes(' ')
			? file.created_at.replace(' ', 'T') + 'Z'
			: file.created_at;
		const created = new Date(createdAt).getTime();
		const expires = created + retention * 60 * 1000;
		const now = Date.now();
		const diff = expires - now;

		if (diff <= 0) return 'expired';

		const minutes = Math.floor(diff / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d left`;
		if (hours > 0) return `${hours}h left`;
		return `${minutes}m left`;
	}
</script>

<svelte:head>
	<title>{data.siteTitle} - folder gallery</title>
</svelte:head>

<main class="container">
	<div class="header-container">
		<div class="top-row">
			<a href="/" class="back-link"><ArrowLeft size={16} /> back to upload</a>
			<button class="copy-all-btn" onclick={copyAllLinks}>
				{#if allCopied}
					<Check size={16} /> copied all
				{:else}
					<Copy size={16} /> copy all links
				{/if}
			</button>
		</div>
		<h1><FolderOpen size={32} /> folder gallery</h1>
		<p class="stats">
			<HardDrive size={16} /> total files: {data.files.length}
		</p>
	</div>

	<div class="gallery-grid">
		{#each data.files as file (file.id)}
			<div class="file-card">
				<a href={getFileUrl(file.id)} target="_blank" class="card-link">
					<div class="preview">
						{#if isImage(file)}
							<img src="/{file.id}" alt={file.original_name} loading="lazy" />
						{:else}
							<div class="file-icon">
								{#if file.is_encrypted}
									<Lock size={48} class="lock-icon" />
									<span class="ext">encrypted</span>
								{:else}
									<File size={48} />
									<span class="ext">{file.original_name.split('.').pop()}</span>
								{/if}
							</div>
						{/if}
					</div>

					<div class="info">
						<h3 title={file.is_encrypted ? file.id : file.original_name}>
							{#if file.is_encrypted}{file.id}-encrypted
							{:else}{file.original_name}
							{/if}
						</h3>
						<div class="meta">
							<span><HardDrive size={12} /> {formatSize(file.size)}</span>
							<span><Calendar size={12} /> {new Date(file.created_at).toLocaleDateString()}</span>
							<span class="time-left {getTimeLeft(file) === 'expired' ? 'expired' : ''}">
								<Clock size={12} />
								{getTimeLeft(file)}
							</span>
						</div>
					</div>
				</a>

				<div class="actions">
					<button
						class="action-btn copy-btn"
						title="Copy link"
						onclick={(e) => {
							e.preventDefault();
							copyLink(file.id);
						}}
					>
						{#if copiedId === file.id}
							<Check size={18} class="success-icon" />
						{:else}
							<Copy size={18} />
						{/if}
					</button>
				</div>
			</div>
		{/each}
	</div>
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 1200px;
		padding: 2rem;
		margin: 0 auto;
	}

	.header-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.back-link {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.back-link:hover {
		color: var(--accent);
	}

	.copy-all-btn {
		background-color: rgba(212, 184, 114, 0.1);
		color: var(--accent);
		border: 1px solid var(--accent);
		border-radius: 6px;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
	}

	.copy-all-btn:hover {
		background-color: var(--accent);
		color: var(--bg-color);
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--accent);
		margin: 0;
		font-size: 2rem;
	}

	.stats {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
		font-size: 0.9rem;
		margin: 0.5rem 0 0 0;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.file-card {
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		position: relative;
		transition:
			transform 0.2s,
			border-color 0.2s;
	}

	.file-card:hover {
		transform: translateY(-4px);
		border-color: var(--accent);
	}

	.card-link {
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.preview {
		height: 180px;
		background-color: rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}

	.preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.file-icon {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
	}

	.file-icon .ext {
		font-size: 0.8rem;
		font-weight: bold;
		text-transform: uppercase;
		background: rgba(255, 255, 255, 0.1);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
	}

	.info {
		padding: 1rem;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		color: var(--text-main);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.meta span {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.time-left {
		color: var(--accent);
		font-weight: 500;
	}

	.time-left.expired {
		color: #ff4757;
	}

	.actions {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		background-color: rgba(0, 0, 0, 0.1);
	}

	.action-btn {
		background: transparent;
		border: 1px solid var(--border-color);
		color: var(--text-muted);
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}

	.copy-btn:hover {
		color: var(--accent);
		border-color: var(--accent);
		background-color: rgba(212, 184, 114, 0.05);
	}

	:global(.success-icon) {
		color: var(--accent);
	}
</style>
