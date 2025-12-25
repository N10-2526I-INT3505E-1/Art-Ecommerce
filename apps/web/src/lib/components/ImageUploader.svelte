<script lang="ts">
	import { Upload } from 'lucide-svelte';

	interface Props {
		onImageSelected: (file: File, preview: string) => void;
	}

	let { onImageSelected }: Props = $props();

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFile(files[0]);
		}
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			handleFile(files[0]);
		}
	}

	function handleFile(file: File) {
		if (!file.type.startsWith('image/')) {
			alert('Vui lòng chọn file ảnh');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const preview = e.target?.result as string;
			onImageSelected(file, preview);
		};
		reader.readAsDataURL(file);
	}

	function openFileDialog() {
		fileInput.click();
	}
</script>

<div
	class="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
	class:border-primary={isDragging}
	class:bg-primary={isDragging}
	class:bg-opacity-5={isDragging}
	class:border-base-300={!isDragging}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onclick={openFileDialog}
	role="button"
	tabindex="0"
>
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={handleFileInput}
	/>

	<Upload class="w-12 h-12 mx-auto mb-4 text-base-content/50" />

	<p class="text-lg font-semibold mb-2">Kéo thả ảnh vào đây</p>
	<p class="text-sm text-base-content/70">hoặc click để chọn file</p>
	<p class="text-xs text-base-content/50 mt-2">Hỗ trợ: JPG, PNG, WEBP</p>
</div>
