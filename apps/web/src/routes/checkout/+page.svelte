<script lang="ts">
	import {
		CreditCard,
		ShoppingBag,
		Truck,
		Shield,
		Package,
		CheckCircle,
		AlertCircle,
		ArrowLeft,
		Clock,
		Lock,
	} from 'lucide-svelte';
	import LongBg from '$lib/assets/images/Long.webp';
	import { fade, slide } from 'svelte/transition';

	// --- CONSTANTS ---
	const FREE_SHIPPING_THRESHOLD = 1_000_000;
	const SHIPPING_FEE = 50_000;
	const TAX_RATE = 0.1;

	const PROVINCES = [
		'TP. Hồ Chí Minh',
		'Hà Nội',
		'Đà Nẵng',
		'Cần Thơ',
		'Hải Phòng',
		'Bình Dương',
		'Đồng Nai',
		'Khác',
	] as const;

	const TRUST_BADGES = [
		{ icon: Shield, text: 'Mã hóa SSL 256-bit', color: 'success' },
		{ icon: CheckCircle, text: 'Đối tác VNPay uy tín', color: 'info' },
		{ icon: Package, text: 'Hoàn tiền 100% nếu có vấn đề', color: 'warning' },
	] as const;

	// --- TYPES ---
	interface CartItem {
		id: number;
		name: string;
		imageUrl: string;
		price: number;
		quantity: number;
	}

	interface FormField {
		value: string;
		error: string;
		touched: boolean;
	}

	type FieldName = 'email' | 'fullName' | 'phone' | 'province' | 'ward' | 'address';

	// --- MOCK DATA ---
	const cartItems: CartItem[] = [
		{ id: 1, name: 'Tượng Kỳ Lân Bằng Đồng', imageUrl: LongBg, price: 1200000, quantity: 1 },
		{ id: 2, name: 'Vòng Tay Trầm Hương Tự Nhiên', imageUrl: LongBg, price: 850000, quantity: 2 },
	];

	// --- FORM STATE ---
	let fields = $state<Record<FieldName, FormField>>({
		email: { value: '', error: '', touched: false },
		fullName: { value: '', error: '', touched: false },
		phone: { value: '', error: '', touched: false },
		province: { value: PROVINCES[0], error: '', touched: false },
		ward: { value: '', error: '', touched: false },
		address: { value: '', error: '', touched: false },
	});

	let acceptTerms = $state(false);
	let termsError = $state('');
	let termsTouched = $state(false);
	let isSubmitting = $state(false);
	let toastMessage = $state('');

	// --- COMPUTED VALUES ---
	let itemCount = $derived(cartItems.reduce((sum, item) => sum + item.quantity, 0));
	let subtotal = $derived(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
	let isFreeShipping = $derived(subtotal >= FREE_SHIPPING_THRESHOLD);
	let shipping = $derived(isFreeShipping ? 0 : SHIPPING_FEE);
	let tax = $derived(Math.round(subtotal * TAX_RATE));
	let total = $derived(subtotal + tax + shipping);
	let amountToFreeShipping = $derived(FREE_SHIPPING_THRESHOLD - subtotal);
	let progressPercent = $derived(
		Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)),
	);

	let hasErrors = $derived(
		Object.values(fields).some((f) => f.error) || (termsTouched && termsError),
	);

	// --- FORMATTERS ---
	const currencyFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
	const fmt = (n: number) => currencyFmt.format(n);

	function getDeliveryDate(): string {
		const d = new Date();
		const min = new Date(d.getTime() + 3 * 86400000);
		const max = new Date(d.getTime() + 5 * 86400000);
		const f = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;
		return `${f(min)} - ${f(max)}`;
	}

	// --- VALIDATION ---
	const validators: Record<FieldName, (v: string) => string> = {
		email: (v) => {
			if (!v) return 'Vui lòng nhập email';
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email không hợp lệ';
		},
		fullName: (v) => (v.trim() ? '' : 'Vui lòng nhập họ tên'),
		phone: (v) => {
			if (!v) return 'Vui lòng nhập SĐT';
			return /^(0|\+84)[0-9]{9,10}$/.test(v) ? '' : 'SĐT không hợp lệ';
		},
		province: () => '',
		ward: (v) => (v.trim() ? '' : 'Vui lòng nhập phường/xã'),
		address: (v) => (v.trim() ? '' : 'Vui lòng nhập địa chỉ'),
	};

	function validate(name: FieldName): void {
		fields[name].touched = true;
		fields[name].error = validators[name](fields[name].value);
	}

	function validateTerms(): void {
		termsTouched = true;
		termsError = acceptTerms ? '' : 'Vui lòng đồng ý điều khoản';
	}

	function validateAll(): boolean {
		(Object.keys(fields) as FieldName[]).forEach(validate);
		validateTerms();
		return !hasErrors && acceptTerms;
	}

	// --- HANDLERS ---
	async function handleSubmit(e: SubmitEvent): Promise<void> {
		e.preventDefault();

		if (!validateAll()) {
			const firstError = (Object.keys(fields) as FieldName[]).find((k) => fields[k].error);
			if (firstError) document.getElementById(firstError)?.focus();
			return;
		}

		isSubmitting = true;

		try {
			// API call here
			await new Promise((r) => setTimeout(r, 1500));

			toastMessage = 'Đơn hàng đã được xác nhận!';
			setTimeout(() => {
				toastMessage = '';
				// Navigate to payment
			}, 2000);
		} catch {
			toastMessage = 'Có lỗi xảy ra, vui lòng thử lại';
		} finally {
			isSubmitting = false;
		}
	}

	// --- HELPERS ---
	function fieldClass(name: FieldName, base: string): string {
		const f = fields[name];
		if (!f.touched) return base;
		return f.error ? `${base} input-error` : `${base} input-success`;
	}

	function textareaClass(name: FieldName, base: string): string {
		const f = fields[name];
		if (!f.touched) return base;
		return f.error ? `${base} textarea-error` : `${base} textarea-success`;
	}
</script>

<svelte:head>
	<title>Thanh toán - Novus</title>
</svelte:head>

<!-- Toast -->
{#if toastMessage}
	<div class="fixed top-3 right-3 z-50" transition:fade role="alert">
		<div class="alert alert-success py-2 shadow-lg">
			<CheckCircle size={16} aria-hidden="true" />
			<span class="text-sm font-medium">{toastMessage}</span>
		</div>
	</div>
{/if}

<div class="bg-base-200 min-h-screen">
	<!-- Progress Steps -->
	<header
		class="border-base-300 bg-base-100/95 sticky top-0 z-40 border-b py-2.5 backdrop-blur-md md:py-3"
	>
		<nav class="mx-auto max-w-5xl px-3" aria-label="Checkout progress">
			<ul class="steps steps-horizontal w-full text-xs md:text-sm">
				<li class="step step-primary" data-content="✓">Giỏ hàng</li>
				<li class="step step-primary" data-content="2">
					<span class="text-primary font-semibold">Thanh toán</span>
				</li>
				<li class="step" data-content="3">Hoàn tất</li>
			</ul>
		</nav>
	</header>

	<main class="mx-auto max-w-5xl px-3 py-4 pb-24 md:py-6 lg:pb-6">
		<!-- Back -->
		<a href="/cart" class="btn btn-ghost btn-sm mb-3 -ml-2 gap-1.5 md:mb-4">
			<ArrowLeft size={16} aria-hidden="true" />
			Quay lại
		</a>

		<!-- Title -->
		<div class="mb-4 md:mb-6">
			<h1 class="text-lg font-bold text-gray-900 md:text-xl lg:text-2xl">Thanh toán</h1>
			<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500 md:text-sm">
				<Lock size={12} aria-hidden="true" />
				Thông tin được mã hóa bảo mật
			</p>
		</div>

		<!-- Free Shipping Banner -->
		{#if isFreeShipping}
			<div
				class="bg-success/10 mb-4 flex items-center gap-2 rounded-lg p-2.5 md:mb-5 md:p-3"
				transition:slide
			>
				<CheckCircle size={18} class="text-success shrink-0" aria-hidden="true" />
				<span class="text-success text-xs font-semibold md:text-sm">
					🎉 Bạn được miễn phí vận chuyển!
				</span>
			</div>
		{:else if amountToFreeShipping > 0}
			<div class="bg-primary/5 mb-4 rounded-lg p-2.5 md:mb-5 md:p-3" transition:slide>
				<div class="mb-1.5 flex items-center gap-2">
					<Truck size={16} class="text-primary shrink-0" aria-hidden="true" />
					<span class="text-xs text-gray-700 md:text-sm">
						Mua thêm <strong class="text-primary">{fmt(amountToFreeShipping)}</strong> để freeship
					</span>
				</div>
				<div class="bg-base-300 relative h-1.5 overflow-hidden rounded-full md:h-2">
					<div
						class="bg-primary absolute inset-y-0 left-0 rounded-full transition-all duration-300"
						style="width: {progressPercent}%"
					></div>
				</div>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="lg:grid lg:grid-cols-5 lg:gap-6">
			<!-- Form Column -->
			<div class="space-y-4 md:space-y-5 lg:col-span-3">
				<!-- Contact -->
				<section class="border-base-300 bg-base-100 rounded-xl border p-3 md:p-4">
					<h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 md:text-base">
						<span
							class="bg-primary/10 text-primary flex size-5 items-center justify-center rounded text-xs font-bold md:size-6 md:text-sm"
							>1</span
						>
						Liên hệ
					</h2>

					<label class="form-control">
						<span class="label py-1">
							<span class="label-text text-xs font-medium md:text-sm">Email *</span>
						</span>
						<input
							type="email"
							id="email"
							class={fieldClass('email', 'input input-bordered h-9 text-sm md:h-10')}
							placeholder="email@example.com"
							bind:value={fields.email.value}
							onblur={() => validate('email')}
							oninput={() => fields.email.touched && validate('email')}
						/>
						{#if fields.email.touched && fields.email.error}
							<span class="label py-1" transition:slide={{ duration: 150 }}>
								<span class="label-text-alt text-error flex items-center gap-1 text-xs">
									<AlertCircle size={12} aria-hidden="true" />
									{fields.email.error}
								</span>
							</span>
						{/if}
					</label>
				</section>

				<!-- Shipping -->
				<section class="border-base-300 bg-base-100 rounded-xl border p-3 md:p-4">
					<h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 md:text-base">
						<span
							class="bg-secondary/10 text-secondary flex size-5 items-center justify-center rounded text-xs font-bold md:size-6 md:text-sm"
							>2</span
						>
						Giao hàng
					</h2>

					<div class="space-y-3">
						<!-- Name & Phone -->
						<div class="grid grid-cols-2 gap-2 md:gap-3">
							<label class="form-control">
								<span class="label py-1">
									<span class="label-text text-xs font-medium md:text-sm">Họ tên *</span>
								</span>
								<input
									type="text"
									id="fullName"
									class={fieldClass('fullName', 'input input-bordered h-9 text-sm md:h-10')}
									placeholder="Nguyễn Văn A"
									bind:value={fields.fullName.value}
									onblur={() => validate('fullName')}
									oninput={() => fields.fullName.touched && validate('fullName')}
								/>
								{#if fields.fullName.touched && fields.fullName.error}
									<span class="label py-0.5" transition:slide={{ duration: 150 }}>
										<span class="label-text-alt text-error text-[10px]"
											>{fields.fullName.error}</span
										>
									</span>
								{/if}
							</label>

							<label class="form-control">
								<span class="label py-1">
									<span class="label-text text-xs font-medium md:text-sm">SĐT *</span>
								</span>
								<input
									type="tel"
									id="phone"
									class={fieldClass('phone', 'input input-bordered h-9 text-sm md:h-10')}
									placeholder="0912345678"
									bind:value={fields.phone.value}
									onblur={() => validate('phone')}
									oninput={() => fields.phone.touched && validate('phone')}
								/>
								{#if fields.phone.touched && fields.phone.error}
									<span class="label py-0.5" transition:slide={{ duration: 150 }}>
										<span class="label-text-alt text-error text-[10px]">{fields.phone.error}</span>
									</span>
								{/if}
							</label>
						</div>

						<!-- Province & Ward -->
						<div class="grid grid-cols-2 gap-2 md:gap-3">
							<label class="form-control">
								<span class="label py-1">
									<span class="label-text text-xs font-medium md:text-sm">Tỉnh/TP *</span>
								</span>
								<select
									id="province"
									class="select select-bordered h-9 min-h-0 text-sm md:h-10"
									bind:value={fields.province.value}
								>
									{#each PROVINCES as p (p)}
										<option value={p}>{p}</option>
									{/each}
								</select>
							</label>

							<label class="form-control">
								<span class="label py-1">
									<span class="label-text text-xs font-medium md:text-sm">Phường/Xã *</span>
								</span>
								<input
									type="text"
									id="ward"
									class={fieldClass('ward', 'input input-bordered h-9 text-sm md:h-10')}
									placeholder="Phường Bến Nghé"
									bind:value={fields.ward.value}
									onblur={() => validate('ward')}
									oninput={() => fields.ward.touched && validate('ward')}
								/>
								{#if fields.ward.touched && fields.ward.error}
									<span class="label py-0.5" transition:slide={{ duration: 150 }}>
										<span class="label-text-alt text-error text-[10px]">{fields.ward.error}</span>
									</span>
								{/if}
							</label>
						</div>

						<!-- Address -->
						<label class="form-control">
							<span class="label py-1">
								<span class="label-text text-xs font-medium md:text-sm">Địa chỉ cụ thể *</span>
							</span>
							<textarea
								id="address"
								class={textareaClass(
									'address',
									'textarea textarea-bordered min-h-14 text-sm md:min-h-16',
								)}
								placeholder="Số nhà, tên đường..."
								bind:value={fields.address.value}
								onblur={() => validate('address')}
								oninput={() => fields.address.touched && validate('address')}
							></textarea>
							{#if fields.address.touched && fields.address.error}
								<span class="label py-0.5" transition:slide={{ duration: 150 }}>
									<span class="label-text-alt text-error flex items-center gap-1 text-xs">
										<AlertCircle size={10} aria-hidden="true" />
										{fields.address.error}
									</span>
								</span>
							{/if}
						</label>
					</div>
				</section>

				<!-- Payment -->
				<section class="border-base-300 bg-base-100 rounded-xl border p-3 md:p-4">
					<h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 md:text-base">
						<span
							class="bg-accent/10 text-accent flex size-5 items-center justify-center rounded text-xs font-bold md:size-6 md:text-sm"
							>3</span
						>
						Thanh toán
					</h2>

					<!-- VNPay -->
					<div class="border-primary bg-primary/5 flex items-center gap-3 rounded-lg border-2 p-3">
						<input type="radio" class="radio radio-primary radio-sm" checked disabled />
						<div class="flex-1">
							<p class="text-sm font-bold text-gray-900">VNPay</p>
							<p class="text-[10px] text-gray-500 md:text-xs">ATM, Visa, MasterCard, QR</p>
						</div>
						<CreditCard size={24} class="text-primary" aria-hidden="true" />
					</div>

					<!-- Trust -->
					<div class="bg-base-200 mt-3 space-y-1.5 rounded-lg p-2.5 md:p-3">
						{#each TRUST_BADGES as { icon: Icon, text, color } (text)}
							<div class="flex items-center gap-2 text-xs text-gray-600">
								<Icon size={14} class="shrink-0 text-{color}" aria-hidden="true" />
								<span>{text}</span>
							</div>
						{/each}
					</div>

					<!-- Terms -->
					<label
						class="border-base-300 mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-dashed p-2.5 md:mt-4"
					>
						<input
							type="checkbox"
							class="checkbox checkbox-primary checkbox-sm mt-0.5"
							class:checkbox-error={termsTouched && termsError}
							bind:checked={acceptTerms}
							onchange={validateTerms}
						/>
						<span class="text-xs text-gray-700">
							Tôi đồng ý với
							<a href="/terms" class="link link-primary font-medium">điều khoản</a>
							của Novus *
						</span>
					</label>
					{#if termsTouched && termsError}
						<p class="text-error mt-1 pl-7 text-[10px]" transition:slide={{ duration: 150 }}>
							{termsError}
						</p>
					{/if}
				</section>
			</div>

			<!-- Summary Column -->
			<aside class="mt-4 md:mt-5 lg:col-span-2 lg:mt-0">
				<div class="border-base-300 bg-base-100 rounded-xl border p-3 md:p-4 lg:sticky lg:top-16">
					<h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 md:text-base">
						<ShoppingBag size={16} class="text-primary" aria-hidden="true" />
						Đơn hàng ({itemCount})
					</h2>

					<!-- Items -->
					<ul class="divide-base-200 divide-y">
						{#each cartItems as item (item.id)}
							<li class="flex gap-2.5 py-2.5">
								<div
									class="border-base-300 relative size-12 shrink-0 overflow-hidden rounded-lg border md:size-14"
								>
									<img
										src={item.imageUrl}
										alt={item.name}
										class="size-full object-cover"
										loading="lazy"
									/>
									<span class="badge badge-primary badge-xs absolute -top-1 -right-1 font-bold">
										{item.quantity}
									</span>
								</div>
								<div class="min-w-0 flex-1">
									<p class="line-clamp-2 text-xs font-medium text-gray-900 md:text-sm">
										{item.name}
									</p>
								</div>
								<p class="text-primary shrink-0 text-xs font-bold md:text-sm">
									{fmt(item.price * item.quantity)}
								</p>
							</li>
						{/each}
					</ul>

					<!-- Totals -->
					<dl
						class="border-base-300 mt-3 space-y-1.5 border-t border-dashed pt-3 text-xs md:text-sm"
					>
						<div class="flex justify-between text-gray-600">
							<dt>Tạm tính</dt>
							<dd class="font-medium">{fmt(subtotal)}</dd>
						</div>
						<div class="flex justify-between text-gray-600">
							<dt class="flex items-center gap-1">
								Vận chuyển
								{#if isFreeShipping}
									<span class="badge badge-success badge-xs">Free</span>
								{/if}
							</dt>
							<dd
								class="font-medium"
								class:line-through={isFreeShipping}
								class:text-gray-400={isFreeShipping}
							>
								{fmt(SHIPPING_FEE)}
							</dd>
						</div>
						<div class="flex justify-between text-gray-600">
							<dt>VAT (10%)</dt>
							<dd class="font-medium">{fmt(tax)}</dd>
						</div>
						<div
							class="border-base-300 flex items-center justify-between border-t pt-2 text-sm md:text-base"
						>
							<dt class="font-bold">Tổng</dt>
							<dd class="text-primary text-base font-bold md:text-lg">{fmt(total)}</dd>
						</div>
					</dl>

					<!-- Delivery -->
					<div class="bg-info/5 mt-3 flex items-center gap-2 rounded-lg p-2 text-xs md:text-sm">
						<Clock size={14} class="text-info shrink-0" aria-hidden="true" />
						<span class="text-gray-600">Giao: <strong>{getDeliveryDate()}</strong></span>
					</div>

					<!-- Desktop Submit -->
					<button
						type="submit"
						class="btn btn-primary mt-4 hidden w-full gap-2 lg:flex"
						disabled={isSubmitting}
					>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
							Đang xử lý...
						{:else}
							<Lock size={16} aria-hidden="true" />
							Đặt hàng • {fmt(total)}
						{/if}
					</button>
				</div>
			</aside>
		</form>
	</main>

	<!-- Mobile Bottom Bar -->
	<div
		class="btm-nav btm-nav-lg border-base-300 bg-base-100/95 z-50 h-16 border-t backdrop-blur-md md:h-18 lg:hidden"
	>
		<div class="flex w-full items-center justify-between px-3">
			<div>
				<p class="text-[10px] text-gray-500">Tổng cộng</p>
				<p class="text-primary text-base font-bold">{fmt(total)}</p>
			</div>
			<button
				type="submit"
				class="btn btn-primary btn-sm gap-1.5 px-5"
				disabled={isSubmitting}
				onclick={handleSubmit}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<Lock size={14} aria-hidden="true" />
				{/if}
				Đặt hàng
			</button>
		</div>
	</div>
</div>

<style>
	@media (max-width: 1023px) {
		main {
			padding-bottom: 5rem;
		}
	}

	.input,
	.textarea,
	.select {
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.input:focus,
	.textarea:focus,
	.select:focus {
		outline: none;
		box-shadow: 0 0 0 2px oklch(var(--p) / 0.2);
	}

	.input-success,
	.textarea-success {
		border-color: oklch(var(--su));
	}

	.input-error,
	.textarea-error {
		border-color: oklch(var(--er));
	}
</style>
