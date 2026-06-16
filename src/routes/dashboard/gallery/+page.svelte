<script lang="ts">
	import { Image, File, Trash2, ExternalLink, HardDrive, Calendar, ArrowLeft } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatSize(bytes: number) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function isImage(filename: string) {
		return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);
	}

	function getFileUrl(id: string) {
		const domain = data.siteDomain.replace(/\/$/, '') || '';
		return domain ? `${domain}/${id}` : `/${id}`;
	}
</script>

<main class="container">
	<div class="header-container">
		<div class="top-row">
			<a href="/dashboard/settings" class="back-link"><ArrowLeft size={16} /> back to settings</a>
		</div>
		<h1><Image size={32} /> upload gallery</h1>
		<p class="stats">
			<HardDrive size={16} /> total files: {data.files.length}
		</p>
	</div>

	{#if data.files.length === 0}
		<div class="empty-state">
			<File size={48} />
			<p>no files uploaded yet</p>
		</div>
	{:else}
		<div class="gallery-grid">
			{#each data.files as file (file.id)}
				<div class="file-card">
					<div class="preview">
						{#if isImage(file.original_name)}
							<img src="/{file.id}" alt={file.original_name} loading="lazy" />
						{:else}
							<div class="file-icon">
								<File size={48} />
								<span class="ext">{file.original_name.split('.').pop()}</span>
							</div>
						{/if}
					</div>

					<div class="info">
						<h3 title={file.original_name}>{file.original_name}</h3>
						<div class="meta">
							<span><HardDrive size={12} /> {formatSize(file.size)}</span>
							<span><Calendar size={12} /> {new Date(file.created_at).toLocaleDateString()}</span>
						</div>
					</div>

					<div class="actions">
						<a
							href={getFileUrl(file.id)}
							target="_blank"
							class="action-btn view-btn"
							title="View file"
						>
							<ExternalLink size={18} />
						</a>
						<form
							method="POST"
							action="?/deleteFile"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										await update();
									}
								};
							}}
						>
							<input type="hidden" name="id" value={file.id} />
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

	.file-card {
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition:
			transform 0.2s,
			border-color 0.2s;
	}

	.file-card:hover {
		transform: translateY(-4px);
		border-color: var(--accent);
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

	.view-btn:hover {
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
