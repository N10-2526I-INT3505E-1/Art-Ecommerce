<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/toastStore';
	import { Save, Calendar, Clock } from 'lucide-svelte';

	let { data, form } = $props();
	let loading = $state(false);

	const ZODIAC_HOURS = [
		{ value: 'ty', label: 'Giờ Tý (23:00 - 01:00)' },
		{ value: 'suu', label: 'Giờ Sửu (01:00 - 03:00)' },
		{ value: 'dan', label: 'Giờ Dần (03:00 - 05:00)' },
		{ value: 'mao', label: 'Giờ Mão (05:00 - 07:00)' },
		{ value: 'thin', label: 'Giờ Thìn (07:00 - 09:00)' },
		{ value: 'ty_chi', label: 'Giờ Tỵ (09:00 - 11:00)' },
		{ value: 'ngo', label: 'Giờ Ngọ (11:00 - 13:00)' },
		{ value: 'mui', label: 'Giờ Mùi (13:00 - 15:00)' },
		{ value: 'than', label: 'Giờ Thân (15:00 - 17:00)' },
		{ value: 'dau', label: 'Giờ Dậu (17:00 - 19:00)' },
		{ value: 'tuat', label: 'Giờ Tuất (19:00 - 21:00)' },
		{ value: 'hoi', label: 'Giờ Hợi (21:00 - 23:00)' },
	];

	$effect(() => {
		if (form?.success) {
			toastStore.trigger({
				message: 'Cập nhật Bát tự thành công!',
				background: 'variant-filled-success',
			});
		} else if (form?.message) {
			toastStore.trigger({
				message: form.message,
				background: 'variant-filled-error',
			});
		}
	});
</script>

<svelte:head>
	<title>Bát tự - Art Ecommerce</title>
</svelte:head>

<div class="bg-base-200/50 flex min-h-screen flex-col">
	<div class="w-full px-4 py-8 md:px-8 lg:px-12">
		<div class="mx-auto max-w-2xl space-y-8">
			<!-- Header -->
			<header class="flex items-center justify-between">
				<div>
					<h1 class="font-heading text-base-content text-3xl font-bold md:text-4xl">Bát Tự</h1>
					<p class="text-base-content/70 mt-2 text-base">
						Thiết lập ngày giờ sinh để xem lá số Bát tự của bạn.
					</p>
				</div>
			</header>

			{#if data.user}
				<div class="card bg-base-100 border-base-200 border shadow-sm">
					<div class="card-body gap-6 p-6 md:p-8">
						<form
							method="POST"
							action="?/updateBazi"
							use:enhance={() => {
								loading = true;
								return async ({ update }) => {
									await update({ reset: false });
									loading = false;
								};
							}}
							class="space-y-6"
						>
							<!-- Date of Birth -->
							<div class="form-control w-full">
								<label class="label" for="dob">
									<span class="label-text flex items-center gap-2 font-medium">
										<Calendar class="h-4 w-4" />
										Ngày tháng năm sinh (Dương lịch)
									</span>
								</label>
								<input
									id="dob"
									type="date"
									name="dob"
									value={data.user.dob || ''}
									class="input input-bordered focus:input-primary w-full"
									required
								/>
							</div>

							<!-- Birth Hour -->
							<div class="form-control w-full">
								<label class="label" for="birth_hour">
									<span class="label-text flex items-center gap-2 font-medium">
										<Clock class="h-4 w-4" />
										Giờ sinh
									</span>
									<span class="label-text-alt text-base-content/60">Chọn canh giờ</span>
								</label>
								<select
									id="birth_hour"
									name="birth_hour"
									class="select select-bordered focus:select-primary w-full"
									value={data.user.birth_hour || ''}
									required
								>
									<option value="" disabled selected>-- Chọn giờ sinh --</option>
									{#each ZODIAC_HOURS as hour}
										<option value={hour.value}>{hour.label}</option>
									{/each}
								</select>
							</div>

							<div class="divider"></div>

							<!-- Actions -->
							<div class="card-actions flex items-center justify-end gap-4">
								{#if loading}
									<span class="text-base-content/60 text-sm">Đang lưu...</span>
								{/if}
								<button
									type="submit"
									class="btn btn-primary min-w-[140px] gap-2"
									disabled={loading}
								>
									{#if loading}
										<span class="loading loading-spinner loading-sm"></span>
									{:else}
										<Save class="h-4 w-4" />
										Lưu thông tin
									{/if}
								</button>
							</div>
						</form>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
