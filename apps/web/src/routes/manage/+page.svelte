<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: stats = data.stats;
	$: recentOrders = data.recentOrders;

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getStatusBadge(status: string): string {
		switch (status) {
			case 'paid':
				return 'badge-success';
			case 'pending':
				return 'badge-warning';
			case 'cancelled':
				return 'badge-error';
			case 'shipped':
				return 'badge-info';
			default:
				return 'badge-ghost';
		}
	}
</script>

<div class="container mx-auto">
	<h1 class="mb-8 text-3xl font-bold">Bảng điều khiển</h1>

	<!-- Stats Card - Single Long Card -->
	<div class="bg-base-100 rounded-box mb-8 shadow-xl">
		<div class="grid grid-cols-1 divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
			<!-- Tổng doanh thu -->
			<div class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-base-content/70 text-sm">Tổng doanh thu</p>
						<p class="text-primary text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
					</div>
					<div class="bg-primary/10 rounded-full p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="text-primary h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Tổng đơn hàng -->
			<div class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-base-content/70 text-sm">Tổng đơn hàng</p>
						<p class="text-2xl font-bold">{stats.totalOrders}</p>
						<div class="mt-2 flex gap-3 text-xs">
							<span class="text-warning">⏳ {stats.pendingOrders} chờ</span>
							<span class="text-success">✓ {stats.paidOrders} đã TT</span>
						</div>
					</div>
					<div class="bg-secondary/10 rounded-full p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="text-secondary h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Tổng sản phẩm -->
			<div class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-base-content/70 text-sm">Tổng sản phẩm</p>
						<p class="text-2xl font-bold">{stats.totalProducts}</p>
						{#if stats.lowStockProducts > 0}
							<p class="text-error mt-2 text-xs">⚠️ {stats.lowStockProducts} sắp hết hàng</p>
						{/if}
					</div>
					<div class="bg-accent/10 rounded-full p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="text-accent h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Đơn đã hủy -->
			<div class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-base-content/70 text-sm">Đơn đã hủy</p>
						<p class="text-2xl font-bold">{stats.cancelledOrders}</p>
					</div>
					<div class="bg-error/10 rounded-full p-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="text-error h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Thao tác nhanh -->
	<div class="mb-8">
		<h2 class="mb-4 text-xl font-semibold">Thao tác nhanh</h2>
		<div class="flex flex-wrap gap-4">
			<a href="/manage/products" class="btn btn-primary">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-2 h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
					/>
				</svg>
				Quản lý sản phẩm
			</a>
			<a href="/manage/orders" class="btn btn-secondary">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-2 h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
				Quản lý đơn hàng
			</a>
		</div>
	</div>

	<!-- Đơn hàng gần đây -->
	<div class="bg-base-100 rounded-box shadow-xl">
		<div class="flex items-center justify-between border-b p-6">
			<h2 class="text-xl font-semibold">Đơn hàng gần đây</h2>
			<a href="/manage/orders" class="btn btn-ghost btn-sm">Xem tất cả →</a>
		</div>
		<div class="overflow-x-auto">
			<table class="table w-full">
				<thead>
					<tr class="bg-base-200">
						<th>Mã đơn hàng</th>
						<th>Trạng thái</th>
						<th>Số tiền</th>
						<th>Ngày tạo</th>
					</tr>
				</thead>
				<tbody>
					{#if recentOrders.length === 0}
						<tr>
							<td colspan="4" class="py-8 text-center opacity-50">Chưa có đơn hàng nào</td>
						</tr>
					{:else}
						{#each recentOrders as order}
							<tr class="hover">
								<td>
									<a href="/manage/orders" class="link link-primary font-mono text-sm">
										{order.id.slice(0, 8)}...
									</a>
								</td>
								<td>
									<span class="badge {getStatusBadge(order.status)}">{order.status}</span>
								</td>
								<td>{formatCurrency(order.total_amount)}</td>
								<td class="text-sm opacity-70">{formatDate(order.created_at)}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
