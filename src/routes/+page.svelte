<script lang="ts">
	import { CloudUpload, Settings } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let maxUploadSizeFormatted = $derived.by(() => {
		const bytes = parseInt(data.settings.max_upload_size);
		if (bytes >= 1024 * 1024 * 1024 && bytes % (1024 * 1024 * 1024) === 0) {
			return `${bytes / (1024 * 1024 * 1024)} GB`;
		}
		if (bytes >= 1024 * 1024 && bytes % (1024 * 1024) === 0) {
			return `${bytes / (1024 * 1024)} MB`;
		}
		return `${Math.round(bytes / 1024)} KB`;
	});

	let isDragging = $state(false);
	let dragCount = $state(0);
	let files: FileList | null = $state(null);
	let uploadProgress = $state(0);
	let finalUrl = $state('');

	async function uploadFile(file: File) {
		//chunks will be 1MB
		const CHUNK_SIZE = 1024 * 1024;
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

		const uploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);
		finalUrl = '';
		uploadProgress = 0;

		for (let i = 0; i < totalChunks; i++) {
			//calculate where to slice the file
			const start = i * CHUNK_SIZE;
			const end = Math.min(start + CHUNK_SIZE, file.size);
			const chunk = file.slice(start, end);

			const formData = new FormData();
			formData.append('chunk', chunk);
			formData.append('uploadId', uploadId);
			formData.append('filename', file.name);
			formData.append('chunkIndex', i.toString());
			formData.append('totalChunks', totalChunks.toString());
			formData.append('totalSize', file.size.toString());

			try {
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (!result.success) {
					console.error('Upload failed on chunk', i, result.error);
					alert('Upload failed!');
					return;
				}

				//progress bar
				uploadProgress = Math.round(((i + 1) / totalChunks) * 100);

				if (result.finished) {
					finalUrl = result.url;
					console.log('Upload complete! Link:', finalUrl);
				}
			} catch (error) {
				console.error('Network error on chunk', i, error);
				return;
			}
		}
	}

	//handlers for drag and drop
	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragCount++;

		if (dragCount > 0) {
			isDragging = true;
		}
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		//mouse left the box
		dragCount--;
		if (dragCount === 0) {
			//left all layers so no longer dragging
			isDragging = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		//reset when dropped
		dragCount = 0;
		isDragging = false;
		if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
			files = event.dataTransfer.files;
			console.log('Uploading dropped file:', files[0].name);

			//upload
			uploadFile(files[0]);
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			files = target.files;
			console.log('File selected:', files[0].name);

			//upload
			uploadFile(files[0]);
		}
	}
</script>

<main class="container">
	{#if data.isAdmin}
		<a href="/settings" class="settings-link" title="Settings">
			<Settings size={24} />
		</a>
	{/if}

	<div class="logo-container">
		<h1>scrapbox</h1>
	</div>

	<div
		class="upload-box {isDragging ? 'dragging' : ''}"
		role="region"
		aria-label="file drop zone"
		ondragenter={handleDragEnter}
		ondragleave={handleDragLeave}
		ondragover={(e) => e.preventDefault()}
		ondrop={handleDrop}
	>
		<input type="file" id="file-upload" class="hidden-input" onchange={handleFileSelect} />

		<label for="file-upload" class="upload-content">
			<CloudUpload size={64} strokeWidth={1.5} class="icon" />
			<h2>click or drag to upload</h2>
			<p class="subtitle">
				{maxUploadSizeFormatted} max per file
			</p>
		</label>
	</div>

	{#if uploadProgress > 0 && uploadProgress < 100}
		<div class="progress-container">
			<p>Uploading... {uploadProgress}%</p>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {uploadProgress}%"></div>
			</div>
		</div>
	{/if}

	{#if finalUrl}
		<div class="success-box">
			<p>Upload Complete!</p>
			<a href={finalUrl} target="_blank" rel="external" class="share-link">
				{finalUrl}
			</a>
		</div>
	{/if}
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		width: 100%;
		max-width: 600px;
		padding: 2rem;
		position: relative;
	}

	.settings-link {
		position: absolute;
		top: 1rem;
		right: 1rem;
		color: var(--text-muted);
		transition: color 0.2s;
	}

	.settings-link:hover {
		color: var(--accent);
	}

	.logo-container {
		text-align: center;
	}

	.logo-container h1 {
		color: var(--accent);
		font-size: 2rem;
		margin: 0;
		letter-spacing: 2px;
	}

	.upload-box {
		width: 100%;
		border: 2px dashed var(--border-color);
		border-radius: 12px;
		background-color: transparent;
		transition: all 0.2s ease-in-out;
		cursor: pointer;
	}

	.upload-box:hover {
		border-color: var(--text-muted);
	}

	/*change appearance when a file is dragged over the window */
	.upload-box.dragging {
		border-color: var(--accent);
		background-color: rgba(212, 184, 114, 0.05);
	}

	.hidden-input {
		display: none;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		cursor: pointer;
		text-align: center;
	}

	:global(.icon) {
		margin-bottom: 1rem;
		color: var(--text-main);
	}

	h2 {
		font-size: 1.2rem;
		font-weight: normal;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 0.9rem;
		margin: 0;
	}

	.progress-container {
		width: 100%;
		max-width: 400px;
		text-align: center;
		color: var(--text-muted);
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background-color: var(--border-color);
		border-radius: 4px;
		overflow: hidden;
		margin-top: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background-color: var(--accent);
		transition: width 0.2s linear;
	}

	.success-box {
		text-align: center;
		padding: 1rem 2rem;
		border: 1px solid var(--accent);
		border-radius: 8px;
		background-color: rgba(212, 184, 114, 0.05);
	}

	.success-box p {
		margin: 0 0 0.5rem 0;
		color: var(--text-main);
	}

	.share-link {
		color: var(--accent);
		text-decoration: underline;
		font-size: 1.2rem;
	}
</style>
