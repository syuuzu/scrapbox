<script lang="ts">
	import {
		CloudUpload,
		Settings,
		Lock,
		Unlock,
		Eye,
		EyeOff,
		ShieldCheck,
		Clock
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let retentionText = $derived.by(() => {
		const policy = selectedRetention;
		if (policy === 0) return 'forever';

		if (policy >= 1440) {
			const days = Math.floor(policy / 1440);
			return `for ${days} day${days > 1 ? 's' : ''}`;
		}
		if (policy >= 60) {
			const hours = Math.floor(policy / 60);
			return `for ${hours} hour${hours > 1 ? 's' : ''}`;
		}
		return `for ${policy} minute${policy > 1 ? 's' : ''}`;
	});

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
	let totalFilesToUpload = $state(0);
	let currentFileUploading = $state(0);
	let finalUrl = $state('');
	let copied = $state(false);

	let isEncryptionEnabled = $state(false);
	let password = $state('');
	let showPassword = $state(false);
	let selectedRetention = $state(0);
	let isRetentionMenuOpen = $state(false);

	const retentionOptions = $derived.by(() => {
		const globalMax = parseInt(data.settings.retention_policy || '0');
		const allOptions = [
			{ label: '5 minutes', value: 5 },
			{ label: '30 minutes', value: 30 },
			{ label: '1 hour', value: 60 },
			{ label: '12 hours', value: 720 },
			{ label: '1 day', value: 1440 },
			{ label: '3 days', value: 4320 },
			{ label: '1 week', value: 10080 },
			{ label: '1 month', value: 43800 },
			{ label: '1 year', value: 525600 },
			{ label: 'forever', value: 0 }
		];

		let filtered = allOptions.filter((opt) => {
			if (globalMax === 0) return true;
			if (opt.value === 0) return false;
			return opt.value <= globalMax;
		});

		//add global max to options
		if (globalMax !== 0 && !filtered.some((opt) => opt.value === globalMax)) {
			const insertIndex = filtered.findIndex((opt) => opt.value > globalMax);

			//format the label using the same logic as the settings page
			const formattedLabel = (() => {
				if (globalMax % 525600 === 0)
					return `${globalMax / 525600} year${globalMax / 525600 > 1 ? 's' : ''}`;
				if (globalMax % 43200 === 0)
					return `${globalMax / 43200} month${globalMax / 43200 > 1 ? 's' : ''}`;
				if (globalMax % 1440 === 0)
					return `${globalMax / 1440} day${globalMax / 1440 > 1 ? 's' : ''}`;
				if (globalMax % 60 === 0) return `${globalMax / 60} hour${globalMax / 60 > 1 ? 's' : ''}`;
				return `${globalMax} minutes`;
			})();

			const maxOption = {
				label: formattedLabel,
				value: globalMax
			};
			if (insertIndex === -1) {
				filtered.push(maxOption);
			} else {
				filtered.splice(insertIndex, 0, maxOption);
			}
		}

		return filtered;
	});

	let retentionIndex = $state(0);

	//sync selectedRetention with the slider index
	$effect(() => {
		if (retentionOptions.length > 0) {
			selectedRetention = retentionOptions[retentionIndex]?.value ?? retentionOptions[0].value;
		}
	});

	$effect(() => {
		if (retentionOptions.length > 0) {
			retentionIndex = retentionOptions.length - 1;
		}
	});

	//encryption utilities
	async function deriveKey(pass: string, salt: Uint8Array) {
		const encoder = new TextEncoder();
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			encoder.encode(pass),
			{ name: 'PBKDF2' },
			false,
			['deriveKey']
		);
		return crypto.subtle.deriveKey(
			{
				name: 'PBKDF2',
				salt: salt,
				iterations: 100000,
				hash: 'SHA-256'
			} as Pbkdf2Params,
			keyMaterial,
			{ name: 'AES-GCM', length: 256 },
			true,
			['encrypt', 'decrypt']
		);
	}

	async function encryptFile(file: File, pass: string) {
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const key = await deriveKey(pass, salt);

		const arrayBuffer = await file.arrayBuffer();

		//[2 bytes: name length][name bytes][file bytes]
		const nameEncoder = new TextEncoder();
		const nameBytes = nameEncoder.encode(file.name);
		const combinedPlaintext = new Uint8Array(2 + nameBytes.length + arrayBuffer.byteLength);

		//store name length as a 16-bit integer
		combinedPlaintext[0] = (nameBytes.length >> 8) & 0xff;
		combinedPlaintext[1] = nameBytes.length & 0xff;
		combinedPlaintext.set(nameBytes, 2);
		combinedPlaintext.set(new Uint8Array(arrayBuffer), 2 + nameBytes.length);

		const encryptedContent = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv },
			key,
			combinedPlaintext
		);

		//salt + IV + encrypted data
		const result = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
		result.set(salt, 0);
		result.set(iv, salt.length);
		result.set(new Uint8Array(encryptedContent), salt.length + iv.length);

		return new Blob([result], { type: 'application/octet-stream' });
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(finalUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}

	async function uploadSingleFile(file: File, folderId: string | null) {
		let fileToUpload: File | Blob = file;
		let originalFileName = file.name;

		if (isEncryptionEnabled) {
			if (!password) {
				throw new Error('Please enter a password for encryption.');
			}
			uploadProgress = 1; //show initial activity
			try {
				fileToUpload = await encryptFile(file, password);
				originalFileName = 'encrypted-file';
			} catch (err) {
				console.error('Encryption failed:', err);
				throw new Error('Failed to encrypt file. Please try again.', { cause: err });
			}
		}

		//chunks will be 1MB
		const CHUNK_SIZE = 1024 * 1024;
		const totalChunks = Math.ceil(fileToUpload.size / CHUNK_SIZE);

		const uploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);
		let fileFinalUrl = '';

		for (let i = 0; i < totalChunks; i++) {
			const start = i * CHUNK_SIZE;
			const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
			const chunk = fileToUpload.slice(start, end);

			let retries = 3;
			let success = false;

			while (retries > 0 && !success) {
				const formData = new FormData();
				formData.append('chunk', chunk);
				formData.append('uploadId', uploadId);
				if (folderId) formData.append('folderId', folderId);
				formData.append('filename', originalFileName);
				formData.append('chunkIndex', i.toString());
				formData.append('totalChunks', totalChunks.toString());
				formData.append('totalSize', fileToUpload.size.toString());
				formData.append('isEncrypted', isEncryptionEnabled ? 'true' : 'false');
				formData.append('retention', selectedRetention.toString());

				try {
					const response = await fetch('/api/upload', {
						method: 'POST',
						body: formData
					});

					if (response.status === 429) {
						//handle rate limit
						const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
						await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
						continue; //retry without decrementing retries for rate limits
					}

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					const result = await response.json();

					if (!result.success) {
						console.error('Upload failed on chunk', i, result.error);
						throw new Error(`Upload failed: ${result.error}`);
					}

					success = true;
					uploadProgress = Math.round(((i + 1) / totalChunks) * 100);

					if (result.finished) {
						fileFinalUrl = result.url;
					}
				} catch (error) {
					console.error(`Error on chunk ${i}, attempts remaining: ${retries - 1}`, error);
					retries--;
					if (retries === 0) {
						throw new Error(
							'Upload failed after multiple attempts. Please check your connection.',
							{ cause: error }
						);
					}
					//exponential backoff
					await new Promise((resolve) => setTimeout(resolve, (3 - retries) * 1000));
				}
			}
		}
		return fileFinalUrl;
	}

	async function uploadFiles(fileList: FileList) {
		if (fileList.length === 0) return;

		const maxSize = parseInt(data.settings.max_upload_size || '52428800');

		for (let i = 0; i < fileList.length; i++) {
			if (fileList[i].size > maxSize) {
				const sizeMB = (maxSize / (1024 * 1024)).toFixed(2);
				alert(`File "${fileList[i].name}" is larger than ${sizeMB} MB`);
				return;
			}
		}

		totalFilesToUpload = fileList.length;
		currentFileUploading = 1;
		finalUrl = '';
		uploadProgress = 0;

		let folderId: string | null = null;
		if (fileList.length > 1) {
			folderId = Math.random().toString(36).substring(2, 10);
		}

		try {
			let lastUrl = '';
			for (let i = 0; i < fileList.length; i++) {
				currentFileUploading = i + 1;
				uploadProgress = 0;
				lastUrl = await uploadSingleFile(fileList[i], folderId);
			}

			if (fileList.length > 1) {
				const domain = data.settings.site_domain?.replace(/\/$/, '') || '';
				finalUrl = domain ? `${domain}/f/${folderId}` : `/f/${folderId}`;
			} else {
				finalUrl = lastUrl;
			}
		} catch (err) {
			alert(err instanceof Error ? err.message : String(err));
		} finally {
			totalFilesToUpload = 0;
			currentFileUploading = 0;
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
			console.log('Uploading dropped files:', files.length);

			//upload
			uploadFiles(files);
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			files = target.files;
			console.log('Files selected:', files.length);

			//upload
			uploadFiles(files);
		}
	}
</script>

<svelte:head>
	<title>{data.settings.site_title}</title>
</svelte:head>

<main class="container">
	<div class="logo-container">
		<h1>{data.settings.site_title}</h1>
	</div>

	<div class="upload-area">
		<div
			class="upload-box {isDragging ? 'dragging' : ''}"
			role="region"
			aria-label="file drop zone"
			ondragenter={handleDragEnter}
			ondragleave={handleDragLeave}
			ondragover={(e) => e.preventDefault()}
			ondrop={handleDrop}
		>
			<input
				type="file"
				id="file-upload"
				class="hidden-input"
				multiple
				onchange={handleFileSelect}
			/>

			<label for="file-upload" class="upload-content">
				<CloudUpload size={64} strokeWidth={1.5} class="icon" />
				<h2>click or drag to upload</h2>
				<p class="subtitle">
					{maxUploadSizeFormatted} max per file
				</p>
			</label>
		</div>

		<div class="top-right-actions">
			{#if data.isAdmin}
				<a href="/dashboard/settings" class="settings-link" title="Settings">
					<Settings size={22} />
				</a>
			{/if}

			<div class="retention-trigger-wrapper">
				<button
					type="button"
					class="retention-trigger {isRetentionMenuOpen ? 'active' : ''}"
					onclick={() => (isRetentionMenuOpen = !isRetentionMenuOpen)}
					title="Set expiration time"
				>
					<Clock size={22} />
				</button>

				{#if isRetentionMenuOpen}
					<div class="retention-popup">
						<p class="retention-label">
							Expire after: <strong>{retentionOptions[retentionIndex]?.label}</strong>
						</p>
						<input
							type="range"
							min="0"
							max={retentionOptions.length - 1}
							bind:value={retentionIndex}
							class="retention-slider"
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="encryption-settings">
		<button
			type="button"
			class="encryption-toggle {isEncryptionEnabled ? 'active' : ''}"
			onclick={() => (isEncryptionEnabled = !isEncryptionEnabled)}
		>
			{#if isEncryptionEnabled}
				<Lock size={18} />
			{:else}
				<Unlock size={18} />
			{/if}
			{isEncryptionEnabled ? 'encryption enabled' : 'encryption disabled'}
		</button>

		{#if isEncryptionEnabled}
			<div class="password-input-group">
				<div class="input-wrapper">
					<input
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="encryption password"
						class="password-input"
					/>
					<button
						type="button"
						class="eye-btn"
						onclick={() => (showPassword = !showPassword)}
						title={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}
							<EyeOff size={16} />
						{:else}
							<Eye size={16} />
						{/if}
					</button>
				</div>
				<p class="encryption-hint">
					<ShieldCheck size={20} /> files are encrypted in browser before upload
				</p>
			</div>
		{/if}
	</div>

	{#if (uploadProgress > 0 && uploadProgress < 100) || (totalFilesToUpload > 1 && currentFileUploading <= totalFilesToUpload)}
		<div class="progress-container">
			{#if totalFilesToUpload > 1}
				<p>Uploading file {currentFileUploading} of {totalFilesToUpload}... {uploadProgress}%</p>
			{:else}
				<p>Uploading... {uploadProgress}%</p>
			{/if}
			<div class="progress-bar">
				<div class="progress-fill" style="width: {uploadProgress}%"></div>
			</div>
		</div>
	{/if}

	{#if finalUrl}
		<div class="success-box">
			<button class="copy-button" onclick={copyToClipboard} type="button">
				<p>{copied ? 'copied!' : 'upload complete!'}</p>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span
					class="share-link"
					onclick={(e) => {
						e.stopPropagation();
						window.open(finalUrl, '_blank');
					}}
				>
					{finalUrl}
				</span>
			</button>
			{#if data.settings.retention_policy !== '0'}
				<div class="expiration-indicator">
					<Clock size={12} />
					<span>stays online {retentionText}</span>
				</div>
			{/if}
		</div>
	{/if}

	<footer class="site-footer">
		<p class="banner">{data.settings.banner_text}</p>
		<div class="footer-links">
			<a href="/tos" class="footer-link">Terms of Service</a>
			<span class="separator">•</span>
			<a href="/privacy" class="footer-link">Privacy Policy</a>
			<span class="separator">•</span>
			<a
				href="https://github.com/syuuzu/scrapbox"
				target="_blank"
				rel="noopener noreferrer"
				class="footer-link">Source Code</a
			>
		</div>
	</footer>
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
		color: var(--text-muted);
		transition:
			color 0.2s,
			transform 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
	}

	.settings-link:hover {
		color: var(--accent);
		transform: scale(1.1);
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

	.upload-area {
		width: 100%;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.top-right-actions {
		position: absolute;
		right: 12px;
		top: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		z-index: 20;
	}

	.retention-trigger-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.retention-trigger {
		background: transparent;
		border: none;
		color: var(--text-muted);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			color 0.2s,
			transform 0.2s;
		padding: 0;
	}

	.retention-trigger:hover,
	.retention-trigger.active {
		color: var(--accent);
		transform: scale(1.1);
	}

	.retention-popup {
		position: absolute;
		top: 0;
		right: 120%;
		background: var(--bg-color);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 1.5rem;
		width: 250px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (max-width: 800px) {
		.top-right-actions {
			right: 8px;
			top: 8px;
		}
	}

	.retention-label {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-main);
		white-space: nowrap;
	}

	.retention-label strong {
		color: var(--accent);
	}

	.retention-slider {
		width: 100%;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.encryption-settings {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.encryption-toggle {
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-muted);
		padding: 0.6rem 1.2rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.encryption-toggle:hover {
		border-color: var(--text-muted);
		color: var(--text-main);
	}

	.encryption-toggle.active {
		border-color: var(--accent);
		color: var(--accent);
		background-color: rgba(212, 184, 114, 0.05);
	}

	.password-input-group {
		width: 100%;
		max-width: 300px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-wrapper {
		position: relative;
		width: 100%;
	}

	.password-input {
		width: 100%;
		padding: 0.6rem 1rem;
		padding-right: 2.5rem;
		background-color: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-main);
		font-size: 0.9rem;
		font-family: inherit;
		box-sizing: border-box;
	}

	.password-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.eye-btn {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		transition: color 0.2s;
	}

	.eye-btn:hover {
		color: var(--accent);
	}

	.encryption-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
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
		width: 100%;
		border: 1px solid var(--accent);
		border-radius: 8px;
		background-color: rgba(212, 184, 114, 0.05);
		overflow: hidden;
	}

	.copy-button {
		width: 100%;
		background: transparent;
		border: none;
		padding: 1.5rem 2rem;
		cursor: pointer;
		font-family: inherit;
		color: inherit;
		transition: background-color 0.2s;
	}

	.copy-button:hover {
		background-color: rgba(212, 184, 114, 0.1);
	}

	.expiration-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.75rem;
		background-color: rgba(0, 0, 0, 0.1);
		border-top: 1px solid rgba(212, 184, 114, 0.2);
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.copy-button p {
		margin: 0 0 0.5rem 0;
		color: var(--text-main);
		font-size: 0.9rem;
	}

	.share-link {
		color: var(--accent);
		text-decoration: underline;
		font-size: 1.2rem;
		font-weight: bold;
		word-break: break-all;
		transition: opacity 0.2s;
	}

	.share-link:hover {
		opacity: 0.8;
	}

	.site-footer {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.banner {
		margin: 0;
		text-align: center;
		opacity: 0.8;
	}

	.footer-links {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.footer-link {
		color: var(--accent);
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.footer-link:hover {
		opacity: 0.8;
		text-decoration: underline;
	}

	.separator {
		color: var(--border-color);
	}
</style>
