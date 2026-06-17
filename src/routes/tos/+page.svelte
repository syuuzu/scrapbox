<script lang="ts">
	import { FileText, ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.settings.site_title || 'scrapbox'} - terms of service</title>
</svelte:head>

<main class="container">
	<div class="header-container">
		<a href="/" class="back-link" data-sveltekit-reload><ArrowLeft size={16} /> back to upload</a>
		<h1><FileText size={32} /> terms of service</h1>
	</div>

	<div class="tos-box">
		<div class="tos-content">
			{data.tosContent}
		</div>
	</div>
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 800px;
		padding: 2rem;
		margin: 0 auto;
	}

	.header-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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

	.tos-box {
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 2.5rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
	}

	.tos-content {
		color: var(--text-main);
		line-height: 1.6;
		white-space: pre-wrap;
		font-size: 1.1rem;
	}
</style>
