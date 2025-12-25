<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import {
		Search,
		Filter,
		Eye,
		Edit,
		Trash2,
		X,
		ChevronLeft,
		ChevronRight,
		Users,
		Shield,
		User,
		Mail,
		Calendar,
		CheckCircle2,
		AlertCircle,
		MoreHorizontal,
		Crown,
		Wrench,
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ============================================================
	// TYPES
	// ============================================================
	interface UserData {
		id: string;
		email: string;
		username: string;
		first_name: string;
		last_name: string;
		role: 'manager' | 'operator' | 'user';
		created_at: string;
		updated_at: string;
	}

	// ============================================================
	// CONSTANTS
	// ============================================================
	const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
		manager: { label: 'Quản lý', color: 'badge-primary', icon: Crown },
		operator: { label: 'Nhân viên', color: 'badge-secondary', icon: Wrench },
		user: { label: 'Khách hàng', color: 'badge-ghost', icon: User },
	};

	// ============================================================
	// STATE
	// ============================================================
	const users = $derived(data?.users || []);
	const pagination = $derived(data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });

	// Filter State
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let roleFilter = $state($page.url.searchParams.get('role') || '');
	let isLoading = $state(false);

	// Modal State
	let showDetailModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let selectedUser = $state<UserData | null>(null);

	// Edit form state
	let editFirstName = $state('');
	let editLastName = $state('');
	let editUsername = $state('');
	let editEmail = $state('');
	let editRole = $state<'manager' | 'operator' | 'user'>('user');

	// ============================================================
	// HELPERS
	// ============================================================
	function formatDate(dateString: string): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getRoleInfo(role: string) {
		return ROLE_CONFIG[role] || { label: role, color: 'badge-ghost', icon: User };
	}

	function getPageRange(current: number, total: number) {
		const delta = 2;
		const range = [];
		for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
			range.push(i);
		}
		if (current - delta > 2) range.unshift(-1);
		if (current + delta < total - 1) range.push(-1);

		range.unshift(1);
		if (total > 1) range.push(total);

		return range;
	}

	// ============================================================
	// ACTIONS
	// ============================================================
	function openDetailModal(user: UserData) {
		selectedUser = user;
		showDetailModal = true;
	}

	function openEditModal(user: UserData) {
		selectedUser = user;
		editFirstName = user.first_name;
		editLastName = user.last_name;
		editUsername = user.username;
		editEmail = user.email;
		editRole = user.role;
		showEditModal = true;
	}

	function openDeleteModal(user: UserData) {
		selectedUser = user;
		showDeleteModal = true;
	}

	function closeModals() {
		showDetailModal = false;
		showEditModal = false;
		showDeleteModal = false;
		setTimeout(() => {
			selectedUser = null;
			editFirstName = '';
			editLastName = '';
			editUsername = '';
			editEmail = '';
			editRole = 'user';
		}, 300);
	}

	async function updateParams() {
		const params = new URLSearchParams($page.url.searchParams);
		if (searchQuery) params.set('search', searchQuery);
		else params.delete('search');

		if (roleFilter) params.set('role', roleFilter);
		else params.delete('role');

		params.set('page', '1');

		isLoading = true;
		await goto(`/manage/users?${params.toString()}`, { keepFocus: true });
		isLoading = false;
	}

	async function goToPage(pageNum: number) {
		if (pageNum === pagination.page) return;
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		isLoading = true;
		await goto(`/manage/users?${params.toString()}`);
		isLoading = false;
	}

	function handleReset() {
		searchQuery = '';
		roleFilter = '';
		updateParams();
	}

	// Close modals on success form action
	$effect(() => {
		if (form?.success) closeModals();
	});
</script>

<div class="container mx-auto max-w-7xl p-4 lg:p-6">
	<!-- Header -->
	<div class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
			<p class="text-base-content/60 mt-1 flex items-center gap-2">
				<Users class="h-4 w-4" />
				Tổng cộng {pagination.total} người dùng trong hệ thống
			</p>
		</div>
	</div>

	<!-- Notifications -->
	{#if form?.error}
		<div class="alert alert-error mb-6 shadow-sm" transition:fade>
			<AlertCircle class="h-5 w-5" />
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.success}
		<div class="alert alert-success mb-6 shadow-sm" transition:fade>
			<CheckCircle2 class="h-5 w-5" />
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Filters Toolbar -->
	<div class="bg-base-100 border-base-200 mb-6 rounded-2xl border p-4 shadow-sm">
		<div class="flex flex-col items-end gap-4 lg:flex-row lg:items-center">
			<!-- Search -->
			<div class="form-control relative w-full flex-1">
				<label class="label py-0 pb-1.5" for="search">
					<span class="label-text text-base-content/60 text-xs font-bold uppercase">Tìm kiếm</span>
				</label>
				<div class="relative">
					<Search class="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 opacity-50" />
					<input
						type="text"
						id="search"
						class="input input-bordered w-full pl-9"
						placeholder="Tên, email, username..."
						bind:value={searchQuery}
						onkeydown={(e) => e.key === 'Enter' && updateParams()}
					/>
				</div>
			</div>

			<!-- Role Filter -->
			<div class="form-control w-full lg:w-56">
				<label class="label py-0 pb-1.5" for="role">
					<span class="label-text text-base-content/60 text-xs font-bold uppercase">Vai trò</span>
				</label>
				<div class="relative">
					<Filter class="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 opacity-50" />
					<select
						id="role"
						class="select select-bordered w-full pl-9"
						bind:value={roleFilter}
						onchange={updateParams}
					>
						<option value="">Tất cả vai trò</option>
						{#each Object.entries(ROLE_CONFIG) as [key, conf]}
							<option value={key}>{conf.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Actions -->
			<div class="mt-2 flex w-full gap-2 lg:mt-0 lg:w-auto">
				<button
					class="btn btn-primary flex-1 lg:flex-none"
					onclick={updateParams}
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="loading loading-spinner loading-xs"></span>
					{/if}
					Lọc
				</button>
				<button
					class="btn btn-ghost flex-1 lg:flex-none"
					onclick={handleReset}
					disabled={isLoading}
				>
					Đặt lại
				</button>
			</div>
		</div>
	</div>

	<!-- Main Table -->
	<div
		class="bg-base-100 border-base-200 relative flex min-h-[400px] flex-col overflow-hidden rounded-2xl border shadow-lg"
	>
		{#if isLoading}
			<div
				class="bg-base-100/60 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
				transition:fade
			>
				<span class="loading loading-spinner loading-lg text-primary"></span>
			</div>
		{/if}

		<div class="flex-1 overflow-x-auto">
			<table class="table-pin-rows table">
				<thead>
					<tr class="bg-base-200/50 text-base-content/70">
						<th class="font-bold">Người dùng</th>
						<th class="font-bold">Email</th>
						<th class="text-center font-bold">Vai trò</th>
						<th class="font-bold">Ngày tạo</th>
						<th class="pr-6 text-right font-bold">Thao tác</th>
					</tr>
				</thead>
				<tbody>
					{#if users.length === 0}
						<tr>
							<td colspan="5" class="h-64 text-center">
								<div class="flex flex-col items-center justify-center opacity-50">
									<Users class="text-base-content/20 mb-4 h-16 w-16" />
									<p class="font-bold">Không tìm thấy người dùng</p>
									<p class="text-sm">Thử thay đổi bộ lọc tìm kiếm</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each users as user (user.id)}
							{@const roleInfo = getRoleInfo(user.role)}
							{@const RoleIcon = roleInfo.icon}

							<tr class="hover group transition-colors">
								<!-- User Info -->
								<td>
									<div class="flex items-center gap-3">
										<div class="avatar placeholder">
											<div
												class="bg-neutral text-neutral-content flex w-10 items-center justify-center rounded-full"
											>
												<span class="text-sm font-bold">
													{user.first_name?.charAt(0) || user.username?.charAt(0) || '?'}
												</span>
											</div>
										</div>
										<div>
											<button
												class="text-primary block text-left font-bold hover:underline"
												onclick={() => openDetailModal(user)}
											>
												{user.first_name}
												{user.last_name}
											</button>
											<span class="text-xs opacity-50">@{user.username}</span>
										</div>
									</div>
								</td>

								<!-- Email -->
								<td>
									<span class="text-sm">{user.email}</span>
								</td>

								<!-- Role -->
								<td class="text-center">
									<div
										class={`badge ${roleInfo.color} bg-opacity-15 text-opacity-100 gap-2 border-0 px-3 py-3 font-medium whitespace-nowrap`}
									>
										<RoleIcon class="h-3.5 w-3.5" />
										{roleInfo.label}
									</div>
								</td>

								<!-- Date -->
								<td class="text-sm whitespace-nowrap opacity-70">
									{formatDate(user.created_at)}
								</td>

								<!-- Actions -->
								<td class="text-right">
									<div class="join">
										<button
											class="btn btn-ghost btn-sm btn-square join-item"
											title="Chi tiết"
											onclick={() => openDetailModal(user)}
										>
											<Eye class="h-4 w-4" />
										</button>
										<button
											class="btn btn-ghost btn-sm btn-square join-item"
											title="Chỉnh sửa"
											onclick={() => openEditModal(user)}
										>
											<Edit class="h-4 w-4" />
										</button>
										<button
											class="btn btn-ghost btn-sm btn-square join-item text-error hover:bg-error/10"
											title="Xóa"
											onclick={() => openDeleteModal(user)}
											disabled={user.id === data.user?.id}
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		{#if pagination.totalPages > 1}
			<div class="border-base-200 bg-base-100/50 flex justify-center border-t p-4 lg:justify-end">
				<div class="join">
					<button
						class="join-item btn btn-sm"
						disabled={pagination.page <= 1}
						onclick={() => goToPage(pagination.page - 1)}
					>
						<ChevronLeft class="h-4 w-4" />
					</button>

					{#each getPageRange(pagination.page, pagination.totalPages) as pageNum}
						{#if pageNum === -1}
							<button class="join-item btn btn-sm btn-disabled">
								<MoreHorizontal class="h-4 w-4" />
							</button>
						{:else}
							<button
								class="join-item btn btn-sm {pagination.page === pageNum
									? 'btn-active btn-primary'
									: ''}"
								onclick={() => goToPage(pageNum)}
							>
								{pageNum}
							</button>
						{/if}
					{/each}

					<button
						class="join-item btn btn-sm"
						disabled={pagination.page >= pagination.totalPages}
						onclick={() => goToPage(pagination.page + 1)}
					>
						<ChevronRight class="h-4 w-4" />
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- ============================================================ -->
<!-- MODALS -->
<!-- ============================================================ -->

<!-- 1. DETAIL MODAL -->
{#if showDetailModal && selectedUser}
	{@const detailRole = getRoleInfo(selectedUser.role)}

	<div class="modal modal-open" transition:fade={{ duration: 150 }}>
		<div
			class="modal-box bg-base-100 w-11/12 max-w-2xl overflow-hidden p-0"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Modal Header -->
			<div class="bg-base-200/50 border-base-200 flex items-center justify-between border-b p-4">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 rounded-full p-2">
						<User class="text-primary h-5 w-5" />
					</div>
					<div>
						<h3 class="text-lg font-bold">Chi tiết người dùng</h3>
						<p class="font-mono text-xs opacity-60">@{selectedUser.username}</p>
					</div>
				</div>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={closeModals}>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="p-6">
				<!-- User Avatar & Name -->
				<div class="mb-6 flex items-center gap-4">
					<div class="avatar placeholder">
						<div
							class="bg-neutral text-neutral-content flex w-16 items-center justify-center rounded-full"
						>
							<span class="text-2xl font-bold">
								{selectedUser.first_name?.charAt(0) || selectedUser.username?.charAt(0) || '?'}
							</span>
						</div>
					</div>
					<div>
						<h2 class="text-xl font-bold">{selectedUser.first_name} {selectedUser.last_name}</h2>
						<p class="text-base-content/60">@{selectedUser.username}</p>
						<div class={`badge ${detailRole.color} mt-2 gap-2`}>
							<svelte:component this={detailRole.icon} class="h-3 w-3" />
							{detailRole.label}
						</div>
					</div>
				</div>

				<!-- Info Grid -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="flex items-start gap-3">
						<Mail class="mt-1 h-4 w-4 opacity-50" />
						<div>
							<p class="text-xs font-bold uppercase opacity-50">Email</p>
							<p class="text-sm">{selectedUser.email}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<Shield class="mt-1 h-4 w-4 opacity-50" />
						<div>
							<p class="text-xs font-bold uppercase opacity-50">Vai trò</p>
							<p class="text-sm">{detailRole.label}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<Calendar class="mt-1 h-4 w-4 opacity-50" />
						<div>
							<p class="text-xs font-bold uppercase opacity-50">Ngày tạo</p>
							<p class="text-sm">{formatDate(selectedUser.created_at)}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<Calendar class="mt-1 h-4 w-4 opacity-50" />
						<div>
							<p class="text-xs font-bold uppercase opacity-50">Cập nhật lần cuối</p>
							<p class="text-sm">{formatDate(selectedUser.updated_at)}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer Actions -->
			<div class="modal-action bg-base-200/30 m-0 p-4">
				<button class="btn" onclick={closeModals}>Đóng</button>
				<button
					class="btn btn-primary"
					onclick={() => {
						showDetailModal = false;
						setTimeout(() => openEditModal(selectedUser!), 200);
					}}
				>
					<Edit class="h-4 w-4" /> Chỉnh sửa
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop bg-neutral/50 backdrop-blur-sm"
			onclick={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}

<!-- 2. EDIT MODAL -->
{#if showEditModal && selectedUser}
	<div class="modal modal-open" transition:fade={{ duration: 150 }}>
		<div class="modal-box w-full max-w-lg" transition:scale={{ duration: 200, start: 0.95 }}>
			<h3 class="mb-4 flex items-center gap-2 text-lg font-bold">
				<Edit class="text-primary h-5 w-5" />
				Chỉnh sửa người dùng
			</h3>

			<form
				method="POST"
				action="?/updateUser"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						await update();
						isLoading = false;
					};
				}}
			>
				<input type="hidden" name="id" value={selectedUser.id} />

				<div class="space-y-4">
					<!-- Name Row -->
					<div class="grid grid-cols-2 gap-4">
						<div class="form-control">
							<label class="label" for="first_name">
								<span class="label-text font-bold">Họ</span>
							</label>
							<input
								type="text"
								id="first_name"
								name="first_name"
								class="input input-bordered"
								bind:value={editFirstName}
								required
							/>
						</div>
						<div class="form-control">
							<label class="label" for="last_name">
								<span class="label-text font-bold">Tên</span>
							</label>
							<input
								type="text"
								id="last_name"
								name="last_name"
								class="input input-bordered"
								bind:value={editLastName}
								required
							/>
						</div>
					</div>

					<!-- Username -->
					<div class="form-control">
						<label class="label" for="username">
							<span class="label-text font-bold">Username</span>
						</label>
						<input
							type="text"
							id="username"
							name="username"
							class="input input-bordered"
							bind:value={editUsername}
							required
							minlength="5"
							maxlength="30"
						/>
					</div>

					<!-- Email -->
					<div class="form-control">
						<label class="label" for="email">
							<span class="label-text font-bold">Email</span>
						</label>
						<input
							type="email"
							id="email"
							name="email"
							class="input input-bordered"
							bind:value={editEmail}
							required
						/>
					</div>

					<!-- Role -->
					<div class="form-control">
						<label class="label" for="role">
							<span class="label-text font-bold">Vai trò</span>
						</label>
						<select
							id="role"
							name="role"
							class="select select-bordered w-full"
							bind:value={editRole}
							disabled={selectedUser.id === data.user?.id}
						>
							{#each Object.entries(ROLE_CONFIG) as [key, conf]}
								<option value={key}>{conf.label}</option>
							{/each}
						</select>
						{#if selectedUser.id === data.user?.id}
							<label class="label">
								<span class="label-text-alt text-warning"
									>Không thể thay đổi vai trò của chính mình</span
								>
							</label>
						{/if}
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-2">
					<button type="button" class="btn btn-ghost" onclick={closeModals} disabled={isLoading}>
						Hủy
					</button>
					<button type="submit" class="btn btn-primary" disabled={isLoading}>
						{#if isLoading}
							<span class="loading loading-spinner"></span>
						{/if}
						Lưu thay đổi
					</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop bg-neutral/50 backdrop-blur-sm"
			onclick={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}

<!-- 3. DELETE MODAL -->
{#if showDeleteModal && selectedUser}
	<div class="modal modal-open" transition:fade={{ duration: 150 }}>
		<div class="modal-box" transition:scale={{ duration: 200, start: 0.95 }}>
			<div class="flex gap-4">
				<div
					class="bg-error/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
				>
					<AlertCircle class="text-error h-6 w-6" />
				</div>
				<div>
					<h3 class="text-error text-lg font-bold">Xóa người dùng?</h3>
					<p class="py-2 text-sm opacity-80">
						Bạn có chắc chắn muốn xóa người dùng <span class="font-bold"
							>{selectedUser.first_name} {selectedUser.last_name}</span
						>
						(@{selectedUser.username})? Hành động này không thể hoàn tác.
					</p>
				</div>
			</div>

			<form
				method="POST"
				action="?/deleteUser"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						await update();
						isLoading = false;
					};
				}}
			>
				<input type="hidden" name="id" value={selectedUser.id} />
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" onclick={closeModals} disabled={isLoading}>
						Hủy bỏ
					</button>
					<button type="submit" class="btn btn-error" disabled={isLoading}>
						{#if isLoading}
							<span class="loading loading-spinner"></span>
						{/if}
						Xóa vĩnh viễn
					</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop bg-neutral/50 backdrop-blur-sm"
			onclick={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}
