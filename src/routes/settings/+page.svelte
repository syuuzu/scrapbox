<script lang="ts">
	import {
		Settings,
		Save,
		Lock,
		Clock,
		HardDrive,
		FileType,
		Palette,
		CheckCircle,
		AlertCircle,
		Zap,
		Activity,
		ChevronDown,
		ChevronUp,
		ShieldAlert
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let allowedTypes = $state('');
	let theme = $state('default');
	let isForever = $state(false);
	let retentionUnit = $state('days');
	let retentionValue = $state(1);
	let sizeUnit = $state('MB');
	let sizeValue = $state(50);
	let rateLimitWindow = $state(1000);
	let rateLimitMax = $state(100);
	let shortIdLength = $state(8);

	let showAdvanced = $state(false);

	let passwordError = $state('');
	let passwordSuccess = $state(false);
	let settingsSuccess = $state(false);

	//multipliers
	const retentionMultipliers: Record<string, number> = {
		minutes: 1,
		hours: 60,
		days: 1440,
		months: 43200,
		years: 525600
	};

	const sizeMultipliers: Record<string, number> = {
		KB: 1024,
		MB: 1024 * 1024,
		GB: 1024 * 1024 * 1024
	};

	$effect(() => {
		allowedTypes = data.settings.allowed_file_types;
		theme = data.settings.theme;

		const rawRetention = parseInt(data.settings.retention_policy);
		isForever = rawRetention === 0;

		const ret = (() => {
			if (rawRetention <= 0) return { unit: 'days', value: 1 };
			if (rawRetention % 525600 === 0) return { unit: 'years', value: rawRetention / 525600 };
			if (rawRetention % 43200 === 0) return { unit: 'months', value: rawRetention / 43200 };
			if (rawRetention % 1440 === 0) return { unit: 'days', value: rawRetention / 1440 };
			if (rawRetention % 60 === 0) return { unit: 'hours', value: rawRetention / 60 };
			return { unit: 'minutes', value: rawRetention };
		})();

		retentionUnit = ret.unit;
		retentionValue = ret.value;

		const rawMaxSize = parseInt(data.settings.max_upload_size);
		const size = (() => {
			if (rawMaxSize >= 1024 * 1024 * 1024 && rawMaxSize % (1024 * 1024 * 1024) === 0) {
				return { unit: 'GB', value: rawMaxSize / (1024 * 1024 * 1024) };
			}
			if (rawMaxSize >= 1024 * 1024 && rawMaxSize % (1024 * 1024) === 0) {
				return { unit: 'MB', value: rawMaxSize / (1024 * 1024) };
			}
			return { unit: 'KB', value: Math.round(rawMaxSize / 1024) };
		})();

		sizeUnit = size.unit;
		sizeValue = size.value;

		rateLimitWindow = parseInt(data.settings.rate_limit_window || '1000');
		rateLimitMax = parseInt(data.settings.rate_limit_max || '100');
		shortIdLength = parseInt(data.settings.short_id_length || '8');
	});

	let editingRetention = $state(false);
	let editingSize = $state(false);

	//reactive update
	let retention = $derived(
		isForever ? 0 : (retentionValue || 1) * retentionMultipliers[retentionUnit]
	);
	let maxSize = $derived((sizeValue || 50) * sizeMultipliers[sizeUnit]);

	async function startEditingRetention() {
		editingRetention = true;
		await tick();
		document.getElementById('retention-input')?.focus();
	}

	async function startEditingSize() {
		editingSize = true;
		await tick();
		document.getElementById('size-input')?.focus();
	}

	function handleRetentionBlur() {
		if (!retentionValue || retentionValue < 1) {
			retentionValue = 1;
		}
		editingRetention = false;
	}

	function handleSizeBlur() {
		if (!sizeValue || sizeValue < 1) {
			sizeValue = 50;
		}
		editingSize = false;
	}
</script>

<main class="container">
	<div class="header-container">
		<a href="/" class="back-link">← back to upload</a>
		<h1><Settings size={32} /> settings</h1>
	</div>

	<div class="settings-grid">
		<section class="settings-box">
			<h2><HardDrive size={20} /> upload settings</h2>
			<form
				method="POST"
				action="?/updateSettings"
				use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'success') {
							settingsSuccess = true;
							setTimeout(() => {
								window.location.reload();
							}, 500);
						}
					};
				}}
			>
				<div class="input-group">
					<div class="label-row">
						<div class="description-text">
							<Clock size={16} /> file retention:
							{#if isForever}
								<span class="value-text">forever</span>
							{:else}
								{#if editingRetention}
									<input
										type="number"
										id="retention-input"
										bind:value={retentionValue}
										onblur={handleRetentionBlur}
										onkeydown={(e) => e.key === 'Enter' && handleRetentionBlur()}
										class="inline-input"
										min="1"
										max="999"
									/>
								{:else}
									<button type="button" class="editable-value" onclick={startEditingRetention}>
										{retentionValue}
									</button>
								{/if}
								<span class="value-text">{retentionUnit}</span>
							{/if}
						</div>
						<button
							type="button"
							class="toggle-btn {isForever ? 'active' : ''}"
							onclick={() => (isForever = !isForever)}
						>
							forever
						</button>
					</div>

					{#if !isForever}
						<div class="slider-row">
							<input
								type="range"
								id="retention_slider"
								min="1"
								max="999"
								step="1"
								bind:value={retentionValue}
								class="slider"
							/>
							<select bind:value={retentionUnit} class="unit-select">
								<option value="minutes">mins</option>
								<option value="hours">hours</option>
								<option value="days">days</option>
								<option value="months">months</option>
								<option value="years">years</option>
							</select>
						</div>
					{/if}
					<input type="hidden" name="retention_policy" value={retention} />
					<p class="hint">how long files stay before deletion</p>
				</div>

				<div class="input-group">
					<div class="label-row">
						<div class="description-text">
							<HardDrive size={16} /> max upload size:
							{#if editingSize}
								<input
									type="number"
									id="size-input"
									bind:value={sizeValue}
									onblur={handleSizeBlur}
									onkeydown={(e) => e.key === 'Enter' && handleSizeBlur()}
									class="inline-input"
									min="1"
									max="9999"
								/>
							{:else}
								<button type="button" class="editable-value" onclick={startEditingSize}>
									{sizeValue}
								</button>
							{/if}
							<span class="value-text">{sizeUnit}</span>
						</div>
					</div>
					<div class="slider-row">
						<input
							type="range"
							id="max_upload_slider"
							min="1"
							max="1024"
							step="1"
							bind:value={sizeValue}
							class="slider"
						/>
						<select bind:value={sizeUnit} class="unit-select">
							<option value="KB">KB</option>
							<option value="MB">MB</option>
							<option value="GB">GB</option>
						</select>
					</div>
					<input type="hidden" name="max_upload_size" value={maxSize} />
				</div>

				<div class="input-group">
					<label for="allowed_file_types">
						<FileType size={16} /> allowed file types
					</label>
					<input
						type="text"
						name="allowed_file_types"
						id="allowed_file_types"
						bind:value={allowedTypes}
						placeholder="*, .jpg, .png, .pdf"
						autocomplete="off"
					/>
					<p class="hint">use * for all, or comma-separated extensions</p>
				</div>

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
				</div>

				<div class="advanced-toggle-container">
					<button
						type="button"
						class="advanced-toggle"
						onclick={() => (showAdvanced = !showAdvanced)}
					>
						{#if showAdvanced}
							<ChevronUp size={16} />
						{:else}
							<ChevronDown size={16} />
						{/if}
						advanced settings
					</button>
				</div>

				{#if showAdvanced}
					<div class="advanced-section">
						<div class="input-group">
							<label for="rate_limit_window">
								<Clock size={16} /> rate limit window (ms)
							</label>
							<input
								type="number"
								name="rate_limit_window"
								id="rate_limit_window"
								bind:value={rateLimitWindow}
								min="1"
							/>
							<p class="hint">time window for rate limiting in milliseconds</p>
						</div>

						<div class="input-group">
							<label for="rate_limit_max">
								<Zap size={16} /> rate limit max requests
							</label>
							<input
								type="number"
								name="rate_limit_max"
								id="rate_limit_max"
								bind:value={rateLimitMax}
								min="1"
							/>
							<p class="hint">maximum requests allowed within the window</p>
						</div>

						<div class="input-group">
							<label for="short_id_length">
								<Activity size={16} /> generated filename length
							</label>
							<input
								type="number"
								name="short_id_length"
								id="short_id_length"
								bind:value={shortIdLength}
								min="1"
								max="32"
							/>
							{#if shortIdLength < 8}
								<p class="warning-text">
									<ShieldAlert size={14} /> This setting should at least be 8 characters long to avoid
									collisions.
								</p>
							{/if}
							<p class="hint">length of the random ID prepended to filenames</p>
						</div>
					</div>
				{/if}

				<button type="submit" class="save-btn">
					<Save size={18} /> save settings
				</button>

				{#if settingsSuccess}
					<div class="success-msg">
						<CheckCircle size={16} /> settings saved, refreshing...
					</div>
				{/if}
			</form>
		</section>

		<section class="settings-box">
			<h2><Lock size={20} /> admin password</h2>
			<form
				method="POST"
				action="?/changePassword"
				use:enhance={() => {
					passwordError = '';
					passwordSuccess = false;
					return ({ result }) => {
						if (result.type === 'success') {
							passwordSuccess = true;
						} else if (result.type === 'failure') {
							passwordError = (result.data?.error as string) || 'Failed to update password';
						}
					};
				}}
			>
				<div class="input-group">
					<label for="newPassword">new password</label>
					<input
						type="password"
						name="newPassword"
						id="newPassword"
						required
						autocomplete="new-password"
					/>
				</div>

				<div class="input-group">
					<label for="confirmPassword">confirm new password</label>
					<input
						type="password"
						name="confirmPassword"
						id="confirmPassword"
						required
						autocomplete="new-password"
					/>
				</div>

				<button type="submit" class="save-btn secondary">
					<Lock size={18} /> change password
				</button>

				{#if passwordSuccess}
					<div class="success-msg">
						<CheckCircle size={16} /> password updated successfully
					</div>
				{/if}

				{#if passwordError}
					<div class="error-msg">
						<AlertCircle size={16} />
						{passwordError}
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

	.back-link {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
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
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	@media (max-width: 768px) {
		.settings-grid {
			grid-template-columns: 1fr;
		}
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

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.advanced-toggle-container {
		display: flex;
		justify-content: center;
		margin: 0.5rem 0;
	}

	.advanced-toggle {
		background: transparent;
		border: none;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.5rem;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.advanced-toggle:hover {
		color: var(--accent);
		background-color: rgba(255, 255, 255, 0.05);
	}

	.advanced-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		background-color: rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		border: 1px solid var(--border-color);
	}

	.warning-text {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: #fbc531;
		font-size: 0.8rem;
		margin: 0.2rem 0;
	}

	.description-text {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.value-text {
		color: var(--text-muted);
	}

	.toggle-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		padding: 0.2rem 0.5rem;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		transition: color 0.2s;
		position: relative;
	}

	.toggle-btn:hover {
		color: var(--text-main);
	}

	.toggle-btn.active {
		color: var(--accent);
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.unit-select {
		width: auto;
		min-width: 90px;
		padding: 0.4rem;
		font-size: 0.9rem;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.editable-value {
		background: transparent;
		border: 1px dashed var(--accent);
		color: var(--accent);
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		font-weight: bold;
		min-width: 1rem;
		text-align: center;
		margin: 0 0.1rem;
	}

	.editable-value:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.inline-input {
		width: 3.5rem;
		background: transparent;
		border: 1px dashed var(--accent);
		color: var(--accent);
		font-family: inherit;
		font-size: inherit;
		font-weight: bold;
		text-align: center;
		padding: 0.1rem 0;
		margin: 0 0.1rem;
		outline: none;
		border-radius: 4px;
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.inline-input::-webkit-outer-spin-button,
	.inline-input::-webkit-inner-spin-button {
		-webkit-appearance: none !important;
		appearance: none !important;
		margin: 0 !important;
		display: none !important;
	}

	input,
	select {
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

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--accent);
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		flex: 1;
		height: 8px;
		border-radius: 4px;
		background: var(--border-color);
		outline: none;
		padding: 0;
		margin: 10px 0;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent);
		cursor: pointer;
		transition: transform 0.1s ease-in-out;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 50%;
		background: var(--accent);
		cursor: pointer;
		transition: transform 0.1s ease-in-out;
	}

	.slider::-moz-range-thumb:hover {
		transform: scale(1.2);
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

	.save-btn.secondary {
		background-color: transparent;
		border: 1px solid var(--accent);
		color: var(--accent);
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

	.error-msg {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #ff4757;
		font-size: 0.9rem;
		background-color: rgba(255, 71, 87, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
	}
</style>
