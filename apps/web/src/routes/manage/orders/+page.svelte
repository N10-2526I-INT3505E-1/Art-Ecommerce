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
		Package,
		CreditCard,
		Calendar,
		User,
		MapPin,
		CheckCircle2,
		AlertCircle,
		Truck,
		ShoppingBag,
		MoreHorizontal,
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form } = $props();

	// ============================================================
	// TYPES
	// ============================================================
	interface OrderItem {
		name: string;
		image: string;
		product_id: string;
		price: number;
		quantity: number;
	}

	interface Order {
		id: string;
		user_id: string;
		user_name: string;
		user_username: string;
		user_email: string;
		itemCount: number;
		total_amount: number;
		status: string;
		created_at: string;
		shipping_address: string;
		items: OrderItem[];
	}

	// ============================================================
	// CONSTANTS
	// ============================================================
	const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
		pending: { label: 'Chờ thanh toán', color: 'badge-warning', icon: AlertCircle },
		paid: { label: 'Đã thanh toán', color: 'badge-success', icon: CreditCard },
		shipped: { label: 'Đang giao', color: 'badge-info', icon: Truck },
		delivered: { label: 'Đã giao', color: 'badge-primary', icon: CheckCircle2 },
		cancelled: { label: 'Đã hủy', color: 'badge-error', icon: X },
	};

	// ============================================================
	// STATE
	// ============================================================
	// Derived Data
	const orders = $derived(data?.orders || []);
	const pagination = $derived(data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });

	// Filter State
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || '');
	let isLoading = $state(false);

	// Modal State
	let showDetailModal = $state(false);
	let showStatusModal = $state(false);
	let showDeleteModal = $state(false);
	let selectedOrder = $state<Order | null>(null);
	let newStatus = $state('');

	// ============================================================
	// HELPERS
	// ============================================================
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	}

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

	function getStatusInfo(status: string) {
		return STATUS_CONFIG[status] || { label: status, color: 'badge-ghost', icon: AlertCircle };
	}

	// Pagination Logic to show [1, ..., 4, 5, 6, ..., 10]
	function getPageRange(current: number, total: number) {
		const delta = 2;
		const range = [];
		for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
			range.push(i);
		}
		if (current - delta > 2) range.unshift(-1); // -1 represents '...'
		if (current + delta < total - 1) range.push(-1);

		range.unshift(1);
		if (total > 1) range.push(total);

		return range;
	}

	// ============================================================
	// ACTIONS
	// ============================================================
	function openDetailModal(order: any) {
		selectedOrder = order;
		showDetailModal = true;
	}

	function openStatusModal(order: any) {
		selectedOrder = order;
		newStatus = order.status;
		showStatusModal = true;
	}

	function openDeleteModal(order: any) {
		selectedOrder = order;
		showDeleteModal = true;
	}

	function closeModals() {
		showDetailModal = false;
		showStatusModal = false;
		showDeleteModal = false;
		setTimeout(() => {
			selectedOrder = null;
			newStatus = '';
		}, 300); // Clear after animation
	}

	async function updateParams() {
		const params = new URLSearchParams($page.url.searchParams);
		if (searchQuery) params.set('search', searchQuery);
		else params.delete('search');

		if (statusFilter) params.set('status', statusFilter);
		else params.delete('status');

		params.set('page', '1'); // Reset to page 1 on filter change

		isLoading = true;
		await goto(`/manage/orders?${params.toString()}`, { keepFocus: true });
		isLoading = false;
	}

	async function goToPage(pageNum: number) {
		if (pageNum === pagination.page) return;
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		isLoading = true;
		await goto(`/manage/orders?${params.toString()}`);
		isLoading = false;
	}

	function handleReset() {
		searchQuery = '';
		statusFilter = '';
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
			<h1 class="text-3xl font-bold tracking-tight">Quản lý đơn hàng</h1>
			<p class="text-base-content/60 mt-1 flex items-center gap-2">
				<Package class="h-4 w-4" />
				Tổng cộng {pagination.total} đơn hàng trong hệ thống
			</p>
		</div>
	</div>

	<!-- Stats / Notifications -->
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
						placeholder="Mã đơn hàng, tên khách..."
						bind:value={searchQuery}
						onkeydown={(e) => e.key === 'Enter' && updateParams()}
					/>
				</div>
			</div>

			<!-- Status Filter -->
			<div class="form-control w-full lg:w-56">
				<label class="label py-0 pb-1.5" for="status">
					<span class="label-text text-base-content/60 text-xs font-bold uppercase">Trạng thái</span
					>
				</label>
				<div class="relative">
					<Filter class="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 opacity-50" />
					<select
						id="status"
						class="select select-bordered w-full pl-9"
						bind:value={statusFilter}
						onchange={updateParams}
					>
						<option value="">Tất cả trạng thái</option>
						{#each Object.entries(STATUS_CONFIG) as [key, conf]}
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
						<th class="font-bold">Đơn hàng</th>
						<th class="font-bold">Khách hàng</th>
						<th class="text-center font-bold">Số lượng</th>
						<th class="text-right font-bold">Tổng tiền</th>
						<th class="text-center font-bold">Trạng thái</th>
						<th class="font-bold">Ngày tạo</th>
						<th class="pr-6 text-right font-bold">Thao tác</th>
					</tr>
				</thead>
				<tbody>
					{#if orders.length === 0}
						<tr>
							<td colspan="7" class="h-64 text-center">
								<div class="flex flex-col items-center justify-center opacity-50">
									<ShoppingBag class="text-base-content/20 mb-4 h-16 w-16" />
									<p class="font-bold">Không tìm thấy đơn hàng</p>
									<p class="text-sm">Thử thay đổi bộ lọc tìm kiếm</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each orders as order (order.id)}
							{@const statusInfo = getStatusInfo(order.status)}
							{@const StatusIcon = statusInfo.icon}

							<tr class="hover group transition-colors">
								<!-- ID -->
								<td>
									<div class="flex items-center gap-3">
										<div class="bg-base-200 rounded-lg p-2">
											<Package class="h-5 w-5 opacity-60" />
										</div>
										<div>
											<button
												class="text-primary block text-left font-mono font-bold hover:underline"
												onclick={() => openDetailModal(order)}
											>
												#{order.id.slice(0, 8)}
											</button>
										</div>
									</div>
								</td>

								<!-- User -->
								<td>
									<div class="flex max-w-[180px] items-center gap-2">
										<div class="avatar placeholder">
											<div
												class="bg-neutral text-neutral-content flex w-8 items-center justify-center rounded-full"
											>
												<span class="text-xs"
													>{order.user_name?.slice(0, 2).toUpperCase() ||
														order.user_id.slice(0, 2).toUpperCase()}</span
												>
											</div>
										</div>
										<div class="flex flex-col overflow-hidden">
											<span class="truncate text-sm font-medium">{order.user_name || 'N/A'}</span>
											<span class="truncate text-xs opacity-50"
												>@{order.user_username || 'N/A'}</span
											>
										</div>
									</div>
								</td>

								<!-- Items -->
								<td class="text-center">
									<span class="badge badge-ghost badge-sm font-mono">{order.itemCount}</span>
								</td>

								<!-- Total -->
								<td class="text-base-content/80 text-right font-bold">
									{formatCurrency(order.total_amount)}
								</td>

								<!-- Status -->
								<td class="text-center">
									<div
										class={`badge ${statusInfo.color} bg-opacity-15 text-opacity-100 gap-2 border-0 px-3 py-3 font-medium whitespace-nowrap`}
									>
										<StatusIcon class="h-3.5 w-3.5" />
										{statusInfo.label}
									</div>
								</td>

								<!-- Date -->
								<td class="text-sm whitespace-nowrap opacity-70">
									{formatDate(order.created_at)}
								</td>

								<!-- Actions -->
								<td class="text-right">
									<div class="join">
										<button
											class="btn btn-ghost btn-sm btn-square join-item"
											title="Chi tiết"
											onclick={() => openDetailModal(order)}
										>
											<Eye class="h-4 w-4" />
										</button>
										<button
											class="btn btn-ghost btn-sm btn-square join-item"
											title="Cập nhật"
											onclick={() => openStatusModal(order)}
										>
											<Edit class="h-4 w-4" />
										</button>
										<button
											class="btn btn-ghost btn-sm btn-square join-item text-error hover:bg-error/10"
											title="Xóa"
											onclick={() => openDeleteModal(order)}
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
{#if showDetailModal && selectedOrder}
	<!-- Fix: Hoist const to the immediate child of #if -->
	{@const detailStatus = getStatusInfo(selectedOrder.status)}

	<div class="modal modal-open" transition:fade={{ duration: 150 }}>
		<div
			class="modal-box bg-base-100 w-11/12 max-w-4xl overflow-hidden p-0"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Modal Header -->
			<div class="bg-base-200/50 border-base-200 flex items-center justify-between border-b p-4">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 rounded-full p-2">
						<Package class="text-primary h-5 w-5" />
					</div>
					<div>
						<h3 class="text-lg font-bold">Chi tiết đơn hàng</h3>
						<p class="font-mono text-xs opacity-60">#{selectedOrder.id}</p>
					</div>
				</div>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={closeModals}>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="max-h-[70vh] overflow-y-auto p-6">
				<!-- Info Grid -->
				<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
					<div class="space-y-4">
						<div class="flex items-start gap-3">
							<User class="mt-1 h-4 w-4 opacity-50" />
							<div>
								<p class="text-xs font-bold uppercase opacity-50">Khách hàng</p>
								<p class="text-sm font-medium">{selectedOrder.user_name || 'N/A'}</p>
								<p class="text-xs opacity-60">@{selectedOrder.user_username || 'N/A'}</p>
								{#if selectedOrder.user_email}
									<p class="text-xs opacity-50">{selectedOrder.user_email}</p>
								{/if}
							</div>
						</div>
						<div class="flex items-start gap-3">
							<Calendar class="mt-1 h-4 w-4 opacity-50" />
							<div>
								<p class="text-xs font-bold uppercase opacity-50">Ngày đặt</p>
								<p class="text-sm">{formatDate(selectedOrder.created_at)}</p>
							</div>
						</div>
					</div>
					<div class="space-y-4">
						<div class="flex items-start gap-3">
							<div class="mt-1"><Truck class="h-4 w-4 opacity-50" /></div>
							<div>
								<p class="text-xs font-bold uppercase opacity-50">Trạng thái</p>
								<div class={`badge ${detailStatus.color} mt-1 gap-2`}>
									<svelte:component this={detailStatus.icon} class="h-3 w-3" />
									{detailStatus.label}
								</div>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<MapPin class="mt-1 h-4 w-4 opacity-50" />
							<div>
								<p class="text-xs font-bold uppercase opacity-50">Địa chỉ giao hàng</p>
								<p class="text-sm">{selectedOrder.shipping_address || 'Chưa cập nhật'}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Product Table -->
				<div class="border-base-200 overflow-hidden rounded-xl border">
					<table class="table-sm table">
						<thead class="bg-base-200/50">
							<tr>
								<th>Sản phẩm</th>
								<th class="text-right">Đơn giá</th>
								<th class="text-center">SL</th>
								<th class="text-right">Thành tiền</th>
							</tr>
						</thead>
						<tbody>
							{#if selectedOrder.items && selectedOrder.items.length > 0}
								{#each selectedOrder.items as item}
									<tr>
										<td>
											<div class="flex items-center gap-3">
												<div class="avatar">
													<div class="mask mask-squircle bg-base-200 h-10 w-10">
														<img src={item.image || '/placeholder.png'} alt={item.name} />
													</div>
												</div>
												<div>
													<div class="text-sm font-bold">{item.name}</div>
													<div class="text-xs opacity-50">SKU: {item.product_id?.slice(0, 6)}</div>
												</div>
											</div>
										</td>
										<td class="text-right font-mono">{formatCurrency(item.price)}</td>
										<td class="text-center font-bold">{item.quantity}</td>
										<td class="text-right font-bold"
											>{formatCurrency(item.price * item.quantity)}</td
										>
									</tr>
								{/each}
							{:else}
								<tr><td colspan="4" class="py-4 text-center opacity-50">Không có sản phẩm</td></tr>
							{/if}
						</tbody>
						<tfoot class="bg-base-100">
							<tr>
								<td colspan="3" class="pt-4 text-right">Tổng tiền hàng:</td>
								<td class="text-primary pt-4 text-right text-lg font-bold"
									>{formatCurrency(selectedOrder.total_amount)}</td
								>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			<!-- Footer Actions -->
			<div class="modal-action bg-base-200/30 m-0 p-4">
				<button class="btn" onclick={closeModals}>Đóng</button>
				<button
					class="btn btn-primary"
					onclick={() => {
						showDetailModal = false;
						setTimeout(() => openStatusModal(selectedOrder), 200);
					}}
				>
					<Edit class="h-4 w-4" /> Cập nhật trạng thái
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

<!-- 2. STATUS UPDATE MODAL -->
{#if showStatusModal && selectedOrder}
	<div class="modal modal-open" transition:fade={{ duration: 150 }}>
		<div class="modal-box w-full max-w-md" transition:scale={{ duration: 200, start: 0.95 }}>
			<h3 class="mb-4 flex items-center gap-2 text-lg font-bold">
				<Truck class="text-info h-5 w-5" />
				Cập nhật trạng thái
			</h3>

			<div class="py-2">
				<p class="mb-4 text-sm opacity-70">
					Đang cập nhật cho đơn hàng <span class="font-mono font-bold"
						>#{selectedOrder.id.slice(0, 8)}</span
					>
				</p>

				<form
					method="POST"
					action="?/updateStatus"
					use:enhance={() => {
						isLoading = true;
						return async ({ update }) => {
							await update();
							isLoading = false;
							closeModals();
						};
					}}
				>
					<input type="hidden" name="id" value={selectedOrder.id} />

					<div class="form-control w-full">
						<label class="label" for="new_status">
							<span class="label-text font-bold">Trạng thái mới</span>
						</label>
						<select
							id="new_status"
							name="status"
							class="select select-bordered w-full"
							bind:value={newStatus}
						>
							{#each Object.entries(STATUS_CONFIG) as [key, conf]}
								<option value={key}>{conf.label}</option>
							{/each}
						</select>
					</div>

					<div class="mt-6 flex justify-end gap-2">
						<button type="button" class="btn btn-ghost" onclick={closeModals} disabled={isLoading}
							>Hủy</button
						>
						<button type="submit" class="btn btn-primary" disabled={isLoading}>
							{#if isLoading}
								<span class="loading loading-spinner"></span>
							{/if}
							Lưu thay đổi
						</button>
					</div>
				</form>
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

<!-- 3. DELETE MODAL -->
{#if showDeleteModal && selectedOrder}
	<div class="modal modal-open" transition:fade={{ duration: 150 }}>
		<div class="modal-box" transition:scale={{ duration: 200, start: 0.95 }}>
			<div class="flex gap-4">
				<div
					class="bg-error/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
				>
					<AlertCircle class="text-error h-6 w-6" />
				</div>
				<div>
					<h3 class="text-error text-lg font-bold">Xóa đơn hàng?</h3>
					<p class="py-2 text-sm opacity-80">
						Bạn có chắc chắn muốn xóa đơn hàng <span class="font-mono font-bold"
							>#{selectedOrder.id.slice(0, 8)}</span
						>? Hành động này không thể hoàn tác và sẽ xóa toàn bộ dữ liệu liên quan.
					</p>
				</div>
			</div>

			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						await update();
						isLoading = false;
						closeModals();
					};
				}}
			>
				<input type="hidden" name="id" value={selectedOrder.id} />
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" onclick={closeModals} disabled={isLoading}
						>Hủy bỏ</button
					>
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
