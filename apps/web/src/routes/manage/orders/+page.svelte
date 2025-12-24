<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	$: orders = data?.orders || [];
	$: pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
	$: filters = data?.filters || { status: '', search: '' };

	// Modal states
	let showDetailModal = false;
	let showStatusModal = false;
	let showDeleteModal = false;
	let selectedOrder: any = null;
	let newStatus = '';

	// Filter states
	let searchQuery = '';
	let statusFilter = '';

	// Initialize from filters
	$: {
		searchQuery = filters?.search || '';
		statusFilter = filters?.status || '';
	}

	const statusOptions = [
		{ value: 'pending', label: 'Chờ thanh toán', class: 'badge-warning' },
		{ value: 'paid', label: 'Đã thanh toán', class: 'badge-success' },
		{ value: 'shipped', label: 'Đang giao', class: 'badge-info' },
		{ value: 'delivered', label: 'Đã giao', class: 'badge-primary' },
		{ value: 'cancelled', label: 'Đã hủy', class: 'badge-error' },
	];

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getStatusBadge(status: string): { class: string; label: string } {
		const option = statusOptions.find((o) => o.value === status);
		return option || { class: 'badge-ghost', label: status };
	}

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
		selectedOrder = null;
		newStatus = '';
	}

	function handleFilter() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (statusFilter) params.set('status', statusFilter);
		window.location.href = `/manage/orders?${params.toString()}`;
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		window.location.href = `/manage/orders?${params.toString()}`;
	}

	$: if (form?.success) {
		closeModals();
	}
</script>

<div class="container mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Quản lý đơn hàng</h1>
		<div class="text-sm opacity-70">
			Tổng: {pagination.total} đơn hàng
		</div>
	</div>

	<!-- Bộ lọc -->
	<div class="bg-base-100 rounded-box mb-6 p-4 shadow">
		<div class="flex flex-wrap items-end gap-4">
			<div class="form-control flex-1">
				<label class="label" for="search">
					<span class="label-text">Tìm kiếm</span>
				</label>
				<input
					type="text"
					id="search"
					class="input input-bordered"
					placeholder="Tìm theo ID đơn hàng..."
					bind:value={searchQuery}
					on:keypress={(e) => e.key === 'Enter' && handleFilter()}
				/>
			</div>
			<div class="form-control w-48">
				<label class="label" for="status">
					<span class="label-text">Trạng thái</span>
				</label>
				<select id="status" class="select select-bordered" bind:value={statusFilter}>
					<option value="">Tất cả</option>
					{#each statusOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
			<button class="btn btn-primary" on:click={handleFilter}>Lọc</button>
			<a href="/manage/orders" class="btn btn-ghost">Đặt lại</a>
		</div>
	</div>

	<!-- Thông báo -->
	{#if form?.error}
		<div class="alert alert-error mb-4">
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.success}
		<div class="alert alert-success mb-4">
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Bảng đơn hàng -->
	<div class="bg-base-100 rounded-box overflow-x-auto shadow-xl">
		<table class="table w-full">
			<thead>
				<tr class="bg-base-200">
					<th>Mã đơn hàng</th>
					<th>Khách hàng</th>
					<th>Số SP</th>
					<th>Tổng tiền</th>
					<th>Trạng thái</th>
					<th>Ngày tạo</th>
					<th>Thao tác</th>
				</tr>
			</thead>
			<tbody>
				{#if orders.length === 0}
					<tr>
						<td colspan="7" class="py-8 text-center opacity-50">Không tìm thấy đơn hàng nào</td>
					</tr>
				{:else}
					{#each orders as order}
						<tr class="hover">
							<td>
								<button
									class="link link-primary font-mono text-sm"
									on:click={() => openDetailModal(order)}
								>
									{order.id.slice(0, 8)}...
								</button>
							</td>
							<td>
								<div class="text-sm">
									<div class="font-medium">{order.user_id?.slice(0, 8)}...</div>
								</div>
							</td>
							<td>
								<span class="badge badge-ghost">{order.itemCount} SP</span>
							</td>
							<td class="font-medium">{formatCurrency(order.total_amount)}</td>
							<td>
								<span class="badge {getStatusBadge(order.status).class}">
									{getStatusBadge(order.status).label}
								</span>
							</td>
							<td class="text-sm opacity-70">{formatDate(order.created_at)}</td>
							<td>
								<div class="flex gap-1">
									<button
										class="btn btn-ghost btn-xs"
										title="Xem chi tiết"
										on:click={() => openDetailModal(order)}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									</button>
									<button
										class="btn btn-ghost btn-xs"
										title="Cập nhật trạng thái"
										on:click={() => openStatusModal(order)}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										class="btn btn-ghost btn-xs text-error"
										title="Xóa đơn hàng"
										on:click={() => openDeleteModal(order)}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Phân trang -->
	{#if pagination.totalPages > 1}
		<div class="mt-6 flex justify-center">
			<div class="join">
				<button
					class="join-item btn"
					disabled={pagination.page <= 1}
					on:click={() => goToPage(pagination.page - 1)}
				>
					«
				</button>
				{#each Array(pagination.totalPages) as _, i}
					{#if i + 1 === pagination.page || i + 1 === 1 || i + 1 === pagination.totalPages || (i + 1 >= pagination.page - 1 && i + 1 <= pagination.page + 1)}
						<button
							class="join-item btn"
							class:btn-active={i + 1 === pagination.page}
							on:click={() => goToPage(i + 1)}
						>
							{i + 1}
						</button>
					{:else if i + 1 === pagination.page - 2 || i + 1 === pagination.page + 2}
						<button class="join-item btn btn-disabled">...</button>
					{/if}
				{/each}
				<button
					class="join-item btn"
					disabled={pagination.page >= pagination.totalPages}
					on:click={() => goToPage(pagination.page + 1)}
				>
					»
				</button>
			</div>
		</div>
	{/if}

	<div class="mt-4 text-center text-sm opacity-70">
		Hiển thị {orders.length} / {pagination.total} đơn hàng
	</div>
</div>

<!-- Modal Chi tiết đơn hàng -->
{#if showDetailModal && selectedOrder}
	<div class="modal modal-open">
		<div class="modal-box max-w-3xl">
			<button class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2" on:click={closeModals}
				>✕</button
			>
			<h3 class="mb-4 text-lg font-bold">Chi tiết Đơn hàng</h3>

			<div class="mb-4 grid grid-cols-2 gap-4">
				<div>
					<p class="text-sm opacity-70">Mã đơn hàng</p>
					<p class="font-mono text-sm font-medium">{selectedOrder.id}</p>
				</div>
				<div>
					<p class="text-sm opacity-70">Trạng thái</p>
					<span class="badge {getStatusBadge(selectedOrder.status).class}">
						{getStatusBadge(selectedOrder.status).label}
					</span>
				</div>
				<div>
					<p class="text-sm opacity-70">Khách hàng ID</p>
					<p class="font-mono text-sm">{selectedOrder.user_id}</p>
				</div>
				<div>
					<p class="text-sm opacity-70">Ngày tạo</p>
					<p class="text-sm">{formatDate(selectedOrder.created_at)}</p>
				</div>
				<div class="col-span-2">
					<p class="text-sm opacity-70">Địa chỉ giao hàng</p>
					<p class="text-sm">{selectedOrder.shipping_address || 'Chưa có'}</p>
				</div>
			</div>

			<div class="divider">Sản phẩm ({selectedOrder.items?.length || 0})</div>

			<div class="overflow-x-auto">
				<table class="table-sm table w-full">
					<thead>
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
												<div class="mask mask-squircle h-10 w-10">
													<img src={item.image} alt={item.name} />
												</div>
											</div>
											<div>
												<div class="font-medium">{item.name}</div>
												<div class="text-xs opacity-50">ID: {item.product_id?.slice(0, 8)}...</div>
											</div>
										</div>
									</td>
									<td class="text-right">{formatCurrency(item.price)}</td>
									<td class="text-center">{item.quantity}</td>
									<td class="text-right font-medium"
										>{formatCurrency(item.price * item.quantity)}</td
									>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="4" class="text-center opacity-50">Không có sản phẩm</td>
							</tr>
						{/if}
					</tbody>
					<tfoot>
						<tr class="border-t-2">
							<td colspan="3" class="text-right font-bold">Tổng cộng:</td>
							<td class="text-primary text-right text-lg font-bold"
								>{formatCurrency(selectedOrder.total_amount)}</td
							>
						</tr>
					</tfoot>
				</table>
			</div>

			<div class="modal-action">
				<button class="btn btn-ghost" on:click={closeModals}>Đóng</button>
				<button
					class="btn btn-primary"
					on:click={() => {
						showDetailModal = false;
						openStatusModal(selectedOrder);
					}}
				>
					Cập nhật trạng thái
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			on:click={closeModals}
			on:keypress={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}

<!-- Modal Cập nhật trạng thái -->
{#if showStatusModal && selectedOrder}
	<div class="modal modal-open">
		<div class="modal-box">
			<button class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2" on:click={closeModals}
				>✕</button
			>
			<h3 class="mb-4 text-lg font-bold">Cập nhật Trạng thái</h3>
			<p class="mb-4 text-sm opacity-70">
				Đơn hàng: <span class="font-mono">{selectedOrder.id.slice(0, 8)}...</span>
			</p>

			<form method="POST" action="?/updateStatus" use:enhance>
				<input type="hidden" name="id" value={selectedOrder.id} />

				<div class="form-control">
					<label class="label" for="new-status">
						<span class="label-text">Trạng thái mới</span>
					</label>
					<select
						id="new-status"
						name="status"
						class="select select-bordered w-full"
						bind:value={newStatus}
					>
						{#each statusOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="mt-2 text-sm">
					<span class="opacity-70">Trạng thái hiện tại:</span>
					<span class="badge {getStatusBadge(selectedOrder.status).class} ml-2">
						{getStatusBadge(selectedOrder.status).label}
					</span>
				</div>

				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={closeModals}>Hủy</button>
					<button type="submit" class="btn btn-primary">Cập nhật</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
			on:click={closeModals}
			on:keypress={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}

<!-- Modal Xác nhận xóa -->
{#if showDeleteModal && selectedOrder}
	<div class="modal modal-open">
		<div class="modal-box">
			<button class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2" on:click={closeModals}
				>✕</button
			>
			<h3 class="text-error text-lg font-bold">Xác nhận Xóa</h3>
			<p class="py-4">
				Bạn có chắc chắn muốn xóa đơn hàng <strong class="font-mono"
					>{selectedOrder.id.slice(0, 8)}...</strong
				>?
			</p>
			<p class="text-warning text-sm">⚠️ Hành động này không thể hoàn tác.</p>

			<form method="POST" action="?/delete" use:enhance>
				<input type="hidden" name="id" value={selectedOrder.id} />
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={closeModals}>Hủy</button>
					<button type="submit" class="btn btn-error">Xóa đơn hàng</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
			on:click={closeModals}
			on:keypress={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}
