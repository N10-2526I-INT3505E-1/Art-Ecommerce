<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/josefin-sans';
	import '@fontsource-variable/raleway';
	import '@fontsource-variable/work-sans';
	import '@fontsource/cormorant-sc';
	import '@fontsource-variable/montserrat';

	import { onMount } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { BookOpenText } from 'lucide-svelte';

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

	const mouse = new Spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.15,
			damping: 0.8,
			precision: 0.1,
		},
	);

	let showCursor = $state(false);
	let cursorDown = $state(false);
	let overInteractive = $state(false);
	let isPageVisible = $state(true);
	let cursorEl: HTMLDivElement | null = $state(null);

	let rafId: number | null = null;
	let pendingX = 0;
	let pendingY = 0;
	let pendingTarget: EventTarget | null = null;
	let lastInteractiveCheck = 0;
	const INTERACTIVE_CHECK_INTERVAL = 50;

	let cachedElement: Element | null = null;
	let cachedResult = false;

	function checkInteractive(target: EventTarget | null): boolean {
		if (!target || !(target instanceof Element)) return false;
		const interactiveParent = target.closest(INTERACTIVE_SELECTOR);
		if (interactiveParent === cachedElement) return cachedResult;
		cachedElement = interactiveParent;
		cachedResult = interactiveParent !== null;
		return cachedResult;
	}

	function flushCursorUpdate() {
		rafId = null;
		mouse.target = { x: pendingX, y: pendingY };
		const now = performance.now();
		if (now - lastInteractiveCheck >= INTERACTIVE_CHECK_INTERVAL) {
			lastInteractiveCheck = now;
			const newInteractive = checkInteractive(pendingTarget);
			if (newInteractive !== overInteractive) overInteractive = newInteractive;
		}
	}

	function handleMouseMove(event: PointerEvent) {
		if (!isPageVisible) return;
		pendingX = event.clientX;
		pendingY = event.clientY;
		pendingTarget = event.target;
		if (rafId === null) rafId = requestAnimationFrame(flushCursorUpdate);
		if (!showCursor) showCursor = true;
	}

	function handleMouseLeave() {
		showCursor = false;
		overInteractive = false;
		cachedElement = null;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function handleMouseEnter() {
		showCursor = true;
	}
	function handleMouseDown() {
		cursorDown = true;
	}
	function handleMouseUp() {
		cursorDown = false;
	}

	function handleVisibilityChange() {
		isPageVisible = !document.hidden;
		if (document.hidden && rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	$effect(() => {
		if (!cursorEl) return;
		const x = mouse.current.x;
		const y = mouse.current.y;
		cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
	});

	onMount(() => {
		if (!browser) return;
		if (navigator.userAgent.includes('Firefox')) {
			document.documentElement.classList.add('platform-firefox');
		}
		const hasFineCursor = window.matchMedia('(pointer: fine)').matches;
		if (hasFineCursor) {
			showCursor = true;
			document.documentElement.classList.add('has-custom-cursor');
		}
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});

	const isAuthPage = $derived(['/login', '/register'].includes(page.url.pathname));
	const isManagePage = $derived(page.url.pathname.startsWith('/manage'));
	const isHomePage = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window
	onpointermove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	onmouseenter={handleMouseEnter}
	onmousedown={handleMouseDown}
	onmouseup={handleMouseUp}
/>

<ToastContainer />

{#if showCursor}
	<div
		bind:this={cursorEl}
		class="circle-cursor"
		class:is-down={cursorDown}
		class:is-interactive={overInteractive}
		aria-hidden="true"
	></div>
{/if}

<!-- 
    App Shell Structure
    - h-dvh: Uses dynamic viewport height (mobile friendly)
    - bg-base-100: Ensures background color matches theme
    - antialiased: Better font rendering
-->
<div
	class="bg-base-100 text-base-content selection:bg-primary flex min-h-dvh w-full flex-col antialiased selection:text-white"
>
	{#if !isAuthPage}
		<!-- Navbar handles its own positioning (Sticky vs Fixed) -->
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
		background-color: rgba(156, 163, 175, 0.3); /* gray-400/30 */
		border-radius: 20px;
	}

	main::-webkit-scrollbar-thumb:hover {
		background-color: rgba(156, 163, 175, 0.5);
	}

	/* Global Cursor Reset */
	:global(html.has-custom-cursor),
	:global(html.has-custom-cursor body) {
		cursor: none;
	}

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

	/* Optimized Cursor */
	.circle-cursor {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 9999;

		/* Hardware Acceleration */
		will-change: transform, width, height, border-width;
		backface-visibility: hidden;
		transform: translate3d(0, 0, 0); /* Initial state handled by JS */

		/* Appearance */
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1.5px solid white;
		background-color: transparent;

		/* Interaction */
		pointer-events: none;
		user-select: none;
		mix-blend-mode: difference;

		/* Transitions */
		transition:
			width 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94),
			height 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94),
			border-width 0.2s ease,
			background-color 0.2s ease,
			opacity 0.2s ease;
	}

	.circle-cursor.is-down {
		width: 32px;
		height: 32px;
		border-width: 2px;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.circle-cursor.is-interactive {
		width: 48px;
		height: 48px;
		border-width: 1px;
		background-color: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(1px); /* Subtle glass effect inside cursor */
		border-color: rgba(255, 255, 255, 0.8);
	}

	.circle-cursor.is-interactive.is-down {
		width: 40px;
		height: 40px;
		border-width: 2px;
		background-color: rgba(255, 255, 255, 0.3);
	}

	@media (prefers-reduced-motion: reduce) {
		.circle-cursor {
			transition: none;
		}
	}

	@media (pointer: coarse) {
		.circle-cursor {
			display: none !important;
		}
	}
</style>
