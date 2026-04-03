<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, Home } from 'lucide-svelte';
</script>

<div
	class="bg-base-100 relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 text-center"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 h-full w-full"
		preserveAspectRatio="xMidYMid slice"
		viewBox="0 0 1440 900"
		><defs
			><path id="shard" fill="currentColor" d="m0-30 25 50h-50z" /><path
				id="debris-box"
				fill="currentColor"
				d="M-12-12h24v24h-24z"
			/><pattern id="error-grid" width="60" height="60" patternUnits="userSpaceOnUse"
				><circle cx="2" cy="2" r="1.5" fill="currentColor" opacity=".06" /></pattern
			><style>
				@keyframes float-up {
					0%,
					to {
						transform: translateY(0);
					}
					50% {
						transform: translateY(-12px);
					}
				}
				@keyframes float-down {
					0%,
					to {
						transform: translateY(0);
					}
					50% {
						transform: translateY(15px);
					}
				}
				@keyframes dash-flow {
					to {
						stroke-dashoffset: -24;
					}
				}
				@keyframes twitch {
					0%,
					25%,
					to {
						transform: rotate(0deg);
					}
					15%,
					5% {
						transform: rotate(12deg);
					}
					10%,
					20% {
						transform: rotate(-8deg);
					}
				}
			</style></defs
		><rect width="100%" height="100%" fill="url(#error-grid)" /><g
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity=".06"
			><path stroke-width="1.5" d="m-20 600 140 30 60-50 120 60 120-50 60 30" /><path
				d="m180 580 20-60 50-20"
			/><path stroke-dasharray="4 4" stroke-width=".8" d="m300 640 20 60-40 50" /><path
				stroke-width="1.5"
				d="m1460 200-110 20-70-60-130 80-100-50"
			/><path d="m1280 160-30-60" /></g
		><g fill="none" stroke="currentColor" opacity=".1"
			><path
				stroke-dasharray="6 8"
				stroke-width="1.5"
				d="M1250-20q-50 170 50 320t-150 250 50 200"
				style="animation:dash-flow 2s linear infinite"
			/><path stroke-width="2" d="m1190 740 20 20m0-20-20 20" /></g
		><g opacity=".06"
			><g style="animation:float-down 11s ease-in-out infinite"
				><g transform="translate(200 220)"
					><use href="#shard" transform="rotate(25)scale(1.8)" /><use
						href="#debris-box"
						transform="rotate(-15 -253.83 -419.788)scale(.6)"
					/><circle cx="-60" cy="40" r="3" fill="currentColor" /></g
				><g transform="translate(1250 450)"
					><use href="#shard" transform="rotate(-45)scale(1.2)" /><circle
						cx="40"
						cy="-30"
						r="2"
						fill="currentColor"
					/></g
				><g transform="translate(150 750)"
					><use href="#shard" transform="rotate(60)scale(.9)" /><use
						href="#debris-box"
						transform="rotate(12 297.86 545.862)scale(.8)"
					/></g
				></g
			><g style="animation:float-up 8s ease-in-out infinite"
				><g transform="translate(1150 150)"
					><use href="#shard" transform="rotate(-70)scale(.7)" /><use
						href="#debris-box"
						transform="rotate(35 -176.864 -118.58)scale(1.1)"
					/></g
				><g transform="translate(300 450)"
					><path
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						d="m-10.607-18.371 28.978 7.764-7.764 28.978-28.978-7.764z"
					/><use href="#shard" transform="rotate(-20 223.564 390.277)scale(.6)" /><circle
						cx="50"
						cy="60"
						r="2.5"
						fill="currentColor"
					/></g
				><g transform="translate(1050 820)"
					><use href="#shard" transform="rotate(15)scale(2.5)" /><use
						href="#debris-box"
						transform="rotate(-40 -7.424 -236.06)scale(.7)"
					/></g
				></g
			></g
		><g opacity=".1" transform="translate(250 750)"
			><circle
				r="50"
				fill="none"
				stroke="currentColor"
				stroke-dasharray="15 8 30 8 6 12"
				stroke-width="1.5"
			/><circle
				r="40"
				fill="none"
				stroke="currentColor"
				stroke-dasharray="3 6"
				stroke-width=".5"
			/><path stroke="currentColor" d="M-38 0h13M38 0H25M0 38V25" /><g
				style="animation:twitch 6s ease-in-out infinite"
				><path fill="currentColor" d="M-4 0h8L0-45z" /><path
					stroke="currentColor"
					stroke-width="1.5"
					d="M0 0v25"
				/><circle r="4" fill="currentColor" /></g
			></g
		></svg
	>
	<p class="font-josefin text-8xl font-bold">
		{page.status}
	</p>

	<p class="mt-2 text-2xl font-semibold sm:text-3xl">
		{#if page.status === 404}
			Không tìm thấy trang
		{:else}
			Đã xảy ra lỗi
		{/if}
	</p>

	<p class="mt-3">
		{#if page.status === 404}
			Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
		{:else if page.error?.message}
			{page.error.message}
		{:else}
			Có lỗi xảy ra. Vui lòng thử lại sau.
		{/if}
	</p>

	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<button class="btn btn-primary gap-2" onclick={() => history.back()}>
			<ArrowLeft class="size-4" />
			Quay lại
		</button>
		<a href="/" class="btn btn-outline gap-2">
			<Home class="size-4" />
			Trang chủ
		</a>
	</div>
</div>
