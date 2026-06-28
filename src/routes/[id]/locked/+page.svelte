<script lang="ts">
	let { data } = $props();

	let password = $state('');
	let error = $state(false);
	let loading = $state(false);

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
			{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' } as Pbkdf2Params,
			keyMaterial,
			{ name: 'AES-GCM', length: 256 },
			true,
			['decrypt']
		);
	}

	async function decryptAndDownload() {
		if (!password) return;

		error = false;
		loading = true;

		try {
			const response = await fetch(`/${data.id}?download=true`);
			if (!response.ok) throw new Error('Failed to fetch file');

			const buffer = await response.arrayBuffer();

			const salt = new Uint8Array(buffer.slice(0, 16));
			const iv = new Uint8Array(buffer.slice(16, 28));
			const dataBlob = buffer.slice(28);

			const key = await deriveKey(password, salt);
			const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, dataBlob);

			const decryptedBytes = new Uint8Array(decrypted);

			//extract original filename
			const nameLength = (decryptedBytes[0] << 8) | decryptedBytes[1];
			const nameBytes = decryptedBytes.slice(2, 2 + nameLength);
			const fileName = new TextDecoder().decode(nameBytes);
			const fileContent = decryptedBytes.slice(2 + nameLength);

			const blob = new Blob([fileContent]);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			loading = false;
		} catch (err) {
			console.error(err);
			error = true;
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			decryptAndDownload();
		}
	}
</script>

<svelte:head>
	<title>Encrypted File - scrapbox</title>
</svelte:head>

<div class="container">
	<div class="box">
		<h1>Encrypted File</h1>
		<p class="description">This file is protected by a password.</p>

		<input
			type="password"
			bind:value={password}
			onkeydown={handleKeydown}
			placeholder="Enter password"
		/>

		<button onclick={decryptAndDownload} disabled={loading}>
			{loading ? 'Decrypting...' : 'Decrypt & Download'}
		</button>

		{#if loading}
			<div class="loading">Decrypting...</div>
		{/if}

		{#if error}
			<div class="error">Invalid password or corrupted file.</div>
		{/if}
	</div>
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		width: 100%;
		margin: 0;
	}

	.box {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		padding: 2rem;
		border-radius: 12px;
		width: 100%;
		max-width: 400px;
		text-align: center;
	}

	h1 {
		color: var(--accent);
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.description {
		font-size: 0.9rem;
		opacity: 0.8;
		margin-bottom: 1.5rem;
		color: var(--text-main);
	}

	input {
		width: 100%;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-main);
		box-sizing: border-box;
		margin-bottom: 1rem;
		outline: none;
	}

	input:focus {
		border-color: var(--accent);
	}

	button {
		width: 100%;
		padding: 0.75rem;
		background: var(--accent);
		color: var(--bg-color);
		border: none;
		border-radius: 8px;
		font-weight: bold;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		opacity: 0.9;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error {
		color: #ff4757;
		font-size: 0.8rem;
		margin-top: 1rem;
	}

	.loading {
		margin-top: 1rem;
		font-style: italic;
		opacity: 0.8;
		color: var(--text-muted);
	}
</style>
