<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="theme-wrapper theme-{data.theme}">
	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: var(--bg-color);
		color: var(--text-main);
		font-family: 'Courier New', Courier, monospace;
	}

	.theme-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		width: 100%;
		background-color: var(--bg-color);
		color: var(--text-main);
	}

	.theme-default {
		--bg-color: #141414;
		--text-main: #ebe5ce;
		--text-muted: #79756b;
		--accent: #d4b872;
		--border-color: #4a4742;
	}

	.theme-ocean {
		--bg-color: #0a192f;
		--text-main: #e6f1ff;
		--text-muted: #8892b0;
		--accent: #64ffda;
		--border-color: #233554;
	}

	.theme-forest {
		--bg-color: #0d1a0d;
		--text-main: #e0f0e0;
		--text-muted: #80a080;
		--accent: #4ade80;
		--border-color: #2a3a2a;
	}

	.theme-rose {
		--bg-color: #1a0d0d;
		--text-main: #f0e0e0;
		--text-muted: #a08080;
		--accent: #fb7185;
		--border-color: #3a2a2a;
	}

	.theme-void {
		--bg-color: #000000;
		--text-main: #ffffff;
		--text-muted: #666666;
		--accent: #ffffff;
		--border-color: #333333;
	}
</style>
