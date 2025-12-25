<script lang="ts">
	import { Search, X, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { searchStore, type SearchSuggestion } from '$lib/stores/search.svelte';

	let inputValue = $state('');
	let isOpen = $state(false);
	let selectedIndex = $state(-1);
	let inputElement: HTMLInputElement;

	// Derived state
	let suggestions = $derived(searchStore.suggestions);
	let isLoading = $derived(searchStore.isLoadingSuggestions);

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		selectedIndex = -1;

		if (inputValue.length >= 2) {
			isOpen = true;
			searchStore.getSuggestionsDebounced(inputValue);
		} else {
			isOpen = false;
			searchStore.clearSuggestions();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen || suggestions.length === 0) {
			if (event.key === 'Enter' && inputValue.trim()) {
				performSearch(inputValue.trim());
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && suggestions[selectedIndex]) {
					selectSuggestion(suggestions[selectedIndex]);
				} else if (inputValue.trim()) {
					performSearch(inputValue.trim());
				}
				break;
			case 'Escape':
				isOpen = false;
				searchStore.clearSuggestions();
				break;
		}
	}

	function selectSuggestion(suggestion: SearchSuggestion) {
		inputValue = suggestion.name;
		isOpen = false;
		searchStore.clearSuggestions();
		goto(`/products/${suggestion.id}`);
	}

	function performSearch(query: string) {
		isOpen = false;
		searchStore.clearSuggestions();
		goto(`/search?q=${encodeURIComponent(query)}`);
	}

	function clearInput() {
		inputValue = '';
		isOpen = false;
		searchStore.clearSuggestions();
		inputElement?.focus();
	}

	function handleBlur() {
		// Delay to allow click on suggestion
		setTimeout(() => {
			isOpen = false;
		}, 200);
	}

	function handleFocus() {
		if (inputValue.length >= 2 && suggestions.length > 0) {
			isOpen = true;
		}
	}
</script>

<div class="relative w-full max-w-md">
	<!-- Search Input -->
	<div class="relative">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
			{#if isLoading}
				<Loader2 class="z-10 h-4 w-4 animate-spin text-gray-400" />
			{:else}
				<Search class="z-10 h-4 w-4 text-gray-400" />
			{/if}
		</div>

		<input
			bind:this={inputElement}
			type="text"
			placeholder="Tìm kiếm sản phẩm..."
			class="input input-bordered h-10 w-full pr-10 pl-10 text-sm focus:outline-none"
			value={inputValue}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			onfocus={handleFocus}
			autocomplete="off"
			aria-label="Tìm kiếm sản phẩm"
			aria-expanded={isOpen}
			aria-haspopup="listbox"
			role="combobox"
		/>

		{#if inputValue}
			<button
				type="button"
				class="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-gray-700"
				onclick={clearInput}
				aria-label="Xóa tìm kiếm"
			>
				<X class="h-4 w-4 text-gray-400" />
			</button>
		{/if}
	</div>

	<!-- Suggestions Dropdown -->
	{#if isOpen && suggestions.length > 0}
		<ul
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
			role="listbox"
		>
			{#each suggestions as suggestion, index}
				<li
					class="cursor-pointer px-4 py-2 text-sm transition-colors {index === selectedIndex
						? 'bg-primary/10 text-primary'
						: 'hover:bg-gray-100'}"
					role="option"
					aria-selected={index === selectedIndex}
					onclick={() => selectSuggestion(suggestion)}
					onmouseenter={() => (selectedIndex = index)}
				>
					<div class="flex items-center gap-2">
						<Search class="h-3 w-3 text-gray-400" />
						<span class="line-clamp-1">{suggestion.name}</span>
					</div>
				</li>
			{/each}

			<!-- Search all option -->
			<li
				class="border-t border-gray-100 px-4 py-2 text-sm"
				onclick={() => performSearch(inputValue)}
			>
				<div class="text-primary flex items-center gap-2 hover:underline">
					<Search class="h-3 w-3" />
					<span>Tìm kiếm "{inputValue}"</span>
				</div>
			</li>
		</ul>
	{/if}
</div>
