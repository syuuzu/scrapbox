<script lang="ts">
	import { ShieldCheck, Lock, AlertCircle, Globe } from 'lucide-svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let domain = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSetup() {
		error = '';

		if (password.length < 8) {
			error = 'Password must be at least 8 characters long';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (!domain) {
			error = 'Please enter your site domain';
			return;
		}

		loading = true;
		try {
			const response = await fetch('/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password, domain })
			});

			const result = await response.json();

			if (result.success) {
				await invalidateAll();
				await goto('/dashboard/settings');
				return;
			} else {
				error = result.error || 'Something went wrong';
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.settings.site_title || 'scrapbox'} - setup</title>
</svelte:head>

<main class="container">
	<div class="logo-container">
		<h1>{data.settings.site_title || 'scrapbox'}</h1>
		<p class="subtitle">initial setup</p>
	</div>

	<div class="setup-box">
		<div class="header">
			<ShieldCheck size={48} class="icon" />
			<h2>create admin account</h2>
			<p>set a strong password to protect your scrapbox</p>
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSetup();
			}}
		>
			<div class="input-group">
				<label for="domain">site domain</label>
				<div class="input-wrapper">
					<div class="icon-container">
						<Globe size={18} />
					</div>
					<input
						type="text"
						id="domain"
						bind:value={domain}
						placeholder="https://share.example.com"
						required
					/>
				</div>
				<p class="hint">used for share links</p>
			</div>

			<div class="input-group">
				<label for="password">admin password</label>
				<div class="input-wrapper">
					<div class="icon-container">
						<Lock size={18} />
					</div>
					<input
						type="password"
						id="password"
						bind:value={password}
						placeholder="at least 8 characters"
						required
					/>
				</div>
			</div>

			<div class="input-group">
				<label for="confirm-password">confirm password</label>
				<div class="input-wrapper">
					<div class="icon-container">
						<Lock size={18} />
					</div>
					<input
						type="password"
						id="confirm-password"
						bind:value={confirmPassword}
						placeholder="repeat password"
						required
					/>
				</div>
			</div>

			{#if error}
				<div class="error-msg">
					<AlertCircle size={16} />
					<span>{error}</span>
				</div>
			{/if}

			<button type="submit" disabled={loading}>
				{loading ? 'setting up...' : 'setup done'}
			</button>
		</form>
	</div>
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		gap: 2rem;
		width: 100%;
		max-width: 450px;
		padding: 2rem;
		margin: 0 auto;
	}

	.logo-container {
		text-align: center;
	}

	.hint {
		color: var(--accent);
		font-size: 0.9rem;
		margin: 0.5rem 0 0 0;
		letter-spacing: 1px;
	}

	.logo-container h1 {
		color: var(--accent);
		font-size: 2.5rem;
		margin: 0;
		letter-spacing: 3px;
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 0.9rem;
		margin: 0.5rem 0 0 0;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.setup-box {
		width: 100%;
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: 16px;
		padding: 2.5rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	:global(.icon) {
		color: var(--accent);
		margin-bottom: 1rem;
	}

	h2 {
		font-size: 1.5rem;
		margin: 0 0 0.5rem 0;
	}

	.header p {
		color: var(--text-muted);
		font-size: 0.95rem;
		margin: 0;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-weight: 500;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.icon-container {
		position: absolute;
		left: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		pointer-events: none;
		z-index: 2;
	}

	input {
		width: 100%;
		padding: 0.8rem 1rem 0.8rem 2.75rem;
		background-color: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-main);
		font-size: 1rem;
		transition: all 0.2s;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: var(--accent);
		background-color: rgba(0, 0, 0, 0.3);
	}

	.error-msg {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #ff6b6b;
		font-size: 0.9rem;
		background-color: rgba(255, 107, 107, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
	}

	button {
		width: 100%;
		padding: 1rem;
		background-color: var(--accent);
		color: #000;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
		margin-top: 0.5rem;
	}

	button:hover:not(:disabled) {
		opacity: 0.9;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
