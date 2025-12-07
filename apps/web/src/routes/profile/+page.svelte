<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/toastStore';

	let { data, form } = $props();

	let profileLoading = $state(false);

	let addressLoading = $state(false);
	let showAddressModal = $state(false);
	let editingAddress = $state<UserAddress | null>(null);

	let isEditMode = $derived(!!editingAddress?.id && editingAddress.id > 0);

	// Xử lý kết quả trả về từ server actions
	$effect(() => {
		if (form?.success) {
			toastStore.trigger({
				message: form.message || 'Thao tác thành công!',
				background: 'variant-filled-success',
			});
			if (form.type === 'address') {
				showAddressModal = false;
				editingAddress = null;
			}
		} else if (form?.message) {
			toastStore.trigger({
				message: form.message,
				background: 'variant-filled-error',
			});
		}
	});

	// Hàm mở modal để thêm địa chỉ mới
	function openAddModal() {
		editingAddress = {
			id: 0, // ID tạm, isEditMode sẽ là false
			user_id: data.user?.id || '',
			address: '',
			phone: '',
			state: '',
			country: 'Việt Nam',
			postal_code: '',
			is_default: 0,
			created_at: '',
			updated_at: '',
		};
		showAddressModal = true;
	}

	// Hàm mở modal để chỉnh sửa địa chỉ đã có
	function openEditModal(address: UserAddress) {
		// Tạo một bản sao của object để tránh thay đổi dữ liệu gốc
		editingAddress = { ...address };
		showAddressModal = true;
	}

	function closeModal() {
		showAddressModal = false;
		editingAddress = null;
	}
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
									<span class="font-medium"
										>{new Date(data.user.created_at).toLocaleDateString('vi-VN')}</span
									>
								</div>
							</div>
						</div>
					</div>

					<!-- Main Content Column -->
					<div class="col-span-1 space-y-8 md:col-span-2">
						<!-- Form Cập nhật thông tin chi tiết -->
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
										profileLoading = true;
										return async ({ update }) => {
											await update({ reset: false });
											profileLoading = false;
										};
									}}
									class="space-y-6"
								>
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
									<div
										class="card-actions border-base-200 mt-6 flex items-center justify-end gap-4 border-t pt-6"
									>
										{#if profileLoading}
											<span class="text-base-content/60 text-sm">Đang lưu...</span>
										{/if}
										<button
											type="submit"
											class="btn btn-primary min-w-[140px]"
											disabled={profileLoading}
										>
											{#if profileLoading}
												<span class="loading loading-spinner loading-sm"></span>
											{:else}
												Lưu thay đổi
											{/if}
										</button>
									</div>
								</form>
							</div>
						</div>

						<!-- Khu vực quản lý địa chỉ -->
						<div class="card bg-base-100 border-base-200 border shadow-sm">
							<div class="card-body gap-6 p-6 md:p-8">
								<div class="flex items-center justify-between">
									<div>
										<h2 class="text-base-content text-xl font-semibold">Sổ địa chỉ</h2>
										<p class="text-base-content/60 mt-1 text-sm">
											Quản lý các địa chỉ giao hàng của bạn.
										</p>
									</div>
									<button class="btn btn-primary btn-sm" onclick={openAddModal}>
										Thêm địa chỉ
									</button>
								</div>
								<div class="space-y-4">
									{#if data.addresses && data.addresses.length > 0}
										{#each data.addresses as address (address.id)}
											<div
												class="border-base-200 flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
											>
												<div>
													<div class="flex items-center gap-2">
														<p class="font-semibold">{address.address}</p>
														{#if address.is_default}
															<span class="badge badge-primary badge-sm">Mặc định</span>
														{/if}
													</div>
													<p class="text-base-content/70 text-sm">
														{address.state}, {address.country} - SĐT: {address.phone}
													</p>
												</div>
												<div class="flex items-center gap-2 self-end sm:self-center">
													<button
														class="btn btn-ghost btn-sm"
														onclick={() => openEditModal(address)}
													>
														Sửa
													</button>
													<form
														method="POST"
														action="?/deleteAddress"
														use:enhance={({ formElement }) => {
															if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
																return ({ cancel }) => cancel();
															}
															return async ({ update }) => {
																await update();
															};
														}}
													>
														<input type="hidden" name="id" value={address.id} />
														<button type="submit" class="btn btn-ghost text-error btn-sm"
															>Xóa</button
														>
													</form>
												</div>
											</div>
										{/each}
									{:else}
										<p class="text-base-content/60 py-4 text-center">Bạn chưa có địa chỉ nào.</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Modal Thêm/Sửa địa chỉ -->
{#if showAddressModal && editingAddress}
	<div class="modal modal-open">
		<div class="modal-box w-11/12 max-w-2xl">
			<h3 class="text-xl font-bold">{isEditMode ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h3>
			<form
				class="mt-6 space-y-4"
				method="POST"
				action={isEditMode ? '?/updateAddress' : '?/addAddress'}
				use:enhance={() => {
					addressLoading = true;
					return async ({ update }) => {
						await update({ reset: false });
						addressLoading = false;
					};
				}}
			>
				{#if isEditMode}
					<input type="hidden" name="id" value={editingAddress.id} />
				{/if}

				<div class="form-control">
					<label for="address" class="label"><span class="label-text">Địa chỉ chi tiết</span></label
					>
					<input
						id="address"
						name="address"
						type="text"
						bind:value={editingAddress.address}
						class="input input-bordered"
						required
					/>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="form-control">
						<label for="phone" class="label"><span class="label-text">Số điện thoại</span></label>
						<input
							id="phone"
							name="phone"
							type="tel"
							bind:value={editingAddress.phone}
							class="input input-bordered"
							required
						/>
					</div>
					<div class="form-control">
						<label for="state" class="label"><span class="label-text">Tỉnh/Thành phố</span></label>
						<input
							id="state"
							name="state"
							type="text"
							bind:value={editingAddress.state}
							class="input input-bordered"
							required
						/>
					</div>
					<div class="form-control">
						<label for="country" class="label"><span class="label-text">Quốc gia</span></label>
						<input
							id="country"
							name="country"
							type="text"
							bind:value={editingAddress.country}
							class="input input-bordered"
							required
						/>
					</div>
					<div class="form-control">
						<label for="postal_code" class="label"
							><span class="label-text">Mã bưu chính (Tùy chọn)</span></label
						>
						<input
							id="postal_code"
							name="postal_code"
							type="text"
							bind:value={editingAddress.postal_code}
							class="input input-bordered"
						/>
					</div>
				</div>
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-4">
						<input
							name="is_default"
							type="checkbox"
							checked={editingAddress.is_default === 1}
							class="checkbox checkbox-primary"
						/>
						<span class="label-text">Đặt làm địa chỉ mặc định</span>
					</label>
				</div>
				<div class="modal-action">
					<button type="button" class="btn" onclick={closeModal}>Hủy</button>
					<button type="submit" class="btn btn-primary" disabled={addressLoading}>
						{#if addressLoading}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							Lưu địa chỉ
						{/if}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={closeModal}></div>
	</div>
{/if}
