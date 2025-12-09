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

	import LongBg from '$lib/assets/images/Long.webp';

	// Types
	type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
	type SortOption = 'date_desc' | 'date_asc';
	type ToastType = 'success' | 'error' | 'info';

	interface OrderItem {
		id: number;
		name: string;
		quantity: number;
		price: number;
		image: string;
		reviewed?: boolean;
	}

	interface Order {
		id: number;
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

	// Constants
	const STATUS_OPTIONS: StatusOption[] = [
		{ value: 'all', label: 'Tất cả' },
		{ value: 'pending', label: 'Chờ thanh toán' },
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

	// Sample Data
	let orders = $state<Order[]>([
		{
			id: 1024,
			status: 'delivered',
			total_amount: 2850000,
			subtotal: 2850000,
			shipping_fee: 0,
			discount: 0,
			created_at: '2024-11-15T10:30:00Z',
			updated_at: '2024-11-18T14:20:00Z',
			shipping_address: '222 Pho Nhon, Nam Tu Liem, Ha Noi',
			payment_method: 'VNPay',
			items: [
				{
					id: 1,
					name: 'Tượng rồng phong thủy',
					quantity: 1,
					price: 2850000,
					image: LongBg,
					reviewed: true,
				},
			],
		},
		{
			id: 1025,
			status: 'processing',
			total_amount: 5200000,
			subtotal: 5200000,
			shipping_fee: 50000,
			discount: 50000,
			created_at: '2024-12-01T14:15:00Z',
			shipping_address: '456 Le Loi, Quan 1, TP.HCM',
			payment_method: 'VNPay',
			estimated_delivery: '2024-12-08',
			items: [
				{
					id: 2,
					name: 'Tranh thêu tay phượng hoàng',
					quantity: 1,
					price: 5200000,
					image: LongBg,
					reviewed: false,
				},
			],
		},
		{
			id: 1026,
			status: 'shipped',
			total_amount: 1500000,
			subtotal: 1500000,
			shipping_fee: 0,
			discount: 0,
			created_at: '2024-12-02T09:00:00Z',
			shipping_address: '789 Tran Hung Dao, Quan 5, TP.HCM',
			payment_method: 'COD',
			tracking_number: 'GHTK123456789',
			estimated_delivery: '2024-12-06',
			items: [
				{
					id: 3,
					name: 'Bình gốm Bát Tràng',
					quantity: 1,
					price: 1500000,
					image: LongBg,
					reviewed: false,
				},
			],
		},
		{
			id: 1027,
			status: 'pending',
			total_amount: 8550000,
			subtotal: 8500000,
			shipping_fee: 50000,
			discount: 0,
			created_at: '2024-12-03T11:45:00Z',
			shipping_address: '345 Xuan Thuy, Cau Giay, Ha Noi',
			payment_method: 'Chưa thanh toán',
			items: [
				{
					id: 1,
					name: 'Tượng rồng phong thủy',
					quantity: 2,
					price: 2850000,
					image: LongBg,
					reviewed: false,
				},
				{
					id: 3,
					name: 'Bình gốm Bát Tràng',
					quantity: 1,
					price: 1500000,
					image: LongBg,
					reviewed: false,
				},
				{
					id: 4,
					name: 'Tranh sơn dầu',
					quantity: 1,
					price: 1300000,
					image: LongBg,
					reviewed: false,
				},
			],
		},
		{
			id: 1023,
			status: 'cancelled',
			total_amount: 1200000,
			subtotal: 1200000,
			shipping_fee: 0,
			discount: 0,
			created_at: '2024-11-10T16:20:00Z',
			updated_at: '2024-11-10T18:00:00Z',
			shipping_address: '123 Xuan Thuy, Cau Giay, Ha Noi',
			payment_method: 'Đã hoàn tiền',
			items: [
				{
					id: 4,
					name: 'Tranh sơn dầu phố cổ',
					quantity: 1,
					price: 1200000,
					image: LongBg,
					reviewed: false,
				},
			],
		},
	]);

	// State
	let searchTerm = $state('');
	let statusFilter = $state<OrderStatus | 'all'>('all');
	let sortBy = $state<SortOption>('date_desc');
	let expandedOrder = $state<number | null>(null);
	let showFilters = $state(false);
	let showSortDropdown = $state(false);
	let dateFrom = $state('');
	let dateTo = $state('');
	let isLoading = $state(false);
	let copiedTrackingId = $state<string | null>(null);

	// Toast state
	let toastMessage = $state('');
	let toastType = $state<ToastType>('success');
	let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

	// Cancel modal state
	let showCancelModal = $state(false);
	let orderToCancel = $state<number | null>(null);

	// Derived
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
				const matchesSearch =
					order.id.toString().includes(searchTerm) ||
					order.items.some((item) => item.name.toLowerCase().includes(searchLower)) ||
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

	// Currency formatter
	const currencyFormatter = new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
	});

	// Helpers
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

	// Toast notification
	function showToast(message: string, type: ToastType = 'success'): void {
		if (toastTimeoutId) clearTimeout(toastTimeoutId);

		toastMessage = message;
		toastType = type;

		toastTimeoutId = setTimeout(() => {
			toastMessage = '';
			toastTimeoutId = null;
		}, 3000);
	}

	// Actions
	function toggleDetails(id: number): void {
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
			setTimeout(() => {
				copiedTrackingId = null;
			}, 2000);
		} catch {
			showToast('Không thể sao chép', 'error');
		}
	}

	function handleReorder(order: Order): void {
		showToast(`Đã thêm ${order.items.length} sản phẩm vào giỏ hàng`, 'success');
	}

	function handleReorderItem(item: OrderItem): void {
		showToast(`Đã thêm "${item.name}" vào giỏ hàng`, 'success');
	}

	function handlePayNow(orderId: number): void {
		showToast('Đang chuyển đến trang thanh toán...', 'info');
		goto(`/checkout?orderId=${orderId}`);
	}

	function handleDownloadInvoice(orderId: number): void {
		showToast('Đang tải hóa đơn...', 'info');
	}

	function handleReview(orderId: number, itemId: number): void {
		showToast('Đang mở form đánh giá...', 'info');
	}

	function openCancelModal(orderId: number): void {
		orderToCancel = orderId;
		showCancelModal = true;
	}

	function closeCancelModal(): void {
		showCancelModal = false;
		orderToCancel = null;
	}

	function confirmCancelOrder(): void {
		if (!orderToCancel) return;

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

	function getUnreviewedItemId(order: Order): number {
		return order.items.find((i) => !i.reviewed)?.id ?? 0;
	}
</script>

<svelte:head>
	<title>Đơn hàng của tôi - Novus</title>
	<meta name="description" content="Quản lý và theo dõi trạng thái đơn hàng của bạn" />
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<!-- Toast Notification -->
{#if toastMessage}
	<div
		class="fixed top-4 right-4 z-50"
		transition:fly={{ y: -20, duration: 300 }}
		role="alert"
		aria-live="polite"
	>
		<div
			class="alert shadow-lg {toastType === 'success'
				? 'alert-success'
				: toastType === 'error'
					? 'alert-error'
					: 'alert-info'}"
		>
			{#if toastType === 'success'}
				<Check size={18} aria-hidden="true" />
			{:else if toastType === 'error'}
				<AlertCircle size={18} aria-hidden="true" />
			{:else}
				<Clock size={18} aria-hidden="true" />
			{/if}
			<span class="text-sm">{toastMessage}</span>
		</div>
	</div>
{/if}

<!-- Cancel Order Modal -->
{#if showCancelModal}
	<div
		class="modal modal-open"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="cancel-modal-title"
	>
		<div class="modal-box mx-4">
			<h3 id="cancel-modal-title" class="text-base font-bold md:text-lg">Xác nhận hủy đơn hàng</h3>
			<p class="py-4 text-sm text-gray-600 md:text-base">
				Bạn có chắc chắn muốn hủy đơn hàng #{orderToCancel}? Hành động này không thể hoàn tác.
			</p>
			<div class="modal-action">
				<button class="btn btn-ghost btn-sm md:btn-md" onclick={closeCancelModal}>
					Không, giữ lại
				</button>
				<button class="btn btn-error btn-sm md:btn-md" onclick={confirmCancelOrder}>
					Xác nhận hủy
				</button>
			</div>
		</div>
		<div class="modal-backdrop bg-black/50" onclick={closeCancelModal} aria-hidden="true"></div>
	</div>
{/if}

<!-- Mobile Filter Drawer -->
{#if showFilters}
	<div
		class="fixed inset-0 z-50 lg:hidden"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="filter-title"
	>
		<div class="absolute inset-0 bg-black/50" onclick={closeFilters} aria-hidden="true"></div>
		<div
			class="bg-base-100 absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl p-4 md:p-6"
			transition:fly={{ y: 300, duration: 300 }}
		>
			<div class="mb-4 flex items-center justify-between md:mb-6">
				<h3 id="filter-title" class="text-base font-bold md:text-lg">Bộ lọc</h3>
				<button class="btn btn-circle btn-ghost btn-sm" onclick={closeFilters} aria-label="Đóng">
					<X size={20} aria-hidden="true" />
				</button>
			</div>

			<!-- Date Range -->
			<fieldset class="mb-4 md:mb-6">
				<legend class="mb-2 block text-sm font-medium text-gray-700">Khoảng thời gian</legend>
				<div class="grid grid-cols-2 gap-2 md:gap-3">
					<div>
						<label for="date-from-mobile" class="text-xs text-gray-500">Từ ngày</label>
						<input
							id="date-from-mobile"
							type="date"
							class="input input-bordered input-sm md:input-md mt-1 w-full"
							bind:value={dateFrom}
						/>
					</div>
					<div>
						<label for="date-to-mobile" class="text-xs text-gray-500">Đến ngày</label>
						<input
							id="date-to-mobile"
							type="date"
							class="input input-bordered input-sm md:input-md mt-1 w-full"
							bind:value={dateTo}
						/>
					</div>
				</div>
			</fieldset>

			<!-- Status Filter -->
			<fieldset class="mb-4 md:mb-6">
				<legend class="mb-2 block text-sm font-medium text-gray-700">Trạng thái đơn hàng</legend>
				<div class="grid grid-cols-2 gap-2">
					{#each STATUS_OPTIONS as option (option.value)}
						<button
							class="btn btn-sm {statusFilter === option.value ? 'btn-primary' : 'btn-outline'}"
							onclick={() => (statusFilter = option.value)}
							aria-pressed={statusFilter === option.value}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</fieldset>

			<div class="flex gap-2 md:gap-3">
				<button class="btn btn-ghost btn-sm md:btn-md flex-1" onclick={clearAllFilters}>
					Xóa bộ lọc
				</button>
				<button class="btn btn-primary btn-sm md:btn-md flex-1" onclick={closeFilters}>
					Áp dụng
				</button>
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

			<!-- Search and Filters Bar -->
			<div class="mb-3 space-y-2 md:mb-4 md:space-y-3">
				<!-- Search Row -->
				<div class="flex gap-2">
					<div class="relative min-w-0 flex-1">
						<Search
							class="absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-gray-400"
							aria-hidden="true"
						/>
						<input
							type="search"
							placeholder="Tìm mã đơn, tên sản phẩm..."
							class="input input-bordered input-sm md:input-md w-full pr-8 pl-9 text-sm md:pr-10 md:pl-10"
							bind:value={searchTerm}
							aria-label="Tìm kiếm đơn hàng"
						/>
						{#if searchTerm}
							<button
								class="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-400 transition-colors hover:text-gray-600 md:right-3"
								onclick={() => (searchTerm = '')}
								aria-label="Xóa tìm kiếm"
							>
								<X size={14} aria-hidden="true" />
							</button>
						{/if}
					</div>

					<!-- Mobile Filter Button -->
					<button
						class="btn btn-outline btn-sm md:btn-md shrink-0 gap-1 px-2 md:gap-2 md:px-3 lg:hidden"
						onclick={() => (showFilters = true)}
						aria-label="Mở bộ lọc"
					>
						<Filter size={16} aria-hidden="true" />
						{#if activeFiltersCount > 0}
							<span class="badge badge-primary badge-xs md:badge-sm">{activeFiltersCount}</span>
						{/if}
					</button>

					<!-- Sort Dropdown -->
					<div class="sort-dropdown relative shrink-0">
						<button
							class="btn btn-outline btn-sm md:btn-md gap-1 px-2 md:gap-2 md:px-3"
							onclick={() => (showSortDropdown = !showSortDropdown)}
							aria-expanded={showSortDropdown}
							aria-haspopup="listbox"
							aria-label="Sắp xếp đơn hàng"
						>
							<SortDesc size={16} aria-hidden="true" />
							<span class="hidden md:inline">{getSortLabel(sortBy)}</span>
							<ChevronDown
								size={14}
								class="hidden transition-transform duration-200 md:block {showSortDropdown
									? 'rotate-180'
									: ''}"
								aria-hidden="true"
							/>
						</button>
						{#if showSortDropdown}
							<ul
								class="border-base-300 bg-base-100 absolute top-full right-0 z-20 mt-1 min-w-32 rounded-lg border py-1 shadow-xl md:mt-2 md:min-w-40 md:py-2"
								transition:fly={{ y: -10, duration: 200 }}
								role="listbox"
								aria-label="Tùy chọn sắp xếp"
							>
								{#each [{ value: 'date_desc', label: 'Mới nhất' }, { value: 'date_asc', label: 'Cũ nhất' }] as option (option.value)}
									<li>
										<button
											class="hover:bg-base-200 flex w-full items-center justify-between px-3 py-1.5 text-left text-sm md:px-4 md:py-2"
											class:text-primary={sortBy === option.value}
											onclick={() => {
												sortBy = option.value as SortOption;
												showSortDropdown = false;
											}}
											role="option"
											aria-selected={sortBy === option.value}
										>
											{option.label}
											{#if sortBy === option.value}
												<Check size={14} aria-hidden="true" />
											{/if}
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
						<label for="date-from-desktop" class="text-sm text-gray-600">Từ:</label>
						<input
							id="date-from-desktop"
							type="date"
							class="input input-bordered input-sm"
							bind:value={dateFrom}
						/>
					</div>
					<div class="flex items-center gap-2">
						<label for="date-to-desktop" class="text-sm text-gray-600">Đến:</label>
						<input
							id="date-to-desktop"
							type="date"
							class="input input-bordered input-sm"
							bind:value={dateTo}
						/>
					</div>
					{#if activeFiltersCount > 0}
						<button class="btn btn-ghost btn-sm gap-1 text-gray-500" onclick={clearAllFilters}>
							<X size={14} aria-hidden="true" />
							Xóa bộ lọc ({activeFiltersCount})
						</button>
					{/if}
				</div>
			</div>

			<!-- Status Filter Pills -->
			<nav
				class="scrollbar-hide -mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-2 md:-mx-0 md:mb-4 md:gap-2 md:px-0"
				aria-label="Lọc theo trạng thái"
			>
				{#each STATUS_OPTIONS as option (option.value)}
					<button
						class="btn btn-xs md:btn-sm shrink-0 {statusFilter === option.value
							? 'btn-primary'
							: 'btn-ghost bg-base-100'}"
						onclick={() => (statusFilter = option.value)}
						aria-pressed={statusFilter === option.value}
					>
						{option.label}
					</button>
				{/each}
			</nav>

			<!-- Orders List -->
			<section class="space-y-3 md:space-y-4" aria-label="Danh sách đơn hàng">
				{#if isLoading}
					<!-- Skeleton Loading -->
					{#each { length: 3 } as _, i (i)}
						<article class="card bg-base-100 animate-pulse shadow-md" aria-hidden="true">
							<div class="card-body p-3 md:p-4 lg:p-6">
								<div class="flex gap-3">
									<div class="bg-base-300 size-14 rounded-lg md:size-16 lg:size-20"></div>
									<div class="flex-1 space-y-2">
										<div class="bg-base-300 h-4 w-20 rounded"></div>
										<div class="bg-base-300 h-3 w-32 rounded md:w-48"></div>
										<div class="bg-base-300 h-3 w-24 rounded"></div>
									</div>
								</div>
							</div>
						</article>
					{/each}
				{:else if filteredOrders.length > 0}
					{#each filteredOrders as order (order.id)}
						{@const statusConfig = STATUS_CONFIG[order.status]}
						{@const StatusIcon = statusConfig.icon}
						<article
							class="card bg-base-100 border-l-4 shadow-md transition-shadow hover:shadow-lg {BORDER_COLOR_MAP[
								order.status
							]}"
							transition:slide|local={{ duration: 300 }}
							animate:flip={{ duration: 300 }}
						>
							<div class="card-body p-3 md:p-4 lg:p-6">
								<!-- Order Header -->
								<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<!-- Left: Product preview + Order info -->
									<div class="flex min-w-0 flex-1 items-start gap-3">
										<!-- Product Images Preview -->
										<div class="relative shrink-0">
											<div
												class="size-14 overflow-hidden rounded-lg shadow-sm md:size-16 lg:size-20"
											>
												<img
													src={order.items[0].image}
													alt=""
													class="size-full object-cover"
													loading="lazy"
												/>
											</div>
											{#if order.items.length > 1}
												<span class="badge badge-neutral badge-xs absolute -right-1 -bottom-1">
													+{order.items.length - 1}
												</span>
											{/if}
										</div>

										<!-- Order Info -->
										<div class="min-w-0 flex-1">
											<div class="mb-1 flex flex-wrap items-center gap-1.5 md:gap-2">
												<h2 class="text-sm font-bold text-gray-800 md:text-base lg:text-lg">
													#{order.id}
												</h2>
												<span
													class="badge gap-1 font-medium {statusConfig.color} badge-xs md:badge-sm"
												>
													<StatusIcon size={10} class="md:size-3" aria-hidden="true" />
													<span class="hidden md:inline">{statusConfig.label}</span>
													<span class="md:hidden">
														{#if order.status === 'pending'}Chờ thanh toán
														{:else if order.status === 'processing'}Xử lý
														{:else if order.status === 'shipped'}Đang giao hàng
														{:else if order.status === 'delivered'}Đã giao hàng
														{:else if order.status === 'cancelled'}Đã hủy
														{:else}Thanh toán{/if}
													</span>
												</span>
											</div>

											<!-- Product name preview -->
											<p class="line-clamp-1 text-xs text-gray-600 md:text-sm">
												{order.items[0].name}{order.items.length > 1
													? ` +${order.items.length - 1}`
													: ''}
											</p>

											<div
												class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500 md:mt-1.5 md:gap-x-3 md:text-xs"
											>
												<div class="flex items-center gap-1">
													<Calendar size={10} class="md:size-3" aria-hidden="true" />
													<time datetime={order.created_at}>
														{formatDate(order.created_at, false)}
													</time>
												</div>
												{#if order.tracking_number && order.status === 'shipped'}
													<button
														class="hover:text-primary flex items-center gap-1 transition-colors"
														onclick={() => copyTrackingNumber(order.tracking_number!)}
														aria-label="Sao chép mã vận đơn {order.tracking_number}"
													>
														{#if copiedTrackingId === order.tracking_number}
															<Check size={10} class="text-success md:size-3" aria-hidden="true" />
														{:else}
															<Copy size={10} class="md:size-3" aria-hidden="true" />
														{/if}
														<span class="max-w-20 truncate md:max-w-none"
															>{order.tracking_number}</span
														>
													</button>
												{/if}
											</div>
										</div>
									</div>

									<!-- Right: Price + Actions -->
									<div
										class="border-base-200 flex items-center justify-between gap-2 border-t pt-2 md:flex-col md:items-end md:border-0 md:pt-0"
									>
										<div class="text-left md:text-right">
											<p class="hidden text-xs text-gray-500 md:block">Tổng tiền</p>
											<p class="text-primary text-sm font-bold md:text-base lg:text-lg">
												{formatCurrency(order.total_amount)}
											</p>
										</div>

										<!-- Quick Actions -->
										<div class="flex items-center gap-1">
											{#if order.status === 'pending'}
												<button
													class="btn btn-primary btn-xs md:btn-sm gap-1"
													onclick={() => handlePayNow(order.id)}
												>
													<CreditCard size={12} class="md:size-3.5" aria-hidden="true" />
													<span class="inline">Thanh toán</span>
												</button>
											{:else if order.status === 'delivered'}
												<button
													class="btn btn-primary btn-xs md:btn-sm gap-1"
													onclick={() => handleReorder(order)}
												>
													<RotateCcw size={12} class="md:size-3.5" aria-hidden="true" />
													<span class="hidden md:inline">Mua lại</span>
												</button>
											{/if}
											<button
												class="btn btn-ghost btn-xs md:btn-sm gap-0.5 text-gray-600 md:gap-1"
												onclick={() => toggleDetails(order.id)}
												aria-expanded={expandedOrder === order.id}
												aria-controls="order-details-{order.id}"
											>
												{#if expandedOrder === order.id}
													<ChevronUp size={14} aria-hidden="true" />
												{:else}
													<ChevronDown size={14} aria-hidden="true" />
												{/if}
											</button>
										</div>
									</div>
								</div>

								<!-- Estimated Delivery for active orders -->
								{#if order.estimated_delivery && (order.status === 'shipped' || order.status === 'processing')}
									<div
										class="bg-primary/5 mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs md:mt-3 md:px-3 md:py-2 md:text-sm"
									>
										<Truck size={14} class="text-primary shrink-0 md:size-4" aria-hidden="true" />
										<span class="text-gray-600">Dự kiến:</span>
										<time class="font-medium text-gray-800" datetime={order.estimated_delivery}>
											{formatShortDate(order.estimated_delivery)}
										</time>
									</div>
								{/if}

								<!-- Expanded Details -->
								{#if expandedOrder === order.id}
									<div
										id="order-details-{order.id}"
										class="border-base-200 mt-3 space-y-3 border-t pt-3 md:mt-4 md:space-y-4 md:pt-4"
										transition:slide={{ duration: 300 }}
									>
										<!-- Status Timeline -->
										{#if order.status !== 'cancelled'}
											<div class="mb-4 md:mb-6">
												<h3 class="mb-3 text-xs font-semibold text-gray-700 md:mb-4 md:text-sm">
													Trạng thái đơn hàng
												</h3>
												<div class="relative flex items-center justify-between px-1 md:px-2">
													<!-- Progress line background -->
													<div
														class="bg-base-300 absolute inset-x-0 top-3 h-0.5 md:top-4"
														aria-hidden="true"
													></div>
													<!-- Progress line active -->
													<div
														class="bg-primary absolute top-3 left-0 h-0.5 transition-all duration-500 md:top-4"
														style="width: {getProgressWidth(order.status)}%"
														aria-hidden="true"
													></div>

													{#each STATUS_STEPS as step, index (step)}
														{@const completed = isStepCompleted(order.status, index)}
														<div class="relative z-10 flex flex-col items-center">
															<div
																class="flex size-6 items-center justify-center rounded-full transition-all duration-300 md:size-8
																{completed ? 'bg-primary text-white' : 'border-base-300 bg-base-100 border-2 text-gray-400'}"
																aria-hidden="true"
															>
																{#if completed}
																	<CheckCircle size={12} class="md:size-4" />
																{:else}
																	<CircleDot size={12} class="md:size-4" />
																{/if}
															</div>
															<span
																class="mt-1 max-w-10 text-center text-[8px] leading-tight md:mt-2 md:max-w-none md:text-xs
																{completed ? 'font-medium text-gray-700' : 'text-gray-400'}"
															>
																{#if step === 'pending'}Đặt hàng
																{:else if step === 'paid'}Thanh toán
																{:else if step === 'processing'}Đang xử lý
																{:else if step === 'shipped'}Đã giao hàng
																{:else}Hoàn thành{/if}
															</span>
														</div>
													{/each}
												</div>
											</div>
										{:else}
											<div
												class="bg-error/10 text-error flex items-center gap-2 rounded-lg p-2 text-xs md:p-3 md:text-sm"
											>
												<XCircle size={14} class="shrink-0 md:size-4" aria-hidden="true" />
												<span>
													Đơn hàng đã bị hủy vào {formatDate(order.updated_at || order.created_at)}
												</span>
											</div>
										{/if}

										<!-- Products List -->
										<div>
											<h3 class="mb-2 text-xs font-semibold text-gray-700 md:mb-3 md:text-sm">
												Sản phẩm ({order.items.length})
											</h3>
											<ul class="space-y-2">
												{#each order.items as item (item.id)}
													<li
														class="hover:bg-base-200/50 flex items-center gap-2 rounded-lg p-1.5 transition-colors md:gap-3 md:p-2"
													>
														<div
															class="border-base-200 size-11 shrink-0 overflow-hidden rounded-lg border md:size-14 lg:size-16"
														>
															<img
																src={item.image}
																alt={item.name}
																class="size-full object-cover"
																loading="lazy"
															/>
														</div>
														<div class="min-w-0 flex-1">
															<p
																class="line-clamp-1 text-xs font-medium text-gray-800 md:text-sm lg:text-base"
															>
																{item.name}
															</p>
															<p class="text-[10px] text-gray-500 md:text-xs lg:text-sm">
																{formatCurrency(item.price)} × {item.quantity}
															</p>
														</div>
														<div class="shrink-0 text-right">
															<p class="text-xs font-medium text-gray-800 md:text-sm lg:text-base">
																{formatCurrency(item.price * item.quantity)}
															</p>
															{#if order.status === 'delivered'}
																<div class="mt-1 flex flex-wrap justify-end gap-1">
																	{#if !item.reviewed}
																		<button
																			class="btn btn-ghost btn-xs text-warning gap-0.5 px-1"
																			onclick={() => handleReview(order.id, item.id)}
																		>
																			<Star size={10} class="md:size-3" aria-hidden="true" />
																			<span class="text-[10px] md:text-xs">Đánh giá</span>
																		</button>
																	{:else}
																		<span
																			class="text-success flex items-center gap-0.5 text-[10px] md:text-xs"
																		>
																			<Check size={10} class="md:size-3" aria-hidden="true" />
																			Đã đánh giá
																		</span>
																	{/if}
																	<button
																		class="btn btn-ghost btn-xs gap-0.5 px-1"
																		onclick={() => handleReorderItem(item)}
																	>
																		<RotateCcw size={10} class="md:size-3" aria-hidden="true" />
																		<span class="text-[10px] md:text-xs">Mua lại</span>
																	</button>
																</div>
															{/if}
														</div>
													</li>
												{/each}
											</ul>
										</div>

										<!-- Order Summary -->
										<div
											class="border-base-200 grid grid-cols-1 gap-2 border-t pt-3 md:gap-3 md:pt-4 lg:grid-cols-2 lg:gap-4"
										>
											<!-- Shipping Address -->
											<div class="bg-base-200/50 rounded-lg p-2 md:p-3">
												<div
													class="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-700 md:mb-2 md:gap-2 md:text-sm"
												>
													<MapPin size={12} class="md:size-3.5" aria-hidden="true" />
													Địa chỉ giao hàng
												</div>
												<address class="text-[11px] text-gray-600 not-italic md:text-sm">
													{order.shipping_address}
												</address>
											</div>

											<!-- Payment & Totals -->
											<div class="bg-base-200/50 rounded-lg p-2 md:p-3">
												<dl class="space-y-0.5 text-[11px] md:space-y-1 md:text-sm">
													<div class="flex justify-between text-gray-600">
														<dt>Tạm tính</dt>
														<dd>{formatCurrency(order.subtotal ?? order.total_amount)}</dd>
													</div>
													{#if order.shipping_fee !== undefined}
														<div class="flex justify-between text-gray-600">
															<dt>Phí vận chuyển</dt>
															<dd>
																{order.shipping_fee === 0
																	? 'Miễn phí'
																	: formatCurrency(order.shipping_fee)}
															</dd>
														</div>
													{/if}
													{#if order.discount && order.discount > 0}
														<div class="text-success flex justify-between">
															<dt>Giảm giá</dt>
															<dd>-{formatCurrency(order.discount)}</dd>
														</div>
													{/if}
													<div
														class="border-base-300 flex justify-between border-t pt-1 font-bold text-gray-800"
													>
														<dt>Tổng cộng</dt>
														<dd class="text-primary">{formatCurrency(order.total_amount)}</dd>
													</div>
													<div
														class="flex justify-between pt-0.5 text-[10px] text-gray-500 md:text-xs"
													>
														<dt>Thanh toán</dt>
														<dd>{order.payment_method}</dd>
													</div>
												</dl>
											</div>
										</div>

										<!-- Action Buttons -->
										<div
											class="border-base-200 flex flex-wrap justify-end gap-1.5 border-t pt-3 md:gap-2 md:pt-4"
										>
											{#if order.status === 'pending'}
												<button
													class="btn btn-error btn-outline btn-xs md:btn-sm"
													onclick={() => openCancelModal(order.id)}
												>
													<XCircle size={12} class="md:size-3.5" aria-hidden="true" />
													Hủy
												</button>
												<button
													class="btn btn-primary btn-xs md:btn-sm"
													onclick={() => handlePayNow(order.id)}
												>
													<CreditCard size={12} class="md:size-3.5" aria-hidden="true" />
													Thanh toán
												</button>
											{:else if order.status === 'delivered'}
												<button
													class="btn btn-outline btn-xs md:btn-sm"
													onclick={() => handleDownloadInvoice(order.id)}
												>
													<FileText size={12} class="md:size-3.5" aria-hidden="true" />
													<span class="hidden md:inline">Hóa đơn</span>
												</button>
												{#if order.items.some((item) => !item.reviewed)}
													<button
														class="btn btn-outline btn-xs border-warning text-warning hover:bg-warning md:btn-sm hover:text-white"
														onclick={() => handleReview(order.id, getUnreviewedItemId(order))}
													>
														<Star size={12} class="md:size-3.5" aria-hidden="true" />
														Đánh giá
													</button>
												{/if}
												<button
													class="btn btn-primary btn-xs md:btn-sm"
													onclick={() => handleReorder(order)}
												>
													<RotateCcw size={12} class="md:size-3.5" aria-hidden="true" />
													Mua lại
												</button>
											{:else if order.status !== 'cancelled'}
												<button
													class="btn btn-outline btn-xs md:btn-sm"
													onclick={() => handleDownloadInvoice(order.id)}
												>
													<FileText size={12} class="md:size-3.5" aria-hidden="true" />
													<span class="hidden md:inline">Tải hóa đơn</span>
												</button>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</article>
					{/each}
				{:else}
					<!-- Empty State -->
					<div
						class="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center"
						transition:fade
					>
						<div class="bg-base-100 mb-4 rounded-full p-4 shadow-lg md:mb-6 md:p-6 lg:p-8">
							<Package size={32} class="text-base-300 md:size-10 lg:size-12" aria-hidden="true" />
						</div>
						<h2 class="text-base font-bold text-gray-800 md:text-lg lg:text-xl">
							{#if hasActiveFilters}
								Không tìm thấy đơn hàng
							{:else}
								Chưa có đơn hàng nào
							{/if}
						</h2>
						<p class="mt-2 max-w-xs text-xs text-gray-500 md:max-w-sm md:text-sm lg:text-base">
							{#if hasActiveFilters}
								Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác
							{:else}
								Bắt đầu mua sắm để xem đơn hàng của bạn tại đây
							{/if}
						</p>
						<div class="mt-4 flex flex-col gap-2 md:mt-6 md:flex-row md:gap-3">
							{#if hasActiveFilters}
								<button class="btn btn-primary btn-sm md:btn-md gap-2" onclick={clearAllFilters}>
									<X size={16} aria-hidden="true" />
									Xóa bộ lọc
								</button>
							{:else}
								<a href="/" class="btn btn-primary btn-sm md:btn-md gap-2">
									<ShoppingBag size={16} aria-hidden="true" />
									Mua sắm ngay
								</a>
							{/if}
						</div>
					</div>
				{/if}
			</section>

			<!-- Results count -->
			{#if filteredOrders.length > 0}
				<footer class="mt-4 text-center text-[11px] text-gray-500 md:mt-6 md:text-sm">
					Hiển thị {filteredOrders.length} đơn hàng
					{#if activeFiltersCount > 0}
						<span>với {activeFiltersCount} bộ lọc</span>
					{/if}
				</footer>
			{/if}
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
