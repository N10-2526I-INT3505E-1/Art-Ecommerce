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

	import LongBg from '$lib/assets/images/Long.webp';

	// Types
	type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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

	// Sample Data with enhanced fields
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
	let sortBy = $state<'date_desc' | 'date_asc'>('date_desc');
	let expandedOrder = $state<number | null>(null);
	let showFilters = $state(false);
	let showSortDropdown = $state(false);
	let dateFrom = $state('');
	let dateTo = $state('');
	let isLoading = $state(false);
	let copiedTrackingId = $state<string | null>(null);

	// Toast state
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error' | 'info'>('success');

	// Cancel modal state
	let showCancelModal = $state(false);
	let orderToCancel = $state<number | null>(null);

	// Status timeline steps
	const statusSteps: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

	// Derived
	let activeFiltersCount = $derived(
		(statusFilter !== 'all' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (searchTerm ? 1 : 0),
	);

	let filteredOrders = $derived(
		orders
			.filter((order) => {
				const matchesSearch =
					order.id.toString().includes(searchTerm) ||
					order.items.some((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
					(order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
				const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

				// Date filtering
				const orderDate = new Date(order.created_at);
				const matchesDateFrom = !dateFrom || orderDate >= new Date(dateFrom);
				const matchesDateTo = !dateTo || orderDate <= new Date(dateTo + 'T23:59:59');

				return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
			})
			.sort((a, b) => {
				switch (sortBy) {
					case 'date_desc':
						return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
					case 'date_asc':
						return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
					default:
						return 0;
				}
			}),
	);

	// Toast notification
	function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
		toastMessage = message;
		toastType = type;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	// Helpers
	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	}

	function formatDate(dateString: string, includeTime = true) {
		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		};
		if (includeTime) {
			options.hour = '2-digit';
			options.minute = '2-digit';
		}
		return new Date(dateString).toLocaleDateString('vi-VN', options);
	}

	function formatShortDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('vi-VN', {
			day: 'numeric',
			month: 'numeric',
		});
	}

	function getStatusColor(status: OrderStatus) {
		switch (status) {
			case 'pending':
				return 'badge-warning';
			case 'paid':
				return 'badge-info';
			case 'processing':
				return 'badge-info';
			case 'shipped':
				return 'badge-primary';
			case 'delivered':
				return 'badge-success';
			case 'cancelled':
				return 'badge-error';
			default:
				return 'badge-ghost';
		}
	}

	function getStatusLabel(status: OrderStatus) {
		switch (status) {
			case 'pending':
				return 'Chờ thanh toán';
			case 'paid':
				return 'Đã thanh toán';
			case 'processing':
				return 'Đang xử lý';
			case 'shipped':
				return 'Đang giao hàng';
			case 'delivered':
				return 'Đã giao hàng';
			case 'cancelled':
				return 'Đã hủy';
			default:
				return status;
		}
	}

	function getStatusIndex(status: OrderStatus): number {
		if (status === 'cancelled') return -1;
		return statusSteps.indexOf(status);
	}

	function isStepCompleted(status: OrderStatus, stepIndex: number): boolean {
		const currentIndex = getStatusIndex(status);
		return currentIndex >= stepIndex;
	}

	function toggleDetails(id: number) {
		expandedOrder = expandedOrder === id ? null : id;
	}

	function clearAllFilters() {
		searchTerm = '';
		statusFilter = 'all';
		dateFrom = '';
		dateTo = '';
		showToast('Đã xóa tất cả bộ lọc', 'info');
	}

	function copyTrackingNumber(trackingNumber: string) {
		navigator.clipboard.writeText(trackingNumber);
		copiedTrackingId = trackingNumber;
		showToast('Đã sao chép mã vận đơn');
		setTimeout(() => {
			copiedTrackingId = null;
		}, 2000);
	}

	function handleReorder(order: Order) {
		showToast(`Đã thêm ${order.items.length} sản phẩm vào giỏ hàng`, 'success');
	}

	function handleReorderItem(item: OrderItem) {
		showToast(`Đã thêm "${item.name}" vào giỏ hàng`, 'success');
	}

	function handlePayNow(orderId: number) {
		showToast('Đang chuyển đến trang thanh toán...', 'info');
	}

	function handleDownloadInvoice(orderId: number) {
		showToast('Đang tải hóa đơn...', 'info');
	}

	function handleReview(orderId: number, itemId: number) {
		showToast('Đang mở form đánh giá...', 'info');
	}

	function openCancelModal(orderId: number) {
		orderToCancel = orderId;
		showCancelModal = true;
	}

	function confirmCancelOrder() {
		if (orderToCancel) {
			orders = orders.map((order) =>
				order.id === orderToCancel
					? { ...order, status: 'cancelled' as OrderStatus, updated_at: new Date().toISOString() }
					: order,
			);
			showToast('Đã hủy đơn hàng thành công', 'success');
			showCancelModal = false;
			orderToCancel = null;
		}
	}

	function getSortLabel(sort: typeof sortBy) {
		switch (sort) {
			case 'date_desc':
				return 'Mới nhất';
			case 'date_asc':
				return 'Cũ nhất';
			default:
				return 'Sắp xếp';
		}
	}

	// Close dropdowns when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.sort-dropdown')) {
			showSortDropdown = false;
		}
	}
</script>

<svelte:head>
	<title>Đơn hàng của tôi - Novus</title>
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<!-- Toast Notification -->
{#if toastMessage}
	<div class="fixed top-4 right-4 z-50" transition:fly={{ y: -20, duration: 300 }}>
		<div
			class="alert {toastType === 'success'
				? 'alert-success'
				: toastType === 'error'
					? 'alert-error'
					: 'alert-info'} shadow-lg"
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

<!-- Cancel Order Modal -->
{#if showCancelModal}
	<div class="modal modal-open" transition:fade={{ duration: 200 }}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Xác nhận hủy đơn hàng</h3>
			<p class="py-4 text-gray-600">
				Bạn có chắc chắn muốn hủy đơn hàng #{orderToCancel}? Hành động này không thể hoàn tác.
			</p>
			<div class="modal-action">
				<button
					class="btn btn-ghost"
					onclick={() => {
						showCancelModal = false;
						orderToCancel = null;
					}}
				>
					Không, giữ lại
				</button>
				<button class="btn btn-error" onclick={confirmCancelOrder}> Xác nhận hủy </button>
			</div>
		</div>
		<div
			class="modal-backdrop bg-black/50"
			onclick={() => {
				showCancelModal = false;
				orderToCancel = null;
			}}
		></div>
	</div>
{/if}

<!-- Mobile Filter Drawer -->
{#if showFilters}
	<div class="fixed inset-0 z-50 lg:hidden" transition:fade={{ duration: 200 }}>
		<div class="absolute inset-0 bg-black/50" onclick={() => (showFilters = false)}></div>
		<div
			class="bg-base-100 absolute right-0 bottom-0 left-0 max-h-[80vh] overflow-y-auto rounded-t-3xl p-6"
			transition:fly={{ y: 300, duration: 300 }}
		>
			<div class="mb-6 flex items-center justify-between">
				<h3 class="text-lg font-bold">Bộ lọc</h3>
				<button class="btn btn-ghost btn-circle btn-sm" onclick={() => (showFilters = false)}>
					<X size={20} />
				</button>
			</div>

			<!-- Date Range -->
			<div class="mb-6">
				<label class="mb-2 block text-sm font-medium text-gray-700">Khoảng thời gian</label>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="text-xs text-gray-500">Từ ngày</label>
						<input type="date" class="input input-bordered mt-1 w-full" bind:value={dateFrom} />
					</div>
					<div>
						<label class="text-xs text-gray-500">Đến ngày</label>
						<input type="date" class="input input-bordered mt-1 w-full" bind:value={dateTo} />
					</div>
				</div>
			</div>

			<!-- Status Filter -->
			<div class="mb-6">
				<label class="mb-2 block text-sm font-medium text-gray-700">Trạng thái đơn hàng</label>
				<div class="grid grid-cols-2 gap-2">
					{#each [{ value: 'all', label: 'Tất cả' }, { value: 'pending', label: 'Chờ thanh toán' }, { value: 'processing', label: 'Đang xử lý' }, { value: 'shipped', label: 'Đang giao' }, { value: 'delivered', label: 'Hoàn thành' }, { value: 'cancelled', label: 'Đã hủy' }] as option}
						<button
							class="btn btn-sm {statusFilter === option.value ? 'btn-primary' : 'btn-outline'}"
							onclick={() => (statusFilter = option.value as OrderStatus | 'all')}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex gap-3">
				<button class="btn btn-ghost flex-1" onclick={clearAllFilters}> Xóa bộ lọc </button>
				<button class="btn btn-primary flex-1" onclick={() => (showFilters = false)}>
					Áp dụng
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="bg-base-200 flex min-h-screen">
	<div class="flex-1 pt-16 pb-12 md:pt-20">
		<div class="container mx-auto max-w-5xl px-4">
			<!-- Header -->
			<div class="mb-6 md:mb-8">
				<h1 class="font-montserrat text-2xl font-bold text-gray-800 md:text-3xl">
					Đơn hàng của tôi
				</h1>
				<p class="mt-1 text-sm text-gray-500 md:text-base">
					Quản lý và theo dõi trạng thái đơn hàng
				</p>
			</div>

			<!-- Search and Filters Bar -->
			<div class="mb-4 space-y-3">
				<!-- Search Row -->
				<div class="flex gap-2">
					<div class="relative flex-1">
						<Search class="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-black" />
						<input
							type="text"
							placeholder="Tìm mã đơn, tên sản phẩm, mã vận đơn..."
							class="input input-bordered w-full pl-10 text-sm"
							bind:value={searchTerm}
						/>
						{#if searchTerm}
							<button
								class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								onclick={() => (searchTerm = '')}
							>
								<X size={16} />
							</button>
						{/if}
					</div>

					<!-- Mobile Filter Button -->
					<button class="btn btn-outline gap-2 lg:hidden" onclick={() => (showFilters = true)}>
						<Filter size={16} />
						{#if activeFiltersCount > 0}
							<span class="badge badge-primary badge-sm">{activeFiltersCount}</span>
						{/if}
					</button>

					<!-- Sort Dropdown -->
					<div class="sort-dropdown relative">
						<button
							class="btn btn-outline gap-2"
							onclick={() => (showSortDropdown = !showSortDropdown)}
						>
							<SortDesc size={16} />
							<span class="hidden sm:inline">{getSortLabel(sortBy)}</span>
							<ChevronDown
								size={14}
								class="transition-transform {showSortDropdown ? 'rotate-180' : ''}"
							/>
						</button>
						{#if showSortDropdown}
							<div
								class="bg-base-100 border-base-300 absolute top-full right-0 z-20 mt-2 min-w-[160px] rounded-lg border py-2 shadow-xl"
								transition:fly={{ y: -10, duration: 200 }}
							>
								<button
									class="hover:bg-base-200 flex w-full items-center justify-between px-4 py-2 text-left text-sm"
									class:text-primary={sortBy === 'date_desc'}
									onclick={() => {
										sortBy = 'date_desc';
										showSortDropdown = false;
									}}
								>
									Mới nhất
									{#if sortBy === 'date_desc'}<Check size={14} />{/if}
								</button>
								<button
									class="hover:bg-base-200 flex w-full items-center justify-between px-4 py-2 text-left text-sm"
									class:text-primary={sortBy === 'date_asc'}
									onclick={() => {
										sortBy = 'date_asc';
										showSortDropdown = false;
									}}
								>
									Cũ nhất
									{#if sortBy === 'date_asc'}<Check size={14} />{/if}
								</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Desktop Date Filters -->
				<div class="hidden items-center gap-3 lg:flex">
					<div class="flex items-center gap-2">
						<label class="text-sm text-gray-600">Từ:</label>
						<input type="date" class="input input-bordered input-sm" bind:value={dateFrom} />
					</div>
					<div class="flex items-center gap-2">
						<label class="text-sm text-gray-600">Đến:</label>
						<input type="date" class="input input-bordered input-sm" bind:value={dateTo} />
					</div>
					{#if activeFiltersCount > 0}
						<button class="btn btn-ghost btn-sm gap-1 text-gray-500" onclick={clearAllFilters}>
							<X size={14} />
							Xóa bộ lọc ({activeFiltersCount})
						</button>
					{/if}
				</div>
			</div>

			<!-- Status Filter Pills -->
			<div class="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-2">
				{#each [{ value: 'all', label: 'Tất cả' }, { value: 'pending', label: 'Chờ thanh toán' }, { value: 'processing', label: 'Đang xử lý' }, { value: 'shipped', label: 'Đang giao' }, { value: 'delivered', label: 'Hoàn thành' }, { value: 'cancelled', label: 'Đã hủy' }] as option}
					<button
						class="btn btn-sm whitespace-nowrap {statusFilter === option.value
							? 'btn-primary'
							: 'btn-ghost bg-base-100'}"
						onclick={() => (statusFilter = option.value as OrderStatus | 'all')}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<!-- Orders List -->
			<div class="space-y-4">
				{#if isLoading}
					<!-- Skeleton Loading -->
					{#each [1, 2, 3] as _}
						<div class="card bg-base-100 animate-pulse shadow-md">
							<div class="card-body p-4 md:p-6">
								<div class="flex gap-4">
									<div class="bg-base-300 h-16 w-16 rounded-lg md:h-20 md:w-20"></div>
									<div class="flex-1 space-y-2">
										<div class="bg-base-300 h-4 w-24 rounded"></div>
										<div class="bg-base-300 h-3 w-48 rounded"></div>
										<div class="bg-base-300 h-3 w-32 rounded"></div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				{:else if filteredOrders.length > 0}
					{#each filteredOrders as order (order.id)}
						<div
							class="card bg-base-100 border-l-4 shadow-md transition-all hover:shadow-lg {order.status ===
							'pending'
								? 'border-l-warning'
								: order.status === 'shipped'
									? 'border-l-primary'
									: order.status === 'delivered'
										? 'border-l-success'
										: order.status === 'cancelled'
											? 'border-l-error'
											: 'border-l-info'}"
							transition:slide|local={{ duration: 300 }}
							animate:flip={{ duration: 300 }}
						>
							<div class="card-body p-4 md:p-6">
								<!-- Order Header -->
								<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
									<!-- Left: Product preview + Order info -->
									<div class="flex items-start gap-3 md:gap-4">
										<!-- Product Images Preview -->
										<div class="relative shrink-0">
											<div class="h-16 w-16 overflow-hidden rounded-lg shadow-sm md:h-20 md:w-20">
												<img
													src={order.items[0].image}
													alt={order.items[0].name}
													class="h-full w-full object-cover"
												/>
											</div>
											{#if order.items.length > 1}
												<span class="badge badge-neutral badge-sm absolute -right-1 -bottom-1">
													+{order.items.length - 1}
												</span>
											{/if}
										</div>

										<!-- Order Info -->
										<div class="min-w-0 flex-1">
											<div class="mb-1 flex flex-wrap items-center gap-2">
												<h3 class="text-base font-bold text-gray-800 md:text-lg">#{order.id}</h3>
												<span
													class="badge {getStatusColor(order.status)} badge-sm gap-1 font-medium"
												>
													{#if order.status === 'delivered'}
														<CheckCircle size={12} />
													{:else if order.status === 'shipped'}
														<Truck size={12} />
													{:else if order.status === 'cancelled'}
														<XCircle size={12} />
													{:else if order.status === 'processing'}
														<Package size={12} />
													{:else}
														<Clock size={12} />
													{/if}
													{getStatusLabel(order.status)}
												</span>
											</div>

											<!-- Product name preview -->
											<p class="max-w-[200px] truncate text-sm text-gray-600 md:max-w-xs">
												{order.items[0].name}{order.items.length > 1
													? ` và ${order.items.length - 1} sản phẩm khác`
													: ''}
											</p>

											<div
												class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500"
											>
												<div class="flex items-center gap-1">
													<Calendar size={12} />
													{formatDate(order.created_at, false)}
												</div>
												{#if order.tracking_number && order.status === 'shipped'}
													<button
														class="hover:text-primary flex items-center gap-1 transition-colors"
														onclick={() => copyTrackingNumber(order.tracking_number!)}
													>
														{#if copiedTrackingId === order.tracking_number}
															<Check size={12} class="text-success" />
														{:else}
															<Copy size={12} />
														{/if}
														{order.tracking_number}
													</button>
												{/if}
											</div>
										</div>
									</div>

									<!-- Right: Price + Actions -->
									<div class="flex items-center justify-between gap-2 md:flex-col md:items-end">
										<div class="text-left md:text-right">
											<p class="hidden text-xs text-gray-500 md:block">Tổng tiền</p>
											<p class="text-primary text-lg font-bold">
												{formatCurrency(order.total_amount)}
											</p>
										</div>

										<!-- Quick Actions -->
										<div class="flex items-center gap-2">
											{#if order.status === 'pending'}
												<button
													class="btn btn-primary btn-sm gap-1"
													onclick={() => handlePayNow(order.id)}
												>
													<CreditCard size={14} />
													<span class="hidden sm:inline">Thanh toán</span>
												</button>
											{:else if order.status === 'delivered'}
												<button
													class="btn btn-primary btn-sm gap-1"
													onclick={() => handleReorder(order)}
												>
													<RotateCcw size={14} />
													<span class="hidden sm:inline">Mua lại</span>
												</button>
											{/if}
											<button
												class="btn btn-ghost btn-sm gap-1 text-gray-600"
												onclick={() => toggleDetails(order.id)}
												aria-expanded={expandedOrder === order.id}
												aria-label={expandedOrder === order.id
													? 'Thu gọn chi tiết'
													: 'Xem chi tiết'}
											>
												{expandedOrder === order.id ? 'Thu gọn' : 'Chi tiết'}
												{#if expandedOrder === order.id}
													<ChevronUp size={14} />
												{:else}
													<ChevronDown size={14} />
												{/if}
											</button>
										</div>
									</div>
								</div>

								<!-- Estimated Delivery for active orders -->
								{#if order.estimated_delivery && (order.status === 'shipped' || order.status === 'processing')}
									<div
										class="bg-primary/5 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
									>
										<Truck size={16} class="text-primary" />
										<span class="text-gray-600">Dự kiến giao:</span>
										<span class="font-medium text-gray-800"
											>{formatShortDate(order.estimated_delivery)}</span
										>
									</div>
								{/if}

								<!-- Expanded Details -->
								{#if expandedOrder === order.id}
									<div
										class="border-base-200 mt-4 space-y-4 border-t pt-4"
										transition:slide={{ duration: 300 }}
									>
										<!-- Status Timeline (not for cancelled orders) -->
										{#if order.status !== 'cancelled'}
											<div class="mb-6">
												<h4 class="mb-4 text-sm font-semibold text-gray-700">
													Trạng thái đơn hàng
												</h4>
												<div class="relative flex items-center justify-between">
													<!-- Progress line -->
													<div class="bg-base-300 absolute top-4 right-0 left-0 h-0.5"></div>
													<div
														class="bg-primary absolute top-4 left-0 h-0.5 transition-all duration-500"
														style="width: {(Math.max(0, getStatusIndex(order.status)) /
															(statusSteps.length - 1)) *
															100}%"
													></div>

													{#each statusSteps as step, index}
														<div class="relative z-10 flex flex-col items-center">
															<div
																class="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300
                                                                {isStepCompleted(
																	order.status,
																	index,
																)
																	? 'bg-primary text-white'
																	: 'bg-base-100 border-base-300 border-2 text-gray-400'}"
															>
																{#if isStepCompleted(order.status, index)}
																	<CheckCircle size={16} />
																{:else}
																	<CircleDot size={16} />
																{/if}
															</div>
															<span
																class="mt-2 max-w-[60px] text-center text-[10px] md:max-w-none md:text-xs
                                                            {isStepCompleted(order.status, index)
																	? 'font-medium text-gray-700'
																	: 'text-gray-400'}"
															>
																{#if step === 'pending'}Đặt hàng
																{:else if step === 'paid'}Thanh toán
																{:else if step === 'processing'}Xử lý
																{:else if step === 'shipped'}Vận chuyển
																{:else}Hoàn thành{/if}
															</span>
														</div>
													{/each}
												</div>
											</div>
										{:else}
											<div
												class="bg-error/10 text-error flex items-center gap-2 rounded-lg p-3 text-sm"
											>
												<XCircle size={16} />
												<span
													>Đơn hàng đã bị hủy vào {formatDate(
														order.updated_at || order.created_at,
													)}</span
												>
											</div>
										{/if}

										<!-- Products List -->
										<div>
											<h4 class="mb-3 text-sm font-semibold text-gray-700">
												Sản phẩm ({order.items.length})
											</h4>
											<div class="space-y-3">
												{#each order.items as item}
													<div
														class="hover:bg-base-200/50 flex items-center gap-3 rounded-lg p-2 transition-colors"
													>
														<div
															class="border-base-200 h-14 w-14 shrink-0 overflow-hidden rounded-lg border md:h-16 md:w-16"
														>
															<img
																src={item.image}
																alt={item.name}
																class="h-full w-full object-cover"
															/>
														</div>
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-medium text-gray-800 md:text-base">
																{item.name}
															</p>
															<p class="text-xs text-gray-500 md:text-sm">
																{formatCurrency(item.price)} × {item.quantity}
															</p>
														</div>
														<div class="shrink-0 text-right">
															<p class="text-sm font-medium text-gray-800 md:text-base">
																{formatCurrency(item.price * item.quantity)}
															</p>
															{#if order.status === 'delivered'}
																<div class="mt-1 flex justify-end gap-1">
																	{#if !item.reviewed}
																		<button
																			class="btn btn-ghost btn-xs text-warning gap-0.5"
																			onclick={() => handleReview(order.id, item.id)}
																		>
																			<Star size={12} />
																			Đánh giá
																		</button>
																	{:else}
																		<span class="text-success flex items-center gap-0.5 text-xs">
																			<Check size={12} />
																			Đã đánh giá
																		</span>
																	{/if}
																	<button
																		class="btn btn-ghost btn-xs gap-0.5"
																		onclick={() => handleReorderItem(item)}
																	>
																		<RotateCcw size={12} />
																		Mua lại
																	</button>
																</div>
															{/if}
														</div>
													</div>
												{/each}
											</div>
										</div>

										<!-- Order Summary -->
										<div
											class="border-base-200 grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2"
										>
											<!-- Shipping Address -->
											<div class="bg-base-200/50 rounded-lg p-3">
												<div class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
													<MapPin size={14} />
													Địa chỉ giao hàng
												</div>
												<p class="text-sm text-gray-600">{order.shipping_address}</p>
											</div>

											<!-- Payment & Totals -->
											<div class="bg-base-200/50 rounded-lg p-3">
												<div class="space-y-1 text-sm">
													<div class="flex justify-between text-gray-600">
														<span>Tạm tính</span>
														<span>{formatCurrency(order.subtotal || order.total_amount)}</span>
													</div>
													{#if order.shipping_fee !== undefined}
														<div class="flex justify-between text-gray-600">
															<span>Phí vận chuyển</span>
															<span
																>{order.shipping_fee === 0
																	? 'Miễn phí'
																	: formatCurrency(order.shipping_fee)}</span
															>
														</div>
													{/if}
													{#if order.discount && order.discount > 0}
														<div class="text-success flex justify-between">
															<span>Giảm giá</span>
															<span>-{formatCurrency(order.discount)}</span>
														</div>
													{/if}
													<div
														class="border-base-300 flex justify-between border-t pt-1 font-bold text-gray-800"
													>
														<span>Tổng cộng</span>
														<span class="text-primary">{formatCurrency(order.total_amount)}</span>
													</div>
													<div class="flex justify-between pt-1 text-xs text-gray-500">
														<span>Phương thức thanh toán</span>
														<span>{order.payment_method}</span>
													</div>
												</div>
											</div>
										</div>

										<!-- Action Buttons -->
										<div class="border-base-200 flex flex-wrap justify-end gap-2 border-t pt-4">
											{#if order.status === 'pending'}
												<button
													class="btn btn-error btn-sm btn-outline gap-1"
													onclick={() => openCancelModal(order.id)}
												>
													<XCircle size={14} />
													Hủy đơn hàng
												</button>
												<button
													class="btn btn-primary btn-sm gap-1"
													onclick={() => handlePayNow(order.id)}
												>
													<CreditCard size={14} />
													Thanh toán ngay
												</button>
											{:else if order.status === 'delivered'}
												<button
													class="btn btn-outline btn-sm gap-1"
													onclick={() => handleDownloadInvoice(order.id)}
												>
													<FileText size={14} />
													Tải hóa đơn
												</button>
												{#if order.items.some((item) => !item.reviewed)}
													<button
														class="btn btn-outline btn-sm text-warning border-warning hover:bg-warning gap-1 hover:text-white"
														onclick={() =>
															handleReview(order.id, order.items.find((i) => !i.reviewed)?.id || 0)}
													>
														<Star size={14} />
														Đánh giá
													</button>
												{/if}
												<button
													class="btn btn-primary btn-sm gap-1"
													onclick={() => handleReorder(order)}
												>
													<RotateCcw size={14} />
													Mua lại
												</button>
											{:else if order.status !== 'cancelled'}
												<button
													class="btn btn-outline btn-sm gap-1"
													onclick={() => handleDownloadInvoice(order.id)}
												>
													<FileText size={14} />
													Tải hóa đơn
												</button>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<!-- Empty State -->
					<div
						class="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center"
						transition:fade
					>
						<div class="bg-base-100 mb-6 rounded-full p-6 shadow-lg md:p-8">
							<Package size={48} class="text-base-300" />
						</div>
						<h3 class="text-lg font-bold text-gray-800 md:text-xl">
							{#if searchTerm || statusFilter !== 'all' || dateFrom || dateTo}
								Không tìm thấy đơn hàng
							{:else}
								Chưa có đơn hàng nào
							{/if}
						</h3>
						<p class="mt-2 max-w-sm text-sm text-gray-500 md:text-base">
							{#if searchTerm || statusFilter !== 'all' || dateFrom || dateTo}
								Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác
							{:else}
								Bắt đầu mua sắm để xem đơn hàng của bạn tại đây
							{/if}
						</p>
						<div class="mt-6 flex flex-col gap-3 sm:flex-row">
							{#if searchTerm || statusFilter !== 'all' || dateFrom || dateTo}
								<button class="btn btn-primary gap-2" onclick={clearAllFilters}>
									<X size={16} />
									Xóa bộ lọc
								</button>
							{:else}
								<a href="/" class="btn btn-primary gap-2">
									<ShoppingBag size={16} />
									Mua sắm ngay
								</a>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Results count -->
			{#if filteredOrders.length > 0}
				<div class="mt-6 text-center text-sm text-gray-500">
					Hiển thị {filteredOrders.length} đơn hàng
					{#if activeFiltersCount > 0}
						<span>với {activeFiltersCount} bộ lọc đang áp dụng</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Hide scrollbar but allow scrolling */
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
