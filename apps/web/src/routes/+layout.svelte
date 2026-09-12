<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/josefin-sans';
	import '@fontsource-variable/raleway';
	import '@fontsource-variable/work-sans';
	import '@fontsource/cormorant-sc';
	import '@fontsource-variable/montserrat';

	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { BookOpenText } from 'lucide-svelte';

	// Svelte 5 Motion & Reactivity Utilities
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';

	import favicon from '$lib/assets/favicon.png';
	import AIChatWidget from '$lib/components/AIChatWidget.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import NavigationBar from '$lib/components/NavigationBar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const baziProfile = $derived(data.baziProfile);

	const INTERACTIVE_SELECTOR =
		'a, button, input, textarea, select, label, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"]), .cursor-pointer';

	// Reactive detection: fine pointer & reduced motion (built-in Svelte 5)
	const finePointer = new MediaQuery('(pointer: fine)', false);
	const hasCustomCursor = $derived(finePointer.current && !prefersReducedMotion.current);

	// Spring for the outer trailing ring (fluid & elastic)
	const ring = new Spring(
		{ x: -100, y: -100 },
		{ stiffness: 0.18, damping: 0.72, precision: 0.02 }
	);

	// Instant pinpoint coordinates (0ms lag for accurate clicking)
	let dotX = $state(-100);
	let dotY = $state(-100);

	let isVisible = $state(false);
	let isDown = $state(false);
	let isInteractive = $state(false);

	let cachedTarget: EventTarget | null = null;

	function checkInteractive(target: EventTarget | null) {
		if (target === cachedTarget) return;
		cachedTarget = target;
		isInteractive = target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
	}

	function handlePointerMove(e: PointerEvent) {
		if (!hasCustomCursor) return;

		dotX = e.clientX;
		dotY = e.clientY;
		ring.target = { x: e.clientX, y: e.clientY };

		if (!isVisible) isVisible = true;
		checkInteractive(e.target);
	}

	function handlePointerDown() {
		isDown = true;
	}

	function handlePointerUp() {
		isDown = false;
	}

	function handleMouseEnter() {
		isVisible = true;
	}

	function handleMouseLeave() {
		isVisible = false;
		cachedTarget = null;
		isInteractive = false;
	}

	function handleVisibilityChange() {
		if (document.hidden) isVisible = false;
	}

	// Synchronize html class with reactivity
	$effect(() => {
		if (!browser) return;
		document.documentElement.classList.toggle('has-custom-cursor', hasCustomCursor);
	});

	const isAuthPage = $derived(['/login', '/register'].includes(page.url.pathname));
	const isManagePage = $derived(page.url.pathname.startsWith('/manage'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Declarative event listeners with automatic lifecycle cleanup -->
<svelte:window
	onpointermove={handlePointerMove}
	onpointerdown={handlePointerDown}
	onpointerup={handlePointerUp}
/>
<svelte:body
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
/>
<svelte:document
	onvisibilitychange={handleVisibilityChange}
/>

<ToastContainer />

{#if hasCustomCursor}
	<div
		class="cursor-root"
		class:is-hidden={!isVisible}
		aria-hidden="true"
	>
		<!-- Trailing Spring Ring -->
		<div
			class="cursor-tracker"
			style:transform="translate3d({ring.current.x}px, {ring.current.y}px, 0)"
		>
			<div
				class="ring-visual"
				class:is-interactive={isInteractive}
				class:is-down={isDown}
			></div>
		</div>

		<!-- Zero-Latency Interaction Dot -->
		<div
			class="cursor-tracker"
			style:transform="translate3d({dotX}px, {dotY}px, 0)"
		>
			<div
				class="dot-visual"
				class:is-interactive={isInteractive}
				class:is-down={isDown}
			></div>
		</div>
	</div>
{/if}

<div
	class="bg-base-100 text-base-content selection:bg-primary flex min-h-dvh w-full flex-col antialiased selection:text-white"
>
	{#if !isAuthPage}
		<NavigationBar />
	{/if}

	<main class="flex-1 snap-y snap-proximity overflow-x-hidden">
		{@render children()}
	</main>

	{#if !isManagePage && !isAuthPage}
		<Footer />
	{/if}
</div>

{#if PUBLIC_API_URL && !isAuthPage}
	<a
		href="{PUBLIC_API_URL}/openapi"
		target="_blank"
		rel="noopener noreferrer"
		class="group bg-primary fixed right-6 bottom-21 z-50 flex h-12 flex-row-reverse items-center overflow-hidden rounded-full shadow-md transition-all duration-300 ease-in-out"
		aria-label="API Documentation"
	>
		<div class="text-primary-content flex h-12 w-12 shrink-0 items-center justify-center">
			<BookOpenText class="size-6" />
		</div>
		<span
			class="text-primary-content inline-block max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover:max-w-48 group-hover:pr-2 group-hover:pl-4 group-hover:opacity-100"
		>
			API Documentation
		</span>
	</a>
{/if}

{#if !isAuthPage}
	<AIChatWidget {baziProfile} />
{/if}

<style>
	/* Custom Scrollbar for Webkit */
	main::-webkit-scrollbar {
		width: 8px;
	}

	main::-webkit-scrollbar-track {
		background: transparent;
	}

	main::-webkit-scrollbar-thumb {
		background-color: rgba(156, 163, 175, 0.3);
		border-radius: 20px;
	}

	main::-webkit-scrollbar-thumb:hover {
		background-color: rgba(156, 163, 175, 0.5);
	}

	/* Global Cursor Reset */
	:global(html.has-custom-cursor),
	:global(html.has-custom-cursor body),
	:global(html.has-custom-cursor a),
	:global(html.has-custom-cursor button),
	:global(html.has-custom-cursor [role='button']),
	:global(html.has-custom-cursor input) {
		cursor: none;
	}

	/* Scroll Snapping */
	:global(footer),
	:global(.footer) {
		scroll-snap-align: start;
	}

	/* Cursor System */
	.cursor-root {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 99999;
		pointer-events: none;
		user-select: none;
		mix-blend-mode: difference;
		opacity: 1;
		transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.cursor-root.is-hidden {
		opacity: 0;
	}

	/* Fast Positioner (handles translate3d only) */
	.cursor-tracker {
		position: fixed;
		top: 0;
		left: 0;
		will-change: transform;
	}

	/* Visual Child Elements (handles scale, color, opacity only) */
	.dot-visual {
		width: 6px;
		height: 6px;
		margin: -3px 0 0 -3px;
		border-radius: 50%;
		background-color: #ffffff;
		will-change: transform, opacity;
		transition: transform 0.15s ease-out, opacity 0.15s ease;
	}

	.dot-visual.is-down {
		transform: scale(0.6);
	}

	.dot-visual.is-interactive {
		opacity: 0;
		transform: scale(0);
	}

	.ring-visual {
		width: 32px;
		height: 32px;
		margin: -16px 0 0 -16px;
		border-radius: 50%;
		border: 1.5px solid #ffffff;
		background-color: transparent;
		will-change: transform;
		transform-origin: center center;
		transition:
			transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	/* Pure Compositor Scaling */
	.ring-visual.is-down {
		transform: scale(0.8);
		background-color: rgba(255, 255, 255, 0.25);
	}

	.ring-visual.is-interactive {
		transform: scale(1.6);
		background-color: rgba(255, 255, 255, 0.18);
		border-color: rgba(255, 255, 255, 0.95);
	}

	.ring-visual.is-interactive.is-down {
		transform: scale(1.3);
		background-color: rgba(255, 255, 255, 0.35);
	}
</style>