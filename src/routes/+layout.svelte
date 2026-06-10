<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(body) {
		/* temp color scheme */
		--bg-color: #141414;
		--text-main: #ebe5ce;
		--text-muted: #79756b; /* dimmed text for secondary info */
		--accent: #d4b872;
		--border-color: #4a4742; /* box border color */

		background-color: var(--bg-color);
		color: var(--text-main);
		font-family: 'Courier New', Courier, monospace;
		margin: 0;
		padding: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
	}
</style>
