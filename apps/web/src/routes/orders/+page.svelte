<script lang="ts">
	import {
		AlertCircle,
		Calendar,
		Check,
		CheckCircle,
		ChevronDown,
		ChevronUp,
		CircleDot,
		Clock,
		Copy,
		CreditCard,
		FileText,
		Filter,
		MapPin,
		Package,
		RotateCcw,
		Search,
		ShoppingBag,
		SortDesc,
		Star,
		Truck,
		X,
		XCircle,
	} from 'lucide-svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly, slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	// 1. Nhận Data từ Server
	let { data } = $props<{ data: PageData }>();

	// Types
	type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
	type SortOption = 'date_desc' | 'date_asc';
	type ToastType = 'success' | 'error' | 'info';

	interface OrderItem {
		id: number | string;
		product_id: string;
		name: string;
		quantity: number;
		price: number;
		image: string;
		reviewed?: boolean;
	}

	interface Order {
		id: string; // UUID String
		status: OrderStatus;
		total_amount: number;
		created_at: string;
		updated_at?: string;
		shipping_address: string;
		items: OrderItem[];
		tracking_number?: string;
		payment_method?: string;
		shipping_fee?: number;
		discount?: number;
		subtotal?: number;
		estimated_delivery?: string;
	}

	interface StatusOption {
		value: OrderStatus | 'all';
		label: string;
	}

	// Constants & Config
	const STATUS_OPTIONS: StatusOption[] = [
		{ value: 'all', label: 'Tất cả' },
		{ value: 'pending', label: 'Chờ thanh toán' },
		{ value: 'paid', label: 'Đã thanh toán' }, // Thêm trạng thái paid
		{ value: 'processing', label: 'Đang xử lý' },
		{ value: 'shipped', label: 'Đang giao' },
		{ value: 'delivered', label: 'Hoàn thành' },
		{ value: 'cancelled', label: 'Đã hủy' },
	] as const;

	const STATUS_STEPS: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

	const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string; icon: typeof Clock }> = {
		pending: { color: 'badge-warning', label: 'Chờ thanh toán', icon: Clock },
		paid: { color: 'badge-info', label: 'Đã thanh toán', icon: CheckCircle },
		processing: { color: 'badge-info', label: 'Đang xử lý', icon: Package },
		shipped: { color: 'badge-primary', label: 'Đang giao hàng', icon: Truck },
		delivered: { color: 'badge-success', label: 'Đã giao hàng', icon: CheckCircle },
		cancelled: { color: 'badge-error', label: 'Đã hủy', icon: XCircle },
	};

	const BORDER_COLOR_MAP: Record<OrderStatus, string> = {
		pending: 'border-l-warning',
		paid: 'border-l-info',
		processing: 'border-l-info',
		shipped: 'border-l-primary',
		delivered: 'border-l-success',
		cancelled: 'border-l-error',
	};

	// State - Khởi tạo từ Data Server
	let orders = $state<Order[]>(data.orders as Order[]);

	// State UI
	let searchTerm = $state('');
	let statusFilter = $state<OrderStatus | 'all'>('all');
	let sortBy = $state<SortOption>('date_desc');
	let expandedOrder = $state<string | null>(null);
	let showFilters = $state(false);
	let showSortDropdown = $state(false);
	let dateFrom = $state('');
	let dateTo = $state('');
	let isLoading = $state(false);
	let copiedTrackingId = $state<string | null>(null);

	// Toast & Modal State
	let toastMessage = $state('');
	let toastType = $state<ToastType>('success');
	let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let showCancelModal = $state(false);
	let orderToCancel = $state<string | null>(null);

	// Derived Values
	let activeFiltersCount = $derived.by(() => {
		let count = 0;
		if (statusFilter !== 'all') count++;
		if (dateFrom) count++;
		if (dateTo) count++;
		if (searchTerm) count++;
		return count;
	});

	let filteredOrders = $derived.by(() => {
		return orders
			.filter((order) => {
				const searchLower = searchTerm.toLowerCase();
				// Tìm theo ID đơn hoặc tên sản phẩm
				const matchesSearch =
					order.id.toLowerCase().includes(searchLower) ||
					order.items?.some((item) => item.name.toLowerCase().includes(searchLower)) ||
					(order.tracking_number?.toLowerCase().includes(searchLower) ?? false);

				const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

				const orderDate = new Date(order.created_at);
				const matchesDateFrom = !dateFrom || orderDate >= new Date(dateFrom);
				const matchesDateTo = !dateTo || orderDate <= new Date(`${dateTo}T23:59:59`);

				return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
			})
			.sort((a, b) => {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return sortBy === 'date_desc' ? dateB - dateA : dateA - dateB;
			});
	});

	let hasActiveFilters = $derived(searchTerm || statusFilter !== 'all' || dateFrom || dateTo);

	// Helpers
	const currencyFormatter = new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
	});

	function formatCurrency(amount: number): string {
		return currencyFormatter.format(amount);
	}

	function formatDate(dateString: string, includeTime = true): string {
		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			...(includeTime && { hour: '2-digit', minute: '2-digit' }),
		};
		return new Date(dateString).toLocaleDateString('vi-VN', options);
	}

	function formatShortDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('vi-VN', {
			day: 'numeric',
			month: 'numeric',
		});
	}

	function getStatusIndex(status: OrderStatus): number {
		return status === 'cancelled' ? -1 : STATUS_STEPS.indexOf(status);
	}

	function isStepCompleted(status: OrderStatus, stepIndex: number): boolean {
		return getStatusIndex(status) >= stepIndex;
	}

	function getProgressWidth(status: OrderStatus): number {
		const index = Math.max(0, getStatusIndex(status));
		return (index / (STATUS_STEPS.length - 1)) * 100;
	}

	// Image Error Handler
	function handleImageError(e: Event) {
		const target = e.target as HTMLImageElement;
		// Tránh loop vô hạn
		if (!target.src.includes('placehold.co')) {
			target.src = 'https://placehold.co/400x400?text=No+Image';
		}
	}

	// Actions
	function showToast(message: string, type: ToastType = 'success'): void {
		if (toastTimeoutId) clearTimeout(toastTimeoutId);
		toastMessage = message;
		toastType = type;
		toastTimeoutId = setTimeout(() => {
			toastMessage = '';
			toastTimeoutId = null;
		}, 3000);
	}

	function toggleDetails(id: string): void {
		expandedOrder = expandedOrder === id ? null : id;
	}

	function clearAllFilters(): void {
		searchTerm = '';
		statusFilter = 'all';
		dateFrom = '';
		dateTo = '';
		showToast('Đã xóa tất cả bộ lọc', 'info');
	}

	async function copyTrackingNumber(trackingNumber: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(trackingNumber);
			copiedTrackingId = trackingNumber;
			showToast('Đã sao chép mã vận đơn');
			setTimeout(() => (copiedTrackingId = null), 2000);
		} catch {
			showToast('Không thể sao chép', 'error');
		}
	}

	function handlePayNow(orderId: string): void {
		// Logic thanh toán lại (nếu cần)
		showToast('Đang chuyển đến trang thanh toán...', 'info');
		// Ví dụ: goto(`/checkout/retry/${orderId}`);
	}

	function handleReorder(order: Order): void {
		showToast(`Đã thêm ${order.items.length} sản phẩm vào giỏ hàng`, 'success');
	}

	function handleReorderItem(item: OrderItem): void {
		showToast(`Đã thêm "${item.name}" vào giỏ hàng`, 'success');
	}

	function handleDownloadInvoice(orderId: string): void {
		showToast('Tính năng đang phát triển...', 'info');
	}

	function handleReview(orderId: string, itemId: number | string): void {
		showToast('Đang mở form đánh giá...', 'info');
	}

	function openCancelModal(orderId: string): void {
		orderToCancel = orderId;
		showCancelModal = true;
	}

	function closeCancelModal(): void {
		showCancelModal = false;
		orderToCancel = null;
	}

	function confirmCancelOrder(): void {
		if (!orderToCancel) return;
		// Gọi API hủy đơn ở đây
		orders = orders.map((order) =>
			order.id === orderToCancel
				? { ...order, status: 'cancelled' as OrderStatus, updated_at: new Date().toISOString() }
				: order,
		);
		showToast('Đã hủy đơn hàng thành công', 'success');
		closeCancelModal();
	}

	function getSortLabel(sort: SortOption): string {
		return sort === 'date_desc' ? 'Mới nhất' : 'Cũ nhất';
	}

	function handleClickOutside(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (!target.closest('.sort-dropdown')) {
			showSortDropdown = false;
		}
	}

	function closeFilters(): void {
		showFilters = false;
	}

	function getUnreviewedItemId(order: Order): number | string {
		return order.items.find((i) => !i.reviewed)?.id ?? 0;
	}
</script>

<svelte:head>
	<title>Đơn hàng của tôi - Novus</title>
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<!-- Toast Notification -->
{#if toastMessage}
	<div class="fixed top-4 right-4 z-50" transition:fly={{ y: -20, duration: 300 }} role="alert">
		<div
			class="alert shadow-lg {toastType === 'success'
				? 'alert-success'
				: toastType === 'error'
					? 'alert-error'
					: 'alert-info'}"
		>
			{#if toastType === 'success'}
				<Check size={18} />
			{:else if toastType === 'error'}
				<AlertCircle size={18} />
			{:else}
				<Clock size={18} />
			{/if}
			<span class="text-sm">{toastMessage}</span>
		</div>
	</div>
{/if}

<!-- Cancel Modal -->
{#if showCancelModal}
	<div class="modal modal-open" role="dialog">
		<div class="modal-box mx-4">
			<h3 class="text-base font-bold md:text-lg">Xác nhận hủy đơn hàng</h3>
			<p class="py-4 text-sm text-gray-600 md:text-base">
				Bạn có chắc chắn muốn hủy đơn hàng <span class="font-mono font-bold"
					>#{orderToCancel?.slice(0, 8)}</span
				>?
			</p>
			<div class="modal-action">
				<button class="btn btn-ghost btn-sm md:btn-md" onclick={closeCancelModal}>Không</button>
				<button class="btn btn-error btn-sm md:btn-md" onclick={confirmCancelOrder}>Hủy đơn</button>
			</div>
		</div>
		<div class="modal-backdrop bg-black/50" onclick={closeCancelModal} aria-hidden="true"></div>
	</div>
{/if}

<!-- Mobile Filter Drawer -->
{#if showFilters}
	<div class="fixed inset-0 z-50 lg:hidden" transition:fade={{ duration: 200 }} role="dialog">
		<div class="absolute inset-0 bg-black/50" onclick={closeFilters} aria-hidden="true"></div>
		<div
			class="bg-base-100 absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl p-4 md:p-6"
			transition:fly={{ y: 300, duration: 300 }}
		>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-base font-bold">Bộ lọc</h3>
				<button class="btn btn-circle btn-ghost btn-sm" onclick={closeFilters}
					><X size={20} /></button
				>
			</div>
			<!-- Mobile Filters Content -->
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<label class="form-control">
						<div class="label"><span class="label-text text-xs">Từ ngày</span></div>
						<input type="date" class="input input-bordered input-sm w-full" bind:value={dateFrom} />
					</label>
					<label class="form-control">
						<div class="label"><span class="label-text text-xs">Đến ngày</span></div>
						<input type="date" class="input input-bordered input-sm w-full" bind:value={dateTo} />
					</label>
				</div>
				<div>
					<div class="label"><span class="label-text text-xs">Trạng thái</span></div>
					<div class="grid grid-cols-2 gap-2">
						{#each STATUS_OPTIONS as option (option.value)}
							<button
								class="btn btn-sm {statusFilter === option.value ? 'btn-primary' : 'btn-outline'}"
								onclick={() => (statusFilter = option.value)}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>
				<div class="flex gap-3 pt-2">
					<button class="btn btn-ghost btn-sm flex-1" onclick={clearAllFilters}>Xóa bộ lọc</button>
					<button class="btn btn-primary btn-sm flex-1" onclick={closeFilters}>Áp dụng</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<main class="bg-base-200 min-h-screen">
	<div class="px-3 pt-16 pb-8 md:px-6 md:pt-20 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<header class="mb-4 md:mb-6">
				<h1 class="font-montserrat text-xl font-bold text-gray-800 md:text-2xl lg:text-3xl">
					Đơn hàng của tôi
				</h1>
				<p class="mt-1 text-xs text-gray-500 md:text-sm lg:text-base">
					Quản lý và theo dõi trạng thái đơn hàng
				</p>
			</header>

			<!-- Search & Filters -->
			<div class="mb-3 space-y-2 md:mb-4 md:space-y-3">
				<div class="flex gap-2">
					<div class="relative min-w-0 flex-1">
						<Search class="absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-gray-400" />
						<input
							type="search"
							placeholder="Tìm mã đơn, tên sản phẩm..."
							class="input input-bordered input-sm md:input-md w-full pr-8 pl-9 text-sm md:pr-10 md:pl-10"
							bind:value={searchTerm}
						/>
						{#if searchTerm}
							<button
								class="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-400"
								onclick={() => (searchTerm = '')}
							>
								<X size={14} />
							</button>
						{/if}
					</div>
					<button
						class="btn btn-outline btn-sm md:btn-md shrink-0 gap-1 lg:hidden"
						onclick={() => (showFilters = true)}
					>
						<Filter size={16} />
						{#if activeFiltersCount > 0}<span class="badge badge-primary badge-xs"
								>{activeFiltersCount}</span
							>{/if}
					</button>
					<div class="sort-dropdown relative shrink-0">
						<button
							class="btn btn-outline btn-sm md:btn-md gap-1"
							onclick={() => (showSortDropdown = !showSortDropdown)}
						>
							<SortDesc size={16} />
							<span class="hidden md:inline">{getSortLabel(sortBy)}</span>
							<ChevronDown size={14} class={showSortDropdown ? 'rotate-180' : ''} />
						</button>
						{#if showSortDropdown}
							<ul
								class="border-base-300 bg-base-100 absolute top-full right-0 z-20 mt-1 min-w-32 rounded-lg border py-1 shadow-xl"
							>
								{#each [{ value: 'date_desc', label: 'Mới nhất' }, { value: 'date_asc', label: 'Cũ nhất' }] as option}
									<li>
										<button
											class="hover:bg-base-200 flex w-full items-center justify-between px-3 py-2 text-sm"
											onclick={() => {
												sortBy = option.value as SortOption;
												showSortDropdown = false;
											}}
										>
											{option.label}
											{#if sortBy === option.value}<Check size={14} />{/if}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>

				<!-- Desktop Date Filters -->
				<div class="hidden items-center gap-3 lg:flex">
					<div class="flex items-center gap-2">
						<label for="df" class="text-sm text-gray-600">Từ:</label>
						<input
							id="df"
							type="date"
							class="input input-bordered input-sm"
							bind:value={dateFrom}
						/>
					</div>
					<div class="flex items-center gap-2">
						<label for="dt" class="text-sm text-gray-600">Đến:</label>
						<input id="dt" type="date" class="input input-bordered input-sm" bind:value={dateTo} />
					</div>
					{#if activeFiltersCount > 0}
						<button class="btn btn-ghost btn-sm gap-1 text-gray-500" onclick={clearAllFilters}>
							<X size={14} /> Xóa bộ lọc ({activeFiltersCount})
						</button>
					{/if}
				</div>
			</div>

			<!-- Status Pills -->
			<nav
				class="scrollbar-hide -mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-2 md:-mx-0 md:mb-4"
			>
				{#each STATUS_OPTIONS as option (option.value)}
					<button
						class="btn btn-xs md:btn-sm shrink-0 {statusFilter === option.value
							? 'btn-primary'
							: 'btn-ghost bg-base-100'}"
						onclick={() => (statusFilter = option.value)}
					>
						{option.label}
					</button>
				{/each}
			</nav>

			<!-- Orders List -->
			<section class="space-y-3 md:space-y-4">
				{#if isLoading}
					<!-- Skeleton -->
					{#each { length: 3 } as _, i}
						<div class="card bg-base-100 animate-pulse shadow-md">
							<div class="card-body h-32 p-6"></div>
						</div>
					{/each}
				{:else if filteredOrders.length > 0}
					{#each filteredOrders as order (order.id)}
						{@const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG['pending']}
						{@const StatusIcon = statusConfig.icon}
						<article
							class="card bg-base-100 border-l-4 shadow-md transition-shadow hover:shadow-lg {BORDER_COLOR_MAP[
								order.status
							] || 'border-l-base-300'}"
							transition:slide|local={{ duration: 300 }}
							animate:flip={{ duration: 300 }}
						>
							<div class="card-body p-3 md:p-4 lg:p-6">
								<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<!-- Left Info -->
									<div class="flex min-w-0 flex-1 items-start gap-3">
										<div class="relative shrink-0">
											<div
												class="size-14 overflow-hidden rounded-lg shadow-sm md:size-16 lg:size-20"
											>
												<img
													src={order.items?.[0]?.image ||
														'https://placehold.co/400x400?text=No+Image'}
													alt={order.items?.[0]?.name}
													class="size-full object-cover"
													loading="lazy"
													onerror={handleImageError}
												/>
											</div>
											{#if order.items.length > 1}
												<span class="badge badge-neutral badge-xs absolute -right-1 -bottom-1"
													>+{order.items.length - 1}</span
												>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<div class="mb-1 flex flex-wrap items-center gap-1.5 md:gap-2">
												<h2 class="text-sm font-bold text-gray-800 md:text-base lg:text-lg">
													#{order.id.slice(0, 8)}...
												</h2>
												<span
													class="badge gap-1 font-medium {statusConfig.color} badge-xs md:badge-sm"
												>
													<StatusIcon size={10} class="md:size-3" />
													<span class="hidden md:inline">{statusConfig.label}</span>
													<span class="md:hidden">{statusConfig.label}</span>
												</span>
											</div>
											<p class="line-clamp-1 text-xs text-gray-600 md:text-sm">
												{order.items?.[0]?.name || 'Sản phẩm không xác định'}
												{order.items.length > 1 ? ` +${order.items.length - 1} khác` : ''}
											</p>
											<div
												class="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500 md:mt-1.5 md:text-xs"
											>
												<div class="flex items-center gap-1">
													<Calendar size={10} class="md:size-3" />
													<time datetime={order.created_at}
														>{formatDate(order.created_at, false)}</time
													>
												</div>
											</div>
										</div>
									</div>

									<!-- Right Actions -->
									<div
										class="border-base-200 flex items-center justify-between gap-2 border-t pt-2 md:flex-col md:items-end md:border-0 md:pt-0"
									>
										<div class="text-left md:text-right">
											<p class="hidden text-xs text-gray-500 md:block">Tổng tiền</p>
											<p class="text-primary text-sm font-bold md:text-base lg:text-lg">
												{formatCurrency(order.total_amount)}
											</p>
										</div>
										<div class="flex items-center gap-1">
											{#if order.status === 'pending'}
												<button
													class="btn btn-primary btn-xs md:btn-sm gap-1"
													onclick={() => handlePayNow(order.id)}
												>
													<CreditCard size={12} class="md:size-3.5" /> Thanh toán
												</button>
											{/if}
											<button
												class="btn btn-ghost btn-xs md:btn-sm"
												onclick={() => toggleDetails(order.id)}
											>
												{#if expandedOrder === order.id}<ChevronUp size={14} />{:else}<ChevronDown
														size={14}
													/>{/if}
											</button>
										</div>
									</div>
								</div>

								<!-- Expanded Details -->
								{#if expandedOrder === order.id}
									<div
										class="border-base-200 mt-3 space-y-3 border-t pt-3 md:mt-4 md:pt-4"
										transition:slide={{ duration: 300 }}
									>
										<!-- Timeline -->
										{#if order.status !== 'cancelled'}
											<div class="mb-4">
												<h3 class="mb-3 text-xs font-semibold text-gray-700">Trạng thái</h3>
												<div class="relative flex items-center justify-between px-1">
													<div class="bg-base-300 absolute inset-x-0 top-3 h-0.5"></div>
													<div
														class="bg-primary absolute top-3 left-0 h-0.5 transition-all duration-500"
														style="width: {getProgressWidth(order.status)}%"
													></div>
													{#each STATUS_STEPS as step, index}
														{@const completed = isStepCompleted(order.status, index)}
														<div class="relative z-10 flex flex-col items-center">
															<div
																class="flex size-6 items-center justify-center rounded-full border-2 {completed
																	? 'bg-primary border-primary text-white'
																	: 'bg-base-100 border-base-300 text-gray-400'}"
															>
																<CircleDot size={12} />
															</div>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Items List -->
										<ul class="space-y-2">
											{#each order.items as item (item.id)}
												<li
													class="hover:bg-base-200/50 flex items-center gap-2 rounded-lg p-1.5 transition-colors"
												>
													<div
														class="border-base-200 size-11 shrink-0 overflow-hidden rounded-lg border"
													>
														<img
															src={item.image || 'https://placehold.co/400x400?text=No+Image'}
															alt={item.name}
															class="size-full object-cover"
															onerror={handleImageError}
														/>
													</div>
													<div class="min-w-0 flex-1">
														<p class="line-clamp-1 text-xs font-medium text-gray-800">
															{item.name}
														</p>
														<p class="text-[10px] text-gray-500">
															{formatCurrency(item.price)} x {item.quantity}
														</p>
													</div>
													<p class="text-xs font-medium">
														{formatCurrency(item.price * item.quantity)}
													</p>
												</li>
											{/each}
										</ul>

										<!-- Info Grid -->
										<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
											<div class="bg-base-200/50 rounded-lg p-2">
												<div class="mb-1 flex items-center gap-1 text-xs font-medium">
													<MapPin size={12} /> Địa chỉ
												</div>
												<p class="text-[11px] text-gray-600">{order.shipping_address}</p>
											</div>
											<div class="bg-base-200/50 rounded-lg p-2">
												<div class="flex justify-between text-[11px] text-gray-600">
													<span>Tạm tính</span> <span>{formatCurrency(order.total_amount)}</span>
												</div>
												<div
													class="mt-1 flex justify-between border-t border-gray-200 pt-1 text-xs font-bold text-gray-800"
												>
													<span>Tổng</span>
													<span class="text-primary">{formatCurrency(order.total_amount)}</span>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</div>
						</article>
					{/each}
				{:else}
					<div class="flex min-h-[50vh] flex-col items-center justify-center text-center">
						<div class="bg-base-100 mb-4 rounded-full p-6 shadow-lg">
							<Package size={40} class="text-base-300" />
						</div>
						<h2 class="font-bold text-gray-800">Chưa có đơn hàng nào</h2>
						<a href="/" class="btn btn-primary btn-sm mt-4 gap-2"
							><ShoppingBag size={16} /> Mua sắm ngay</a
						>
					</div>
				{/if}
			</section>
		</div>
	</div>
</main>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
