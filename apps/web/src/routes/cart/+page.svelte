<script lang="ts">
	import {
		AlertCircle,
		ArrowLeft,
		Check,
		ChevronDown,
		ChevronUp,
		Clock,
		CreditCard,
		Heart,
		MessageCircle,
		Minus,
		Package,
		Phone,
		Plus,
		RotateCcw,
		Shield,
		ShoppingBag,
		Tag,
		Trash2,
		Truck,
	} from 'lucide-svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly, slide } from 'svelte/transition';
	import LongBg from '$lib/assets/images/Long.webp';

	// Types
	interface CartItem {
		id: number;
		name: string;
		material: string;
		price: number;
		quantity: number;
		image: string;
		stock: number;
		saved?: boolean;
	}

	interface SavedItem extends CartItem {}

	// State
	let cartItems = $state<CartItem[]>([
		{
			id: 1,
			name: 'Tượng rồng phong thủy',
			material: 'Đồng nguyên khối',
			price: 2850000,
			quantity: 1,
			image: LongBg,
			stock: 5,
		},
		{
			id: 2,
			name: 'Tranh thêu tay phượng hoàng',
			material: 'Lụa tơ tằm',
			price: 5200000,
			quantity: 2,
			image: LongBg,
			stock: 3,
		},
		{
			id: 3,
			name: 'Bình gốm Bát Tràng',
			material: 'Men rạn cổ',
			price: 1500000,
			quantity: 1,
			image: LongBg,
			stock: 8,
		},
	]);

	let savedItems = $state<SavedItem[]>([]);
	let promoCode = $state('');
	let promoApplied = $state(false);
	let promoError = $state('');
	let promoDiscount = $state(0);
	let showSavedItems = $state(true);
	let recentlyRemoved = $state<CartItem | null>(null);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Constants
	const FREE_SHIPPING_THRESHOLD = 10000000;
	const SHIPPING_FEE = 50000;
	const TAX_RATE = 0.1;

	// Derived values
	let itemCount = $derived(cartItems.reduce((sum, item) => sum + item.quantity, 0));
	let subtotal = $derived(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
	let qualifiesForFreeShipping = $derived(subtotal >= FREE_SHIPPING_THRESHOLD);
	let shipping = $derived(qualifiesForFreeShipping ? 0 : SHIPPING_FEE);
	let amountToFreeShipping = $derived(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal));
	let discountAmount = $derived(promoApplied ? subtotal * promoDiscount : 0);
	let tax = $derived((subtotal - discountAmount) * TAX_RATE);
	let total = $derived(subtotal - discountAmount + tax + shipping);

	// Toast notification
	function showToast(message: string, type: 'success' | 'error' = 'success') {
		toastMessage = message;
		toastType = type;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	function updateQuantity(id: number, change: number) {
		cartItems = cartItems.map((item) => {
			if (item.id === id) {
				const newQuantity = Math.min(Math.max(1, item.quantity + change), item.stock);
				if (newQuantity !== item.quantity) {
					showToast('Đã cập nhật số lượng');
				}
				return { ...item, quantity: newQuantity };
			}
			return item;
		});
	}

	function removeItem(id: number) {
		const item = cartItems.find((i) => i.id === id);
		if (item) {
			recentlyRemoved = { ...item };
			cartItems = cartItems.filter((i) => i.id !== id);
			showToast('Đã xóa sản phẩm khỏi giỏ hàng');

			// Auto-clear undo option after 5 seconds
			setTimeout(() => {
				if (recentlyRemoved?.id === id) {
					recentlyRemoved = null;
				}
			}, 5000);
		}
	}

	function undoRemove() {
		if (recentlyRemoved) {
			cartItems = [...cartItems, recentlyRemoved];
			showToast('Đã khôi phục sản phẩm');
			recentlyRemoved = null;
		}
	}

	function saveForLater(id: number) {
		const item = cartItems.find((i) => i.id === id);
		if (item) {
			savedItems = [...savedItems, { ...item, saved: true }];
			cartItems = cartItems.filter((i) => i.id !== id);
			showToast('Đã lưu để mua sau');
		}
	}

	function moveToCart(id: number) {
		const item = savedItems.find((i) => i.id === id);
		if (item) {
			cartItems = [...cartItems, { ...item, saved: false }];
			savedItems = savedItems.filter((i) => i.id !== id);
			showToast('Đã thêm vào giỏ hàng');
		}
	}

	function removeSavedItem(id: number) {
		savedItems = savedItems.filter((i) => i.id !== id);
		showToast('Đã xóa sản phẩm');
	}

	function applyPromoCode() {
		promoError = '';
		if (promoCode.toUpperCase() === 'NOVUS10') {
			promoApplied = true;
			promoDiscount = 0.1;
			showToast('Áp dụng mã giảm giá thành công!');
		} else if (promoCode.toUpperCase() === 'NOVUS20') {
			promoApplied = true;
			promoDiscount = 0.2;
			showToast('Áp dụng mã giảm giá thành công!');
		} else {
			promoError = 'Mã giảm giá không hợp lệ';
			showToast('Mã giảm giá không hợp lệ', 'error');
		}
	}

	function removePromoCode() {
		promoCode = '';
		promoApplied = false;
		promoDiscount = 0;
		promoError = '';
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	}

	function getEstimatedDelivery() {
		const today = new Date();
		const minDays = 3;
		const maxDays = 5;
		const minDate = new Date(today.getTime() + minDays * 24 * 60 * 60 * 1000);
		const maxDate = new Date(today.getTime() + maxDays * 24 * 60 * 60 * 1000);

		const formatDate = (date: Date) => {
			return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
		};

		return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
	}
</script>

<svelte:head>
	<title>Giỏ hàng ({itemCount}) - Novus</title>
</svelte:head>

<!-- Toast Notification -->
{#if toastMessage}
	<div class="fixed top-4 right-4 z-50" transition:fly={{ y: -20, duration: 300 }}>
		<div class="alert {toastType === 'success' ? 'alert-success' : 'alert-error'} shadow-lg">
			{#if toastType === 'success'}
				<Check size={18} />
			{:else}
				<AlertCircle size={18} />
			{/if}
			<span class="text-sm">{toastMessage}</span>
		</div>
	</div>
{/if}

<!-- Undo Remove Banner -->
{#if recentlyRemoved}
	<div
		class="fixed right-4 bottom-4 left-4 z-50 md:right-4 md:left-auto md:w-auto"
		transition:fly={{ y: 20, duration: 300 }}
	>
		<div class="alert bg-base-100 border-base-300 border shadow-xl">
			<span class="text-sm">Đã xóa "{recentlyRemoved.name}"</span>
			<button class="btn btn-sm btn-primary" onclick={undoRemove}>
				<RotateCcw size={14} />
				Hoàn tác
			</button>
		</div>
	</div>
{/if}

<div class="bg-base-200 min-h-screen pt-16 pb-24 md:pt-20 md:pb-12">
	<div class="container mx-auto max-w-6xl px-4">
		<!-- Header -->
		<div class="mb-6 md:mb-8">
			<a href="/" class="btn btn-ghost btn-sm mb-4 -ml-2 gap-2 text-gray-600 normal-case">
				<ArrowLeft size={16} />
				<span class="hidden sm:inline">Tiếp tục mua sắm</span>
				<span class="sm:hidden">Quay lại</span>
			</a>
			<div class="flex items-center justify-between">
				<div>
					<h1 class="font-montserrat text-2xl font-bold text-gray-800 md:text-3xl lg:text-4xl">
						Giỏ hàng của tôi
					</h1>
					{#if cartItems.length > 0}
						<p class="mt-1 text-sm text-gray-500">
							{itemCount} sản phẩm
						</p>
					{/if}
				</div>
			</div>
		</div>

		{#if cartItems.length > 0}
			<!-- Free Shipping Progress -->
			{#if !qualifiesForFreeShipping}
				<div
					class="card from-primary/10 to-secondary/10 border-primary/20 mb-6 border bg-gradient-to-r"
					transition:slide
				>
					<div class="card-body p-4">
						<div class="flex items-center gap-3">
							<Truck size={20} class="text-primary shrink-0" />
							<div class="flex-1">
								<p class="text-sm font-medium text-gray-700">
									Mua thêm <span class="text-primary font-bold"
										>{formatCurrency(amountToFreeShipping)}</span
									> để được miễn phí vận chuyển
								</p>
								<progress
									class="progress progress-primary mt-2 h-2 w-full"
									value={subtotal}
									max={FREE_SHIPPING_THRESHOLD}
								></progress>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="card bg-success/10 border-success/20 mb-6 border" transition:slide>
					<div class="card-body p-4">
						<div class="flex items-center gap-3">
							<Check size={20} class="text-success" />
							<p class="text-success text-sm font-medium">
								🎉 Đơn hàng sẽ được miễn phí vận chuyển!
							</p>
						</div>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
				<!-- Cart Items List -->
				<div class="space-y-4 lg:col-span-8">
					{#each cartItems as item (item.id)}
						<div
							class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg"
							transition:slide={{ duration: 300 }}
							animate:flip={{ duration: 300 }}
						>
							<div class="card-body p-4">
								<div class="flex gap-4">
									<!-- Product Image -->
									<a href="/product/2" class="relative block shrink-0">
										<div class="h-20 w-20 overflow-hidden rounded-xl shadow-sm md:h-28 md:w-28">
											<img
												src={item.image}
												alt={item.name}
												class="h-full w-full cursor-pointer object-cover transition-transform hover:scale-105"
											/>
										</div>
										{#if item.stock <= 3}
											<span class="badge badge-warning badge-sm absolute -top-2 -right-2 text-xs">
												Chỉ còn {item.stock}
											</span>
										{/if}
									</a>

									<!-- Product Info -->
									<div class="min-w-0 flex-1">
										<div class="flex items-start justify-between gap-2">
											<div class="min-w-0">
												<a href="/product/2" class="block">
													<h3
														class="hover:text-primary truncate text-sm font-bold text-gray-800 transition-colors md:text-base"
													>
														{item.name}
													</h3>
												</a>
												<p class="mt-0.5 text-xs text-gray-500 md:text-sm">
													{item.material}
												</p>
												<p class="mt-1 text-sm font-semibold text-gray-700 md:text-base">
													{formatCurrency(item.price)}
												</p>
											</div>

											<!-- Desktop: Item Total -->
											<div class="hidden text-right md:block">
												<p class="text-primary text-lg font-bold">
													{formatCurrency(item.price * item.quantity)}
												</p>
											</div>
										</div>

										<!-- Mobile: Quantity & Actions Row -->
										<div class="mt-3 flex items-center justify-between md:mt-4">
											<!-- Quantity Controls -->
											<div class="flex items-center gap-1">
												<button
													class="btn btn-circle btn-sm btn-ghost bg-base-200 hover:bg-base-300"
													onclick={() => updateQuantity(item.id, -1)}
													disabled={item.quantity <= 1}
													aria-label="Giảm số lượng"
												>
													<Minus size={14} />
												</button>
												<span class="w-10 text-center text-sm font-semibold md:text-base">
													{item.quantity}
												</span>
												<button
													class="btn btn-circle btn-sm btn-ghost bg-base-200 hover:bg-base-300"
													onclick={() => updateQuantity(item.id, 1)}
													disabled={item.quantity >= item.stock}
													aria-label="Tăng số lượng"
												>
													<Plus size={14} />
												</button>
											</div>

											<!-- Mobile: Item Total -->
											<p class="text-primary text-base font-bold md:hidden">
												{formatCurrency(item.price * item.quantity)}
											</p>

											<!-- Actions -->
											<div class="hidden items-center gap-1 md:flex">
												<button
													class="btn btn-ghost btn-sm hover:text-primary gap-1 text-gray-500"
													onclick={() => saveForLater(item.id)}
													aria-label="Lưu để mua sau"
												>
													<Heart size={16} />
													<span class="hidden text-xs lg:inline">Lưu lại</span>
												</button>
												<button
													class="btn btn-ghost btn-sm hover:text-error hover:bg-error/10 text-gray-400"
													onclick={() => removeItem(item.id)}
													aria-label="Xóa sản phẩm"
												>
													<Trash2 size={16} />
												</button>
											</div>
										</div>

										<!-- Mobile Actions Row -->
										<div class="mt-3 flex items-center gap-2 md:hidden">
											<button
												class="btn btn-ghost btn-xs gap-1 text-gray-500"
												onclick={() => saveForLater(item.id)}
											>
												<Heart size={14} />
												Lưu lại
											</button>
											<button
												class="btn btn-ghost btn-xs hover:text-error gap-1 text-gray-400"
												onclick={() => removeItem(item.id)}
											>
												<Trash2 size={14} />
												Xóa
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}

					<!-- Saved Items Section -->
					{#if savedItems.length > 0}
						<div class="mt-8">
							<button
								class="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
								onclick={() => (showSavedItems = !showSavedItems)}
							>
								<Heart size={18} />
								<span class="font-medium">Đã lưu ({savedItems.length})</span>
								{#if showSavedItems}
									<ChevronUp size={18} />
								{:else}
									<ChevronDown size={18} />
								{/if}
							</button>

							{#if showSavedItems}
								<div class="space-y-3" transition:slide>
									{#each savedItems as item (item.id)}
										<div class="card bg-base-100/60 border-base-300 border">
											<div class="card-body p-3">
												<div class="flex items-center gap-3">
													<a href="/product/2" class="block h-14 w-14 overflow-hidden rounded-lg">
														<img
															src={item.image}
															alt={item.name}
															class="h-full w-full object-cover"
														/>
													</a>
													<div class="min-w-0 flex-1">
														<a href="/product/2" class="block">
															<h4
																class="hover:text-primary truncate text-sm font-medium transition-colors"
															>
																{item.name}
															</h4>
														</a>
														<p class="text-sm text-gray-600">{formatCurrency(item.price)}</p>
													</div>
													<div class="flex gap-1">
														<button
															class="btn btn-sm btn-primary btn-outline"
															onclick={() => moveToCart(item.id)}
														>
															Thêm vào giỏ
														</button>
														<button
															class="btn btn-sm btn-ghost text-gray-400"
															onclick={() => removeSavedItem(item.id)}
														>
															<Trash2 size={14} />
														</button>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Order Summary - Sticky on Desktop -->
				<div class="lg:col-span-4">
					<div class="card bg-base-100 shadow-xl lg:sticky lg:top-24">
						<div class="card-body p-4 md:p-6">
							<h2
								class="card-title font-montserrat mb-4 text-lg font-bold md:text-xl lg:text-2xl
							"
							>
								Đơn hàng
							</h2>

							<!-- Promo Code -->
							<div class="mb-4">
								{#if !promoApplied}
									<div class="flex gap-2">
										<div class="relative flex-1">
											<Tag
												size={16}
												class="absolute top-1/2 left-3 z-10 -translate-y-1/2 text-gray-400"
											/>
											<input
												type="text"
												placeholder="Mã giảm giá"
												class="input input-bordered w-full pl-10 text-sm"
												bind:value={promoCode}
												class:input-error={promoError}
											/>
										</div>
										<button
											class="btn btn-primary btn-outline"
											onclick={applyPromoCode}
											disabled={!promoCode}
										>
											Áp dụng
										</button>
									</div>
									{#if promoError}
										<p class="text-error mt-1 text-xs">{promoError}</p>
									{/if}
								{:else}
									<div class="bg-success/10 flex items-center justify-between rounded-lg p-3">
										<div class="flex items-center gap-2">
											<Check size={16} class="text-success" />
											<span class="text-success text-sm font-medium">{promoCode.toUpperCase()}</span
											>
											<span class="badge badge-success badge-sm">-{promoDiscount * 100}%</span>
										</div>
										<button class="btn btn-ghost btn-xs text-gray-500" onclick={removePromoCode}>
											Xóa
										</button>
									</div>
								{/if}
							</div>

							<!-- Price Breakdown -->
							<div class="space-y-3 text-sm">
								<div class="flex justify-between text-gray-600">
									<span>Tạm tính ({itemCount} sản phẩm)</span>
									<span>{formatCurrency(subtotal)}</span>
								</div>

								{#if promoApplied}
									<div class="text-success flex justify-between">
										<span>Giảm giá</span>
										<span>-{formatCurrency(discountAmount)}</span>
									</div>
								{/if}

								<div class="flex justify-between text-gray-600">
									<span class="flex items-center gap-1">
										Phí vận chuyển
										{#if qualifiesForFreeShipping}
											<span class="badge badge-success badge-xs">Miễn phí</span>
										{/if}
									</span>
									<span
										class:line-through={qualifiesForFreeShipping}
										class:text-gray-400={qualifiesForFreeShipping}
									>
										{formatCurrency(SHIPPING_FEE)}
									</span>
								</div>

								<div class="flex justify-between text-gray-600">
									<span>Thuế VAT (10%)</span>
									<span>{formatCurrency(tax)}</span>
								</div>

								<div class="divider my-2"></div>

								<div class="flex items-end justify-between">
									<span class="text-base font-bold text-gray-800">Tổng cộng</span>
									<div class="text-right">
										<div class="text-primary text-xl font-bold md:text-2xl">
											{formatCurrency(total)}
										</div>
									</div>
								</div>
							</div>

							<!-- Estimated Delivery -->
							<div class="bg-base-200 mt-4 flex items-center gap-2 rounded-lg p-3">
								<Clock size={16} class="text-gray-500" />
								<div class="text-xs">
									<span class="text-gray-500">Dự kiến giao hàng:</span>
									<span class="ml-1 font-medium text-gray-700">{getEstimatedDelivery()}</span>
								</div>
							</div>

							<!-- Checkout Button -->
							<button class="btn btn-primary btn-lg shadow-primary/25 mt-6 w-full gap-2 shadow-lg">
								<CreditCard size={20} />
								Thanh toán ngay
							</button>

							<!-- Trust Signals -->
							<div class="mt-4 space-y-2">
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<Shield size={14} class="text-success" />
									<span>Thanh toán an toàn & bảo mật 100%</span>
								</div>
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<RotateCcw size={14} class="text-info" />
									<span>Đổi trả miễn phí trong 30 ngày</span>
								</div>
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<Package size={14} class="text-warning" />
									<span>Sản phẩm chính hãng 100%</span>
								</div>
							</div>

							<!-- Payment Methods -->
							<div class="border-base-200 mt-4 border-t pt-4">
								<p class="mb-2 text-xs text-gray-500">Phương thức thanh toán</p>
								<div class="flex flex-wrap gap-2">
									<div class="badge badge-outline badge-sm">VISA</div>
									<div class="badge badge-outline badge-sm">MasterCard</div>
									<div class="badge badge-outline badge-sm">VNPay</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Help Section -->
					<div class="card bg-base-100 mt-4 shadow-md">
						<div class="card-body p-4">
							<h3 class="mb-3 text-sm font-medium text-gray-700">Cần hỗ trợ?</h3>
							<div class="space-y-2">
								<a
									href="tel:1900xxxx"
									class="hover:text-primary flex items-center gap-2 text-sm text-gray-600"
								>
									<Phone size={14} />
									<span>Hotline: 1900 JKQA</span>
								</a>
								<button class="hover:text-primary flex items-center gap-2 text-sm text-gray-600">
									<MessageCircle size={14} />
									<span>Chat với chúng tôi</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Empty Cart State -->
			<div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
				<div class="bg-base-100 mb-6 rounded-full p-6 shadow-lg md:p-8">
					<ShoppingBag size={48} class="text-base-300 md:h-16 md:w-16" />
				</div>
				<h2 class="text-xl font-bold text-gray-800 md:text-2xl">Giỏ hàng trống</h2>
				<p class="mt-2 mb-6 max-w-sm text-sm text-gray-500 md:text-base">
					Có vẻ như bạn chưa thêm sản phẩm nào vào giỏ hàng. Hãy khám phá các tác phẩm nghệ thuật
					độc đáo của chúng tôi.
				</p>

				<div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
					<a href="/" class="btn btn-primary shadow-lg">
						<ShoppingBag size={18} />
						Khám phá ngay
					</a>
					<a href="/bestsellers" class="btn btn-outline"> Sản phẩm bán chạy </a>
				</div>

				<!-- Saved Items in Empty State -->
				{#if savedItems.length > 0}
					<div class="mt-12 w-full max-w-md">
						<h3 class="mb-4 flex items-center justify-center gap-2 font-medium text-gray-700">
							<Heart size={18} class="text-primary" />
							Sản phẩm đã lưu ({savedItems.length})
						</h3>
						<div class="space-y-3">
							{#each savedItems as item (item.id)}
								<div class="card bg-base-100 shadow-sm">
									<div class="card-body p-3">
										<div class="flex items-center gap-3">
											<a href="/product/2" class="block h-12 w-12 overflow-hidden rounded-lg">
												<img src={item.image} alt={item.name} class="h-full w-full object-cover" />
											</a>
											<div class="min-w-0 flex-1 text-left">
												<a href="/product/2" class="block">
													<h4
														class="hover:text-primary truncate text-sm font-medium transition-colors"
													>
														{item.name}
													</h4>
												</a>
												<p class="text-primary text-sm">{formatCurrency(item.price)}</p>
											</div>
											<button class="btn btn-sm btn-primary" onclick={() => moveToCart(item.id)}>
												Thêm
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Mobile Sticky Checkout Bar -->
{#if cartItems.length > 0}
	<div
		class="bg-base-100 border-base-300 fixed right-0 bottom-0 left-0 border-t p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] lg:hidden"
	>
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs text-gray-500">Tổng cộng</p>
				<p class="text-primary text-lg font-bold">{formatCurrency(total)}</p>
			</div>
			<button class="btn btn-primary max-w-[200px] flex-1 gap-2">
				<CreditCard size={18} />
				Thanh toán
			</button>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar */
	.overflow-x-auto::-webkit-scrollbar {
		height: 6px;
	}
	.overflow-x-auto::-webkit-scrollbar-track {
		background: transparent;
	}
	.overflow-x-auto::-webkit-scrollbar-thumb {
		background-color: rgba(0, 0, 0, 0.1);
		border-radius: 3px;
	}

	/* Prevent body scroll when mobile checkout is visible */
	@media (max-width: 1023px) {
		:global(body) {
			padding-bottom: 80px;
		}
	}
</style>
