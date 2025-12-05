<script>
	import Sidebar from '$lib/components/Sidebar.svelte';
</script>

<div class="bg-base-100 flex min-h-screen">
	<Sidebar role="manager" />
	<main class="flex-1 overflow-y-auto p-8">
		<slot />
	</main>
</div>
