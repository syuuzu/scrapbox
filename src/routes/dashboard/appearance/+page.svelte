<script lang="ts">
	import { Palette, Type, FileText, Save, CheckCircle, ArrowLeft, Monitor } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let theme = $state('');
	let siteTitle = $state('');
	let bannerText = $state('');
	let tosContent = $state('');

	$effect(() => {
		theme = data.settings.theme || 'default';
		siteTitle = data.settings.site_title || 'scrapbox';
		bannerText = data.settings.banner_text || '';
		tosContent = data.settings.tos_content || '';
	});

	let success = $state(false);
</script>

<svelte:head>
	<title>{data.settings.site_title} - appearance</title>
</svelte:head>

<main class="container">
	<div class="header-container">
		<div class="top-row">
			<a href="/dashboard/settings" class="back-link"><ArrowLeft size={16} /> back to settings</a>
		</div>
		<h1><Palette size={32} /> appearance</h1>
	</div>

	<div class="settings-grid">
		<section class="settings-box">
			<h2><Monitor size={20} /> site branding</h2>
			<form
				method="POST"
				action="?/updateAppearance"
				use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'success') {
							success = true;
							setTimeout(() => {
								window.location.reload();
							}, 500);
						}
					};
				}}
			>
				<div class="input-group">
					<label for="theme">
						<Palette size={16} /> color theme
					</label>
					<select name="theme" id="theme" bind:value={theme}>
						<option value="default">amber (default)</option>
						<option value="ocean">ocean blue</option>
						<option value="forest">forest green</option>
						<option value="rose">rose red</option>
						<option value="void">void black</option>
					</select>
					<p class="hint">choose the primary color for your instance</p>
				</div>

				<div class="input-group">
					<label for="site_title">
						<Type size={16} /> site title
					</label>
					<input
						type="text"
						name="site_title"
						id="site_title"
						bind:value={siteTitle}
						placeholder="scrapbox"
					/>
					<p class="hint">the main name displayed across the site</p>
				</div>

				<div class="input-group">
					<label for="banner_text">
						<Type size={16} /> banner text
					</label>
					<input
						type="text"
						name="banner_text"
						id="banner_text"
						bind:value={bannerText}
						placeholder="scrapbox - simple file sharing"
					/>
					<p class="hint">text displayed at the bottom of the upload page</p>
				</div>

				<div class="input-group">
					<label for="tos_content">
						<FileText size={16} /> terms of service
					</label>
					<textarea
						name="tos_content"
						id="tos_content"
						bind:value={tosContent}
						rows="10"
						placeholder="Write your instance rules here..."
					></textarea>
					<p class="hint">detailed rules for what users can and cannot upload</p>
				</div>

				<button type="submit" class="save-btn">
					<Save size={18} /> save appearance
				</button>

				{#if success}
					<div class="success-msg">
						<CheckCircle size={16} /> appearance settings saved!
					</div>
				{/if}
			</form>
		</section>
	</div>
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 900px;
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
		width: 100%;
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

	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		margin: 0 0 1.5rem 0;
		color: var(--text-main);
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.75rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	.settings-box {
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 2rem;
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
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 0.75rem;
		background-color: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-main);
		font-size: 1rem;
		font-family: inherit;
		box-sizing: border-box;
	}

	textarea {
		resize: vertical;
		line-height: 1.5;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: var(--accent);
	}

	.hint {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0;
	}

	.save-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: var(--accent);
		color: #000;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.save-btn:hover {
		opacity: 0.9;
	}

	.success-msg {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #4cd137;
		font-size: 0.9rem;
		background-color: rgba(76, 209, 55, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
	}
</style>
