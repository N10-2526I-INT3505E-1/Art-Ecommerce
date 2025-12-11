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
	import { slide, fade } from 'svelte/transition';
	import { cart } from '$lib/stores/cart.svelte';
	import { api } from '$lib/api-client';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	// --- CONSTANTS ---
	const FREE_SHIPPING_THRESHOLD = 10_000_000;
	const SHIPPING_FEE = 50_000;
	const TAX_RATE = 0.1;
	const phonePattern = '[0-9]{9,11}';

	const PROVINCES = [
		'TP. Hồ Chí Minh',
		'Hà Nội',
		'Hải Phòng',
		'Đà Nẵng',
		'Cần Thơ',
		'Huế',
		'Cao Bằng',
		'Điện Biên',
		'Hà Tĩnh',
		'Lai Châu',
		'Lạng Sơn',
		'Nghệ An',
		'Quảng Ninh',
		'Thanh Hóa',
		'Sơn La',
		'Tuyên Quang',
		'Lào Cai',
		'Thái Nguyên',
		'Phú Thọ',
		'Bắc Ninh',
		'Hưng Yên',
		'Ninh Bình',
		'Quảng Trị',
		'Quảng Ngãi',
		'Gia Lai',
		'Khánh Hòa',
		'Lâm Đồng',
		'Đắk Lắk',
		'Đồng Nai',
		'Tây Ninh',
		'Vĩnh Long',
		'Đồng Tháp',
		'Cà Mau',
		'An Giang',
	] as const;

	const TRUST_BADGES = [
		{ icon: Shield, text: 'Mã hóa SSL 256-bit', color: 'success' },
		{ icon: CheckCircle, text: 'Đối tác VNPay uy tín', color: 'info' },
		{ icon: Package, text: 'Hoàn tiền 100% nếu có vấn đề', color: 'warning' },
	] as const;

	// --- STATE ---
	let currentUser = $derived(page.data.user);
	let cartItems = $derived(cart.items);

	// Form State
	let email = $state('');
	let fullName = $state('');
	let phone = $state('');
	let province = $state(PROVINCES[0]);
	let ward = $state('');
	let address = $state('');

	let acceptTerms = $state(false);
	let termsError = $state('');
	let isSubmitting = $state(false);

	// Server Action Result Handling
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

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

	// --- INITIALIZATION ---
	onMount(async () => {
		if (cartItems.length === 0) {
			goto('/cart');
			return;
		}

		if (currentUser) {
			email = currentUser.email || '';
			fullName = (currentUser.first_name + ' ' + currentUser.last_name).trim();

			try {
				const res = await api.get('users/profile/addresses').json<{ addresses: any[] }>();
				if (res.addresses && res.addresses.length > 0) {
					const addr = res.addresses.find((a) => a.is_default) || res.addresses[0];
					phone = addr.phone || '';
					address = addr.address || '';
					ward = addr.ward || '';
					const matchedProvince = PROVINCES.find((p) => p === addr.state);
					if (matchedProvince) province = matchedProvince;
				}
			} catch (e) {
				console.error('Failed to pre-fill address', e);
			}
		}
	});

	// --- FORM ACTION HANDLER ---
	const handleSubmit = () => {
		if (!acceptTerms) {
			termsError = 'Vui lòng đồng ý điều khoản';
			// We can't easily cancel the enhance here, so we handle it via early return or UI state
			// Ideally, the submit button is disabled if validation fails
		}

		isSubmitting = true;

		return async ({ result, update }: any) => {
			isSubmitting = false;

			// Handle successful return from server (type: success)
			if (result.type === 'success' && result.data?.paymentUrl) {
				toastMessage = 'Đang chuyển hướng đến VNPay...';
				toastType = 'success';

				// Optional: Clear cart before redirect
				// cart.items = [];

				// Redirect to the payment gateway
				window.location.href = result.data.paymentUrl;
			}
			// Handle redirects (if server uses throw redirect instead of return)
			else if (result.type === 'redirect') {
				goto(result.location);
			}
			// Handle errors
			else if (result.type === 'failure') {
				toastMessage = result.data?.message || 'Có lỗi xảy ra';
				toastType = 'error';
				await update();
			} else {
				// Fallback for unexpected states
				await update();
			}
		};
	};
</script>

<svelte:head>
	<title>Thanh toán - Novus</title>
</svelte:head>

<!-- Toast -->
{#if toastMessage}
	<div class="fixed top-3 right-3 z-50" transition:fade role="alert">
		<div class="alert {toastType === 'success' ? 'alert-success' : 'alert-error'} py-2 shadow-lg">
			{#if toastType === 'success'}
				<CheckCircle size={16} />
			{:else}
				<AlertCircle size={16} />
			{/if}
			<span class="text-sm font-medium">{toastMessage}</span>
		</div>
	</div>
{/if}

<div class="bg-base-200 min-h-screen">
	<!-- Progress Steps -->
	<header
		class="border-base-300 bg-base-100/95 sticky top-0 z-40 border-b py-2.5 backdrop-blur-md md:py-3"
	>
		<nav class="mx-auto max-w-5xl px-3">
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
		<a href="/cart" class="btn btn-ghost btn-sm mb-3 -ml-2 gap-1.5 md:mb-4">
			<ArrowLeft size={16} /> Quay lại
		</a>

		<div class="mb-4 md:mb-6">
			<h1 class="text-lg font-bold text-gray-900 md:text-xl lg:text-2xl">Thanh toán</h1>
			<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500 md:text-sm">
				<Lock size={12} /> Thông tin được mã hóa bảo mật
			</p>
		</div>

		<!-- Free Shipping Banner -->
		{#if isFreeShipping}
			<div
				class="bg-success/10 mb-4 flex items-center gap-2 rounded-lg p-2.5 md:mb-5 md:p-3"
				transition:slide
			>
				<CheckCircle size={18} class="text-success shrink-0" />
				<span class="text-success text-xs font-semibold md:text-sm"
					>🎉 Bạn được miễn phí vận chuyển!</span
				>
			</div>
		{:else if amountToFreeShipping > 0}
			<div class="bg-primary/5 mb-4 rounded-lg p-2.5 md:mb-5 md:p-3" transition:slide>
				<div class="mb-1.5 flex items-center gap-2">
					<Truck size={16} class="text-primary shrink-0" />
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

		<!-- FORM START -->
		<form method="POST" use:enhance={handleSubmit} class="lg:grid lg:grid-cols-5 lg:gap-6">
			<!-- Hidden Inputs to pass data to server -->
			<input type="hidden" name="cartItems" value={JSON.stringify(cartItems)} />

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
						<span class="label py-1"
							><span class="label-text text-xs font-medium md:text-sm">Email *</span></span
						>
						<input
							type="email"
							name="email"
							class="input input-bordered h-9 text-sm md:h-10"
							required
							bind:value={email}
						/>
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
						<div class="grid grid-cols-2 gap-2 md:gap-3">
							<label class="form-control">
								<span class="label py-1"
									><span class="label-text text-xs font-medium md:text-sm">Họ tên *</span></span
								>
								<input
									type="text"
									name="fullName"
									class="input input-bordered h-9 text-sm md:h-10"
									required
									bind:value={fullName}
								/>
							</label>
							<label class="form-control">
								<span class="label py-1"
									><span class="label-text text-xs font-medium md:text-sm">SĐT *</span></span
								>
								<input
									type="tel"
									name="phone"
									class="input input-bordered h-9 text-sm md:h-10"
									required
									bind:value={phone}
									pattern={phonePattern}
									title="SĐT 9-11 số"
								/>
							</label>
						</div>
						<div class="grid grid-cols-2 gap-2 md:gap-3">
							<label class="form-control">
								<span class="label py-1"
									><span class="label-text text-xs font-medium md:text-sm">Tỉnh/TP *</span></span
								>
								<select
									name="province"
									class="select select-bordered h-9 min-h-0 text-sm md:h-10"
									bind:value={province}
								>
									{#each PROVINCES as p}
										<option value={p}>{p}</option>
									{/each}
								</select>
							</label>
							<label class="form-control">
								<span class="label py-1"
									><span class="label-text text-xs font-medium md:text-sm">Phường/Xã *</span></span
								>
								<input
									type="text"
									name="ward"
									class="input input-bordered h-9 text-sm md:h-10"
									required
									bind:value={ward}
								/>
							</label>
						</div>
						<label class="form-control">
							<span class="label py-1"
								><span class="label-text text-xs font-medium md:text-sm">Địa chỉ cụ thể *</span
								></span
							>
							<textarea
								name="address"
								class="textarea textarea-bordered min-h-14 text-sm md:min-h-16"
								required
								bind:value={address}
								placeholder="Số nhà, tên đường..."
							></textarea>
						</label>
					</div>
				</section>

				<!-- Payment & Terms -->
				<section class="border-base-300 bg-base-100 rounded-xl border p-3 md:p-4">
					<h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 md:text-base">
						<span
							class="bg-accent/10 text-accent flex size-5 items-center justify-center rounded text-xs font-bold md:size-6 md:text-sm"
							>3</span
						>
						Thanh toán
					</h2>
					<div class="border-primary bg-primary/5 flex items-center gap-3 rounded-lg border-2 p-3">
						<input type="radio" class="radio radio-primary radio-sm" checked disabled />
						<div class="flex-1">
							<p class="text-sm font-bold text-gray-900">VNPay</p>
							<p class="text-[10px] text-gray-500 md:text-xs">ATM, Visa, MasterCard, QR</p>
						</div>
						<CreditCard size={24} class="text-primary" />
					</div>
					<div class="bg-base-200 mt-3 space-y-1.5 rounded-lg p-2.5 md:p-3">
						{#each TRUST_BADGES as { icon: Icon, text, color }}
							<div class="flex items-center gap-2 text-xs text-gray-600">
								<Icon size={14} class="shrink-0 text-{color}" />
								<span>{text}</span>
							</div>
						{/each}
					</div>
					<label
						class="border-base-300 mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-dashed p-2.5 md:mt-4"
					>
						<input
							type="checkbox"
							class="checkbox checkbox-primary checkbox-sm mt-0.5"
							class:checkbox-error={!!termsError}
							bind:checked={acceptTerms}
							onchange={() => (termsError = '')}
						/>
						<span class="text-xs text-gray-700">
							Tôi đồng ý với <a href="/terms" class="link link-primary font-medium">điều khoản</a> của
							Novus *
						</span>
					</label>
					{#if termsError}
						<p class="text-error mt-1 pl-7 text-[10px]" transition:slide>{termsError}</p>
					{/if}
				</section>
			</div>

			<!-- Summary Column -->
			<aside class="mt-4 md:mt-5 lg:col-span-2 lg:mt-0">
				<div class="border-base-300 bg-base-100 rounded-xl border p-3 md:p-4 lg:sticky lg:top-16">
					<h2 class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 md:text-base">
						<ShoppingBag size={16} class="text-primary" />
						Đơn hàng ({itemCount})
					</h2>
					<ul class="divide-base-200 divide-y">
						{#each cartItems as item}
							<li class="flex gap-2.5 py-2.5">
								<div
									class="border-base-300 relative size-12 shrink-0 overflow-hidden rounded-lg border md:size-14"
								>
									<img src={item.image} alt={item.name} class="size-full object-cover" />
									<span class="badge badge-primary badge-xs absolute -top-1 -right-1 font-bold"
										>{item.quantity}</span
									>
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
					<dl
						class="border-base-300 mt-3 space-y-1.5 border-t border-dashed pt-3 text-xs md:text-sm"
					>
						<div class="flex justify-between text-gray-600">
							<dt>Tạm tính</dt>
							<dd class="font-medium">{fmt(subtotal)}</dd>
						</div>
						<div class="flex justify-between text-gray-600">
							<dt class="flex items-center gap-1">
								Vận chuyển {#if isFreeShipping}<span class="badge badge-success badge-xs">Free</span
									>{/if}
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
					<div class="bg-info/5 mt-3 flex items-center gap-2 rounded-lg p-2 text-xs md:text-sm">
						<Clock size={14} class="text-info shrink-0" />
						<span class="text-gray-600">Giao: <strong>{getDeliveryDate()}</strong></span>
					</div>
					<button
						type="submit"
						class="btn btn-primary mt-4 hidden w-full gap-2 lg:flex"
						disabled={isSubmitting || !acceptTerms}
					>
						{#if isSubmitting}<span class="loading loading-spinner loading-sm"></span>{:else}<Lock
								size={16}
							/>{/if}
						Đặt hàng • {fmt(total)}
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
			<!-- Note: We use 'form' attribute to link this button to the form above -->
			<button
				class="btn btn-primary btn-sm gap-1.5 px-5"
				disabled={isSubmitting || !acceptTerms}
				onclick={() => document.querySelector('form')?.requestSubmit()}
			>
				{#if isSubmitting}<span class="loading loading-spinner loading-xs"></span>{:else}<Lock
						size={14}
					/>{/if}
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
	.input:focus,
	.textarea:focus,
	.select:focus {
		outline: none;
		box-shadow: 0 0 0 2px oklch(var(--p) / 0.2);
	}
</style>
