<script lang="ts">
	import {
		Image,
		File,
		Trash2,
		Copy,
		Check,
		HardDrive,
		Calendar,
		ArrowLeft,
		Clock,
		Lock
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
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

	let selectedIds = $state<string[]>([]);
	let copiedId = $state('');

	function toggleSelect(id: string, event: MouseEvent) {
		event.stopPropagation();
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	async function copyLink(file: FileRecord) {
		const url = getFileUrl(file);
		try {
			//if domain is relative make it absolute for clipboard
			const absoluteUrl = url.startsWith('http')
				? url
				: window.location.origin + (url.startsWith('/') ? '' : '/') + url;

			await navigator.clipboard.writeText(absoluteUrl);
			copiedId = file.id;
			setTimeout(() => {
				if (copiedId === file.id) copiedId = '';
			}, 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
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

	function getFileUrl(file: FileRecord) {
		const domain = data.siteDomain.replace(/\/$/, '') || '';
		let ext = '';
		if (file.original_name) {
			const parts = file.original_name.split('.');
			if (parts.length > 1) ext = '.' + parts.pop();
		}
		return domain ? `${domain}/${file.id}${ext}` : `/${file.id}${ext}`;
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
	<title>{data.settings.site_title} - gallery</title>
</svelte:head>

<main class="container">
	<div class="header-container">
		<div class="top-row">
			<a href="/dashboard/settings" class="back-link"><ArrowLeft size={16} /> back to settings</a>
			{#if selectedIds.length > 0}
				<form
					method="POST"
					action="?/deleteFiles"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								selectedIds = [];
								await update();
							}
						};
					}}
				>
					<input type="hidden" name="ids" value={selectedIds.join(',')} />
					<button
						type="submit"
						class="bulk-delete-btn"
						onclick={(e) =>
							!confirm(`Are you sure you want to delete ${selectedIds.length} files?`) &&
							e.preventDefault()}
					>
						<Trash2 size={16} /> delete selected ({selectedIds.length})
					</button>
				</form>
			{/if}
		</div>
		<h1><Image size={32} /> upload gallery</h1>
		<p class="stats">
			<HardDrive size={16} /> total files: {data.files.length}
		</p>
	</div>

	<div class="storage-container">
		<div class="storage-info">
			<div class="storage-item">
				<div class="dot uploads"></div>
				<span>uploads: {formatSize(data.storageStats.totalUploadsSize)}</span>
			</div>
			<div class="storage-item">
				<div class="dot free"></div>
				<span>free space: {formatSize(data.storageStats.diskFree)}</span>
			</div>
			<div class="storage-item total">
				<span>total disk: {formatSize(data.storageStats.diskTotal)}</span>
			</div>
		</div>
		<div class="storage-bar-wrapper">
			<div
				class="storage-segment uploads"
				style="width: {(data.storageStats.totalUploadsSize / data.storageStats.diskTotal) * 100}%"
				title="Uploads: {formatSize(data.storageStats.totalUploadsSize)}"
			></div>
			<div
				class="storage-segment other"
				style="width: {((data.storageStats.diskTotal -
					data.storageStats.diskFree -
					data.storageStats.totalUploadsSize) /
					data.storageStats.diskTotal) *
					100}%"
				title="Other: {formatSize(
					data.storageStats.diskTotal -
						data.storageStats.diskFree -
						data.storageStats.totalUploadsSize
				)}"
			></div>
		</div>
	</div>

	{#if data.files.length === 0}
		<div class="empty-state">
			<File size={48} />
			<p>no files uploaded yet</p>
		</div>
	{:else}
		<div class="gallery-grid {selectedIds.length > 0 ? 'selection-mode' : ''}">
			{#each data.files as file (file.id)}
				<div class="file-card {selectedIds.includes(file.id) ? 'selected' : ''}">
					<button
						class="select-circle {selectedIds.includes(file.id) ? 'active' : ''}"
						onclick={(e) => toggleSelect(file.id, e)}
						aria-label="Select file"
					></button>
					<a
						href={getFileUrl(file)}
						target="_blank"
						class="card-link"
						onclick={(e) => {
							if (selectedIds.length > 0) {
								e.preventDefault();
								toggleSelect(file.id, e);
							}
						}}
					>
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
						<button class="action-btn copy-btn" title="Copy link" onclick={() => copyLink(file)}>
							{#if copiedId === file.id}
								<Check size={18} class="success-icon" />
							{:else}
								<Copy size={18} />
							{/if}
						</button>
						<form
							method="POST"
							action="?/deleteFiles"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										await update();
									}
								};
							}}
						>
							<input type="hidden" name="ids" value={file.id} />
							<button
								type="submit"
								class="action-btn delete-btn"
								title="Delete file"
								onclick={(e) =>
									!confirm('Are you sure you want to delete this file?') && e.preventDefault()}
							>
								<Trash2 size={18} />
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 1200px;
		padding: 2rem;
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

	.bulk-delete-btn {
		background-color: #ff4757;
		color: #fff;
		border: none;
		border-radius: 6px;
		padding: 0.4rem 0.8rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: opacity 0.2s;
	}

	.bulk-delete-btn:hover {
		opacity: 0.9;
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

	.storage-container {
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.storage-info {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		font-size: 0.9rem;
		color: var(--text-main);
	}

	.storage-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.storage-item.total {
		margin-left: auto;
		color: var(--text-muted);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.dot.uploads {
		background-color: var(--accent);
	}

	.dot.free {
		background-color: var(--border-color);
	}

	.storage-bar-wrapper {
		width: 100%;
		height: 12px;
		background-color: var(--border-color);
		border-radius: 6px;
		overflow: hidden;
		display: flex;
	}

	.storage-segment {
		height: 100%;
		transition: width 0.3s ease;
	}

	.storage-segment.uploads {
		background-color: var(--accent);
	}

	.storage-segment.other {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 5rem;
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px dashed var(--border-color);
		border-radius: 12px;
		color: var(--text-muted);
		gap: 1rem;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.gallery-grid.selection-mode .card-link {
		cursor: pointer;
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

	.file-card.selected {
		border-color: var(--accent);
		background-color: rgba(212, 184, 114, 0.05);
	}

	.select-circle {
		position: absolute;
		top: 10px;
		right: 10px;
		width: 20px;
		height: 20px;
		border: 2px solid var(--border-color);
		border-radius: 50%;
		background-color: rgba(0, 0, 0, 0.3);
		cursor: pointer;
		z-index: 10;
		transition: all 0.2s;
		padding: 0;
	}

	.select-circle:hover {
		border-color: var(--accent);
	}

	.select-circle.active {
		background-color: var(--accent);
		border-color: var(--accent);
	}

	.select-circle.active::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 10px;
		height: 10px;
		background-color: #000;
		border-radius: 50%;
		transform: translate(-50%, -50%);
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

	.delete-btn:hover {
		color: #ff4757;
		border-color: #ff4757;
		background-color: rgba(255, 71, 87, 0.05);
	}
</style>
