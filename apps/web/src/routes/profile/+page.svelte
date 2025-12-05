<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/toastStore';

	let { data, form } = $props();
	let loading = $state(false);

	$effect(() => {
		if (form?.success) {
			toastStore.trigger({
				message: 'Cập nhật hồ sơ thành công!',
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
	<title>Hồ sơ - Novus</title>
</svelte:head>

<div class="bg-base-200/50 flex min-h-screen flex-col">
	<!-- Page container -->
	<div class="w-full px-4 py-8 md:px-8 lg:px-12">
		<div class="mx-auto max-w-4xl space-y-8">
			<!-- Header -->
			<header class="flex items-center justify-between">
				<div>
					<h1 class="font-heading text-base-content text-3xl font-bold md:text-4xl">
						Hồ sơ của bạn
					</h1>
					<p class="text-base-content/70 mt-2 text-base">
						Quản lý thông tin cá nhân và cài đặt tài khoản.
					</p>
				</div>
			</header>

			{#if data.user}
				<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
					<!-- Sidebar / Identity Card -->
					<div class="col-span-1 space-y-6">
						<div class="card bg-base-100 border-base-200 border p-6 shadow-sm">
							<div class="flex flex-col items-center text-center">
								<h2 class="text-base-content text-xl font-bold">
									{data.user.first_name}
									{data.user.last_name}
								</h2>
								<p class="text-primary text-sm font-medium">@{data.user.username}</p>
								<div class="mt-4 flex flex-wrap justify-center gap-2">
									<span class="badge badge-lg badge-outline gap-1 px-3 py-3">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="lucide lucide-shield"
											><path
												d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
											/></svg
										>
										{data.user.role === 'manager' ? 'Quản lý' : 'Thành viên'}
									</span>
								</div>
							</div>
							<div class="divider my-4"></div>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-base-content/60">Trạng thái</span>
									<span class="text-success font-medium">Hoạt động</span>
								</div>
								<div class="flex justify-between">
									<span class="text-base-content/60">Tham gia</span>
									<span class="font-medium">{new Date().toLocaleDateString('vi-VN')}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Main Form -->
					<div class="col-span-1 md:col-span-2">
						<div class="card bg-base-100 border-base-200 border shadow-sm">
							<div class="card-body gap-6 p-6 md:p-8">
								<div>
									<h2 class="text-base-content text-xl font-semibold">Thông tin chi tiết</h2>
									<p class="text-base-content/60 mt-1 text-sm">
										Cập nhật thông tin cá nhân và hồ sơ công khai của bạn.
									</p>
								</div>

								<form
									method="POST"
									action="?/updateProfile"
									use:enhance={() => {
										loading = true;
										return async ({ update }) => {
											await update({ reset: false });
											loading = false;
										};
									}}
									class="space-y-6"
								>
									<!-- Personal Info -->
									<div class="space-y-4">
										<h3 class="text-base-content/80 text-md font-bold tracking-wider uppercase">
											Thông tin cá nhân
										</h3>
										<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
											<div class="form-control w-full">
												<label class="label" for="first_name">
													<span class="label-text font-medium">Họ</span>
												</label>
												<input
													id="first_name"
													type="text"
													name="first_name"
													value={data.user.first_name}
													placeholder="Nhập họ của bạn"
													required
													class="input input-bordered focus:input-primary w-full"
												/>
											</div>

											<div class="form-control w-full">
												<label class="label" for="last_name">
													<span class="label-text font-medium">Tên</span>
												</label>
												<input
													id="last_name"
													type="text"
													name="last_name"
													value={data.user.last_name}
													placeholder="Nhập tên của bạn"
													required
													class="input input-bordered focus:input-primary w-full"
												/>
											</div>
										</div>
									</div>

									<div class="divider"></div>

									<!-- Public Profile -->
									<div class="space-y-4">
										<h3 class="text-base-content/50 text-xs font-bold tracking-wider uppercase">
											Hồ sơ công khai
										</h3>
										<div class="form-control w-full">
											<label class="label" for="username">
												<span class="label-text font-medium">Tên đăng nhập</span>
												<span class="label-text-alt text-base-content/60"
													>Hiển thị trên hồ sơ công khai</span
												>
											</label>
											<div class="join">
												<span
													class="btn btn-disabled join-item border-base-300 bg-base-200 text-base-content/50 border"
													>@</span
												>
												<input
													id="username"
													type="text"
													name="username"
													value={data.user.username}
													placeholder="username"
													required
													class="input input-bordered join-item focus:input-primary w-full"
												/>
											</div>
										</div>
									</div>

									<div class="divider"></div>

									<!-- Account Info -->
									<div class="space-y-4">
										<h3 class="text-base-content/50 text-xs font-bold tracking-wider uppercase">
											Tài khoản
										</h3>
										<div class="form-control w-full">
											<label class="label" for="email">
												<span class="label-text font-medium">Email</span>
												<span class="label-text-alt text-base-content/60"
													>Không thể thay đổi email</span
												>
											</label>
											<input
												id="email"
												type="email"
												value={data.user.email}
												disabled
												class="input input-bordered bg-base-200/50 text-base-content/70 w-full cursor-not-allowed opacity-70"
											/>
										</div>
									</div>

									<!-- Actions -->
									<div
										class="card-actions border-base-200 mt-6 flex items-center justify-end gap-4 border-t pt-6"
									>
										{#if loading}
											<span class="text-base-content/60 text-sm">Đang lưu thay đổi...</span>
										{/if}
										<button type="submit" class="btn btn-primary min-w-[140px]" disabled={loading}>
											{#if loading}
												<span class="loading loading-spinner loading-sm"></span>
											{:else}
												Lưu thay đổi
											{/if}
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
