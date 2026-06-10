<script lang="ts">
	//imports
	import { CloudUpload } from 'lucide-svelte';

	let isDragging = $state(false);
	let dragCount = $state(0);
	let files: FileList | null = $state(null);

	async function uploadFile(file: File) {
		const formData = new FormData();
		formData.append('file', file);

		try {
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.success) {
				console.log('Backend says:', result.message);
				console.log('Saved as:', result.filename);
			} else {
				console.error('Upload failed:', result.error);
			}
		} catch (error) {
			console.error('Network error during upload:', error);
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
			<p class="subtitle">300 MB max per file</p>
		</label>
	</div>

	{#if files && files.length > 0}
		<p class="success-text">Selected: {files[0].name}</p>
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

	.success-text {
		color: var(--accent);
		font-size: 0.9rem;
	}
</style>
