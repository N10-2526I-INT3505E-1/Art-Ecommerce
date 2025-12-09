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

	import favicon from '$lib/assets/favicon.png';
	import Footer from '$lib/components/Footer.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import NavigationBar from '$lib/components/NavigationBar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const mouse = new Spring({ x: 0, y: 0 }, { stiffness: 0.15, damping: 0.8 });

	let showCursor = $state(false);
	let cursorDown = $state(false);
	let overInteractive = $state(false);

	function handleMouseMove(event: MouseEvent) {
		mouse.target = { x: event.clientX, y: event.clientY };

		const path = (event.composedPath && event.composedPath()) || [event.target as EventTarget];

		overInteractive = path.some((node) => {
			if (!(node instanceof HTMLElement)) return false;

			const tag = node.tagName;
			if (['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'].includes(tag)) {
				return true;
			}
			const role = node.getAttribute('role');
			if (role === 'button' || role === 'link') return true;
			if (node.tabIndex >= 0) return true;
			return false;
		});

		if (!showCursor) showCursor = true;
	}

	function handleMouseLeave() {
		showCursor = false;
		overInteractive = false;
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

	onMount(() => {
		if (!browser) return;

		const setHeaderHeight = () => {
			const nav = document.querySelector('.navbar');
			const height = nav ? nav.getBoundingClientRect().height : 0;
			document.documentElement.style.setProperty('--header-height', `${height}px`);
		};

		setHeaderHeight();

		const ro = new ResizeObserver(setHeaderHeight);
		const navEl = document.querySelector('.navbar');
		if (navEl) ro.observe(navEl);

		window.addEventListener('load', setHeaderHeight);
		window.addEventListener('resize', setHeaderHeight);

		const isFirefox = navigator.userAgent.includes('Firefox');
		if (isFirefox) document.documentElement.classList.add('platform-firefox');

		if (window.matchMedia('(pointer: fine)').matches) {
			showCursor = true;
			document.documentElement.classList.add('has-custom-cursor');
		}

		return () => {
			ro.disconnect();
			window.removeEventListener('load', setHeaderHeight);
			window.removeEventListener('resize', setHeaderHeight);
		};
	});

	const isAuthPage = $derived(['/login', '/register'].includes(page.url.pathname));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window
	on:mousemove={handleMouseMove}
	on:mouseleave={handleMouseLeave}
	on:mouseenter={handleMouseEnter}
	on:mousedown={handleMouseDown}
	on:mouseup={handleMouseUp}
/>

<ToastContainer />

{#if showCursor}
	<div
		class="circle-cursor"
		class:circle-cursor--down={cursorDown}
		class:circle-cursor--interactive={overInteractive}
		style:transform={`translate3d(${mouse.current.x}px, ${mouse.current.y}px, 0) translate(-50%, -50%)`}
	/>
{/if}

<main
	class="flex flex-col overflow-hidden"
	class:h-dvh={page.url.pathname === '/'}
	style:padding-top={isAuthPage ? '0px' : 'var(--header-height, 0px)'}
>
	{#if !isAuthPage}
		<NavigationBar />
	{/if}

	<div class="flex-1 snap-y snap-proximity overflow-x-hidden overflow-y-auto scroll-smooth">
		{@render children()}
		<Footer />
	</div>
</main>

<style>
	main {
		padding-top: var(--header-height, 0px);
	}

	:global(html.has-custom-cursor),
	:global(html.has-custom-cursor body) {
		cursor:
			url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="white"/></svg>')
				4 4,
			auto;
	}

	:global(footer),
	:global(.footer) {
		scroll-snap-align: start;
	}

	:global(html.has-custom-cursor a),
	:global(html.has-custom-cursor button),
	:global(html.has-custom-cursor [role='button']),
	:global(html.has-custom-cursor input[type='button']),
	:global(html.has-custom-cursor input[type='submit']),
	:global(html.has-custom-cursor input[type='reset']) {
		cursor:
			url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="white"/></svg>')
				4 4,
			pointer;
	}

	.circle-cursor {
		position: fixed;
		top: 0;
		left: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 2px solid white;
		background-color: transparent;
		pointer-events: none;
		z-index: 9999;
		opacity: 1;
		mix-blend-mode: difference;
		filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));

		transform: translate3d(0, 0, 0);

		transition:
			width 180ms cubic-bezier(0.4, 0, 0.2, 1),
			height 180ms cubic-bezier(0.4, 0, 0.2, 1),
			border-width 180ms cubic-bezier(0.4, 0, 0.2, 1),
			opacity 240ms cubic-bezier(0.4, 0, 0.2, 1);

		will-change: transform;
		contain: layout style paint;
		content-visibility: auto;
		user-select: none;
		-webkit-user-select: none;
	}

	.circle-cursor--down {
		width: 42px;
		height: 42px;
		border-width: 2.5px;
		filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6));
	}

	.circle-cursor--interactive {
		width: 40px;
		height: 40px;
		border-width: 2.5px;
		background-color: rgba(255, 255, 255, 0.15);
		filter: drop-shadow(0 0 2.5px rgba(255, 255, 255, 0.55));
	}
</style>
