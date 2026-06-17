<script lang="ts">
	import { Shield, ArrowLeft, Lock, Database, EyeOff } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.settings.site_title || 'scrapbox'} - privacy policy</title>
</svelte:head>

<main class="container">
	<div class="header-container">
		<a href="/" class="back-link"><ArrowLeft size={16} /> back to upload</a>
		<h1><Shield size={32} /> privacy policy</h1>
	</div>

	<div class="policy-box">
		<section class="policy-section">
			<h2><Database size={20} /> Data Collection</h2>
			<p>
				This instance of <strong>{data.settings.site_title || 'scrapbox'}</strong>
				collects the minimum amount of data necessary to provide file sharing services:
			</p>
			<ul>
				<li>
					<strong>Files:</strong> The files you upload to our servers for the duration defined by the
					site's retention policy.
				</li>
				<li>
					<strong>Metadata:</strong> Files are uploaded as is. We store the original filename (unless
					encrypted), file size, and upload timestamp.
				</li>
			</ul>
		</section>

		<section class="policy-section">
			<h2><Lock size={20} /> Client-Side Encryption</h2>
			<p>
				When you enable encryption, your files are protected using <strong>AES-256-GCM</strong>
				encryption directly in your browser <em>before</em> they are sent to the server.
			</p>
			<div class="technical-note">
				<ul>
					<li>your password never leaves your browser.</li>
					<li>scrapbox never sees, stores, or transmits your encryption password.</li>
				</ul>
			</div>
		</section>

		<section class="policy-section">
			<h2><EyeOff size={20} /> Zero-Knowledge Storage</h2>
			<p>
				Because encryption happens on your device, the files stored on there server's disks are
				secure.
				<strong
					>Site administrators cannot decrypt or view the contents of your encrypted files.</strong
				>
			</p>
			<p>
				If you lose your password, your data is permanently unrecoverable. There is no backdoor or
				password reset mechanisms for encrypted files.
			</p>
		</section>
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

	.policy-box {
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 2.5rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.policy-section h2 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--accent);
		font-size: 1.4rem;
		margin: 0 0 1rem 0;
	}

	.policy-section p {
		color: var(--text-main);
		line-height: 1.6;
		font-size: 1.05rem;
		margin: 0 0 1rem 0;
	}

	.policy-section ul {
		color: var(--text-main);
		line-height: 1.6;
		margin: 0 0 1rem 0;
		padding-left: 1.5rem;
	}

	.policy-section li {
		margin-bottom: 0.5rem;
	}

	.technical-note {
		background-color: rgba(0, 0, 0, 0.2);
		border-left: 3px solid var(--accent);
		padding: 1.25rem;
		border-radius: 0 8px 8px 0;
		font-size: 0.95rem;
	}
</style>
