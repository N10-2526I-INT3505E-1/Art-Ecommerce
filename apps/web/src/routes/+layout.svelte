<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/josefin-sans';
	import '@fontsource-variable/raleway';
	import '@fontsource-variable/work-sans';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.png';
	import Footer from '$lib/components/Footer.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import type { LayoutProps } from './$types';

	import '@fontsource/cormorant-sc';
	import '@fontsource-variable/raleway';
	import '@fontsource-variable/montserrat';
	import type Lenis from 'lenis';
	import NavigationBar from '$lib/components/NavigationBar.svelte';

	let { data, children }: LayoutProps = $props();
	let lenis: Lenis;

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

		return () => {
			ro.disconnect();
			window.removeEventListener('load', setHeaderHeight);
			window.removeEventListener('resize', setHeaderHeight);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ToastContainer />
<main class="flex min-h-screen flex-col">
	<NavigationBar />
	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
	<Footer />
</main>

<style>
	main {
		padding-top: var(--header-height, 0px);
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}
</style>
