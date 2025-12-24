<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	$: role = data.role;
</script>

<div class="bg-base-100 flex min-h-screen">
	<Sidebar {role} />
	<main class="flex-1 overflow-y-auto p-8">
		<slot />
	</main>
</div>
