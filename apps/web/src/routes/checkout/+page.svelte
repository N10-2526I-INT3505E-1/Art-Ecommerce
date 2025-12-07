<script lang="ts">
	import {
		Landmark,
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
		Award,
	} from 'lucide-svelte';
	import LongBg from '$lib/assets/images/long.webp';
	import { fade, slide } from 'svelte/transition';

	// --- SHARED CONSTANTS (SHOULD MATCH CART PAGE) ---
	const FREE_SHIPPING_THRESHOLD = 1_000_000;
	const SHIPPING_FEE = 50_000;
	const TAX_RATE = 0.1;

	// --- MOCK CART DATA (IN PRODUCTION, GET FROM STORE/API) ---
	const cartData = {
		items: [
			{
				id: 1,
				name: 'Tượng Kỳ Lân Bằng Đồng',
				imageUrl: LongBg,
				price: 1200000,
				quantity: 1,
			},
			{
				id: 2,
				name: 'Vòng Tay Trầm Hương Tự Nhiên',
				imageUrl: LongBg,
				price: 850000,
				quantity: 2,
			},
		],
	};

	// --- FORM STATE ---
	let contact = $state({ email: '' });
	let shippingAddress = $state({
		fullName: '',
		address: '',
		ward: '',
		district: '',
		province: 'Hồ Chí Minh',
		phone: '',
	});
	let paymentMethod = $state<'vnpay'>('vnpay'); // Only VNPay now
	let acceptTerms = $state(false);

	// --- VALIDATION STATE ---
	let errors = $state<Record<string, string>>({});
	let touched = $state<Record<string, boolean>>({});
	let isSubmitting = $state(false);
	let showSuccessToast = $state(false);

	// --- DERIVED VALUES (SVELTE 5 RUNES) ---
	let itemCount = $derived(cartData.items.reduce((sum, item) => sum + item.quantity, 0));
	let subtotal = $derived(
		cartData.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
	);
	let qualifiesForFreeShipping = $derived(subtotal >= FREE_SHIPPING_THRESHOLD);
	let shipping = $derived(qualifiesForFreeShipping ? 0 : SHIPPING_FEE);
	let tax = $derived(subtotal * TAX_RATE);
	let total = $derived(subtotal + tax + shipping);
	let amountToFreeShipping = $derived(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal));

	// --- VALIDATION FUNCTIONS ---
	function validateEmail(email: string): string | null {
		if (!email) return 'Vui lòng nhập email';
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email) ? null : 'Email không hợp lệ';
	}

	function validatePhone(phone: string): string | null {
		if (!phone) return 'Vui lòng nhập số điện thoại';
		const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
		return phoneRegex.test(phone) ? null : 'Số điện thoại không hợp lệ';
	}

	function validateRequired(value: string, fieldName: string): string | null {
		return value.trim() ? null : `Vui lòng nhập ${fieldName}`;
	}

	function validateField(field: string) {
		touched[field] = true;

		switch (field) {
			case 'email':
				errors.email = validateEmail(contact.email) || '';
				break;
			case 'fullName':
				errors.fullName = validateRequired(shippingAddress.fullName, 'họ và tên') || '';
				break;
			case 'phone':
				errors.phone = validatePhone(shippingAddress.phone) || '';
				break;
			case 'address':
				errors.address = validateRequired(shippingAddress.address, 'địa chỉ') || '';
				break;
			case 'ward':
				errors.ward = validateRequired(shippingAddress.ward, 'phường/xã') || '';
				break;
			case 'district':
				errors.district = validateRequired(shippingAddress.district, 'quận/huyện') || '';
				break;
			case 'terms':
				errors.terms = acceptTerms ? '' : 'Vui lòng đồng ý với điều khoản';
				break;
		}
	}

	function validateAllFields(): boolean {
		validateField('email');
		validateField('fullName');
		validateField('phone');
		validateField('address');
		validateField('ward');
		validateField('district');
		validateField('terms');

		return !Object.values(errors).some((error) => error);
	}

	// --- FORM SUBMISSION ---
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!validateAllFields()) {
			// Scroll to first error
			const firstError = Object.keys(errors).find((key) => errors[key]);
			if (firstError) {
				document.getElementById(firstError)?.focus();
			}
			return;
		}

		isSubmitting = true;

		const payload = {
			contact,
			shippingAddress,
			paymentMethod,
			orderSummary: {
				items: cartData.items,
				subtotal,
				shipping,
				tax,
				total,
			},
		};

		console.log('Đơn hàng sẵn sàng:', payload);

		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 1500));

		isSubmitting = false;
		showSuccessToast = true;

		setTimeout(() => {
			showSuccessToast = false;
			// Redirect to payment gateway or confirmation
			alert('Chuyển đến trang thanh toán VNPay...');
		}, 2000);
	}

	// --- UTILITY FUNCTIONS ---
	function formatCurrency(value: number) {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
	}

	function getEstimatedDelivery() {
		const today = new Date();
		const minDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
		const maxDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);

		const formatDate = (date: Date) =>
			date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
		return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
	}
</script>

<svelte:head>
	<title>Thanh toán - Novus</title>
</svelte:head>

<!-- Success Toast -->
{#if showSuccessToast}
	<div class="fixed top-4 right-4 z-50" transition:fade>
		<div class="alert alert-success animate-bounce-in shadow-2xl">
			<CheckCircle size={20} />
			<span class="font-semibold">Đơn hàng đã được xác nhận!</span>
		</div>
	</div>
{/if}

<div class="from-base-200 via-base-100 to-base-200 min-h-screen bg-gradient-to-br font-sans">
	<!-- Enhanced Progress Indicator -->
	<div
		class="bg-base-100/80 border-base-300 sticky top-0 z-40 border-b py-5 shadow-lg backdrop-blur-xl"
	>
		<div class="container mx-auto max-w-6xl px-4">
			<ul class="steps steps-horizontal w-full">
				<li class="step step-primary" data-content="✓">
					<span class="font-semibold">Giỏ hàng</span>
				</li>
				<li class="step step-primary" data-content="●">
					<span class="text-primary font-semibold">Thanh toán</span>
				</li>
				<li class="step" data-content="3">
					<span class="font-medium opacity-50">Hoàn tất</span>
				</li>
			</ul>
		</div>
	</div>

	<main class="mx-auto max-w-6xl px-4 py-6 sm:py-8 lg:py-12">
		<!-- Enhanced Back Button -->
		<a
			href="/cart"
			class="btn btn-ghost btn-sm mb-6 -ml-2 gap-2 transition-all duration-300 hover:gap-3"
		>
			<ArrowLeft size={16} />
			Quay lại giỏ hàng
		</a>

		<!-- Enhanced Page Title -->
		<div class="mb-8">
			<div class="mb-2 flex items-center gap-3">
				<div class="from-primary to-secondary h-1 w-12 rounded-full bg-gradient-to-r"></div>
				<Shield size={24} class="text-primary" />
			</div>
			<h1
				class="font-montserrat bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
			>
				Thanh toán an toàn
			</h1>
			<p class="mt-3 flex items-center gap-2 text-base text-gray-600">
				<Lock size={16} class="text-success" />
				Thông tin của bạn được mã hóa và bảo mật tuyệt đối
			</p>
		</div>

		<!-- Enhanced Free Shipping Banner -->
		{#if qualifiesForFreeShipping}
			<div
				class="card from-success/10 via-success/5 to-success/10 border-success/30 shadow-success/10 mb-6 border-2 bg-gradient-to-r shadow-lg"
				transition:slide
			>
				<div class="card-body p-4">
					<div class="flex items-center gap-3">
						<div class="bg-success/20 rounded-full p-2">
							<CheckCircle size={24} class="text-success shrink-0" />
						</div>
						<p class="text-success flex items-center gap-2 text-base font-bold">
							🎉 Chúc mừng! Bạn được miễn phí vận chuyển
							<Award size={20} class="text-success" />
						</p>
					</div>
				</div>
			</div>
		{:else if amountToFreeShipping > 0}
			<div
				class="card from-primary/10 via-secondary/5 to-primary/10 border-primary/30 shadow-primary/10 mb-6 border-2 bg-gradient-to-r shadow-lg"
				transition:slide
			>
				<div class="card-body p-5">
					<div class="flex items-center gap-3">
						<div class="bg-primary/20 rounded-full p-2">
							<Truck size={24} class="text-primary shrink-0 animate-pulse" />
						</div>
						<div class="flex-1">
							<p class="mb-2 text-sm font-semibold text-gray-800">
								Mua thêm <span class="text-primary text-lg font-extrabold"
									>{formatCurrency(amountToFreeShipping)}</span
								> để được miễn phí vận chuyển
							</p>
							<div class="relative">
								<progress
									class="progress progress-primary h-3 w-full"
									value={subtotal}
									max={FREE_SHIPPING_THRESHOLD}
								></progress>
								<div
									class="absolute top-0 left-0 flex h-full w-full items-center justify-center text-[10px] font-bold text-white mix-blend-difference"
								>
									{Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="lg:grid lg:grid-cols-12 lg:gap-8">
			<!-- Left Column: Enhanced Form -->
			<div class="space-y-7 lg:col-span-7">
				<!-- Enhanced Contact Information -->
				<div
					class="card bg-base-100 border-base-300 border shadow-xl transition-all duration-300 hover:shadow-2xl"
				>
					<div class="card-body p-5 sm:p-7">
						<div class="mb-4 flex items-center gap-3">
							<div class="bg-primary/10 rounded-lg p-2.5">
								<span class="text-primary text-xl font-bold">1</span>
							</div>
							<h2 class="text-xl font-extrabold text-gray-900">Thông tin liên hệ</h2>
						</div>

						<div class="form-control">
							<label for="email" class="label">
								<span class="label-text text-base font-semibold text-gray-700"
									>Địa chỉ email <span class="text-error text-lg">*</span></span
								>
							</label>
							<div class="relative">
								<input
									type="email"
									id="email"
									class="input input-bordered focus:input-primary h-14 w-full pr-12 text-base transition-all focus:border-2"
									class:input-error={touched.email && errors.email}
									class:input-success={touched.email && !errors.email && contact.email}
									placeholder="example@email.com"
									bind:value={contact.email}
									onblur={() => validateField('email')}
									oninput={() => touched.email && validateField('email')}
								/>
								{#if touched.email && !errors.email && contact.email}
									<CheckCircle
										size={20}
										class="text-success absolute top-1/2 right-4 -translate-y-1/2"
									/>
								{/if}
							</div>
							{#if touched.email && errors.email}
								<label class="label" transition:slide={{ duration: 200 }}>
									<span
										class="label-text-alt text-error flex items-center gap-1.5 text-sm font-medium"
									>
										<AlertCircle size={14} />
										{errors.email}
									</span>
								</label>
							{:else}
								<label class="label">
									<span class="label-text-alt flex items-center gap-1.5 text-gray-500">
										<Lock size={12} />
										Email của bạn được bảo mật và không chia sẻ với bên thứ ba
									</span>
								</label>
							{/if}
						</div>
					</div>
				</div>

				<!-- Enhanced Shipping Address -->
				<div
					class="card bg-base-100 border-base-300 border shadow-xl transition-all duration-300 hover:shadow-2xl"
				>
					<div class="card-body p-5 sm:p-7">
						<div class="mb-5 flex items-center gap-3">
							<div class="bg-secondary/10 rounded-lg p-2.5">
								<span class="text-secondary text-xl font-bold">2</span>
							</div>
							<h2 class="text-xl font-extrabold text-gray-900">Địa chỉ giao hàng</h2>
						</div>

						<div class="space-y-5">
							<!-- Full Name -->
							<div class="form-control">
								<label for="fullName" class="label">
									<span class="label-text text-base font-semibold text-gray-700"
										>Họ và tên <span class="text-error text-lg">*</span></span
									>
								</label>
								<div class="relative">
									<input
										type="text"
										id="fullName"
										class="input input-bordered focus:input-primary h-14 w-full pr-12 text-base transition-all focus:border-2"
										class:input-error={touched.fullName && errors.fullName}
										class:input-success={touched.fullName &&
											!errors.fullName &&
											shippingAddress.fullName}
										placeholder="Nguyễn Văn A"
										bind:value={shippingAddress.fullName}
										onblur={() => validateField('fullName')}
										oninput={() => touched.fullName && validateField('fullName')}
									/>
									{#if touched.fullName && !errors.fullName && shippingAddress.fullName}
										<CheckCircle
											size={20}
											class="text-success absolute top-1/2 right-4 -translate-y-1/2"
										/>
									{/if}
								</div>
								{#if touched.fullName && errors.fullName}
									<label class="label" transition:slide={{ duration: 200 }}>
										<span
											class="label-text-alt text-error flex items-center gap-1.5 text-sm font-medium"
										>
											<AlertCircle size={14} />
											{errors.fullName}
										</span>
									</label>
								{/if}
							</div>

							<!-- Phone -->
							<div class="form-control">
								<label for="phone" class="label">
									<span class="label-text text-base font-semibold text-gray-700"
										>Số điện thoại <span class="text-error text-lg">*</span></span
									>
								</label>
								<div class="relative">
									<input
										type="tel"
										id="phone"
										class="input input-bordered focus:input-primary h-14 w-full pr-12 text-base transition-all focus:border-2"
										class:input-error={touched.phone && errors.phone}
										class:input-success={touched.phone && !errors.phone && shippingAddress.phone}
										placeholder="0912345678"
										bind:value={shippingAddress.phone}
										onblur={() => validateField('phone')}
										oninput={() => touched.phone && validateField('phone')}
									/>
									{#if touched.phone && !errors.phone && shippingAddress.phone}
										<CheckCircle
											size={20}
											class="text-success absolute top-1/2 right-4 -translate-y-1/2"
										/>
									{/if}
								</div>
								{#if touched.phone && errors.phone}
									<label class="label" transition:slide={{ duration: 200 }}>
										<span
											class="label-text-alt text-error flex items-center gap-1.5 text-sm font-medium"
										>
											<AlertCircle size={14} />
											{errors.phone}
										</span>
									</label>
								{/if}
							</div>

							<!-- Province/City -->
							<div class="form-control">
								<label for="province" class="label">
									<span class="label-text text-base font-semibold text-gray-700"
										>Tỉnh / Thành phố <span class="text-error text-lg">*</span></span
									>
								</label>
								<select
									id="province"
									class="select select-bordered focus:select-primary h-14 w-full text-base transition-all focus:border-2"
									bind:value={shippingAddress.province}
								>
									<option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
									<option value="Hà Nội">Hà Nội</option>
									<option value="Đà Nẵng">Đà Nẵng</option>
									<option value="Cần Thơ">Cần Thơ</option>
									<option value="Hải Phòng">Hải Phòng</option>
									<option value="Khác">Tỉnh khác</option>
								</select>
							</div>

							<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
								<!-- District -->
								<div class="form-control">
									<label for="district" class="label">
										<span class="label-text text-base font-semibold text-gray-700"
											>Quận / Huyện <span class="text-error text-lg">*</span></span
										>
									</label>
									<div class="relative">
										<input
											type="text"
											id="district"
											class="input input-bordered focus:input-primary h-14 w-full pr-12 text-base transition-all focus:border-2"
											class:input-error={touched.district && errors.district}
											class:input-success={touched.district &&
												!errors.district &&
												shippingAddress.district}
											placeholder="Quận 1"
											bind:value={shippingAddress.district}
											onblur={() => validateField('district')}
											oninput={() => touched.district && validateField('district')}
										/>
										{#if touched.district && !errors.district && shippingAddress.district}
											<CheckCircle
												size={20}
												class="text-success absolute top-1/2 right-4 -translate-y-1/2"
											/>
										{/if}
									</div>
									{#if touched.district && errors.district}
										<label class="label" transition:slide={{ duration: 200 }}>
											<span
												class="label-text-alt text-error flex items-center gap-1.5 text-sm font-medium"
											>
												<AlertCircle size={14} />
												{errors.district}
											</span>
										</label>
									{/if}
								</div>

								<!-- Ward -->
								<div class="form-control">
									<label for="ward" class="label">
										<span class="label-text text-base font-semibold text-gray-700"
											>Phường / Xã <span class="text-error text-lg">*</span></span
										>
									</label>
									<div class="relative">
										<input
											type="text"
											id="ward"
											class="input input-bordered focus:input-primary h-14 w-full pr-12 text-base transition-all focus:border-2"
											class:input-error={touched.ward && errors.ward}
											class:input-success={touched.ward && !errors.ward && shippingAddress.ward}
											placeholder="Phường Bến Nghé"
											bind:value={shippingAddress.ward}
											onblur={() => validateField('ward')}
											oninput={() => touched.ward && validateField('ward')}
										/>
										{#if touched.ward && !errors.ward && shippingAddress.ward}
											<CheckCircle
												size={20}
												class="text-success absolute top-1/2 right-4 -translate-y-1/2"
											/>
										{/if}
									</div>
									{#if touched.ward && errors.ward}
										<label class="label" transition:slide={{ duration: 200 }}>
											<span
												class="label-text-alt text-error flex items-center gap-1.5 text-sm font-medium"
											>
												<AlertCircle size={14} />
												{errors.ward}
											</span>
										</label>
									{/if}
								</div>
							</div>

							<!-- Address -->
							<div class="form-control">
								<label for="address" class="label">
									<span class="label-text text-base font-semibold text-gray-700"
										>Địa chỉ cụ thể <span class="text-error text-lg">*</span></span
									>
								</label>
								<textarea
									id="address"
									class="textarea textarea-bordered focus:textarea-primary min-h-24 w-full text-base transition-all focus:border-2"
									class:textarea-error={touched.address && errors.address}
									class:textarea-success={touched.address &&
										!errors.address &&
										shippingAddress.address}
									placeholder="Số nhà, tên đường..."
									bind:value={shippingAddress.address}
									onblur={() => validateField('address')}
									oninput={() => touched.address && validateField('address')}
								></textarea>
								{#if touched.address && errors.address}
									<label class="label" transition:slide={{ duration: 200 }}>
										<span
											class="label-text-alt text-error flex items-center gap-1.5 text-sm font-medium"
										>
											<AlertCircle size={14} />
											{errors.address}
										</span>
									</label>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Enhanced Payment Method -->
				<div
					class="card bg-base-100 border-base-300 border shadow-xl transition-all duration-300 hover:shadow-2xl"
				>
					<div class="card-body p-5 sm:p-7">
						<div class="mb-5 flex items-center gap-3">
							<div class="bg-accent/10 rounded-lg p-2.5">
								<span class="text-accent text-xl font-bold">3</span>
							</div>
							<h2 class="text-xl font-extrabold text-gray-900">Phương thức thanh toán</h2>
						</div>

						<!-- Enhanced VNPay Payment Option -->
						<div>
							<label
								class="border-primary ring-primary from-primary/10 via-primary/5 to-primary/10 shadow-primary/20 relative flex cursor-pointer items-center gap-4 rounded-2xl border-3 bg-gradient-to-br p-5 shadow-lg ring-4 ring-offset-2 transition-all hover:scale-[1.02] sm:p-7"
							>
								<input
									type="radio"
									name="payment-type"
									value="vnpay"
									class="radio radio-primary radio-lg"
									bind:group={paymentMethod}
									checked
									disabled
								/>
								<div class="flex-1">
									<div class="mb-2 flex items-center gap-3">
										<span class="text-lg font-extrabold text-gray-900 sm:text-xl"
											>Thanh toán qua VNPay</span
										>
										<div class="flex gap-1.5">
											<span class="badge badge-success badge-md gap-1 font-semibold shadow-sm">
												<Shield size={12} />
												Bảo mật
											</span>
											<span class="badge badge-primary badge-md font-semibold shadow-sm"
												>Phổ biến</span
											>
										</div>
									</div>
									<p class="text-sm font-medium text-gray-700">
										Hỗ trợ: Thẻ ATM nội địa, Visa, MasterCard, JCB, QR Pay
									</p>
								</div>
								<CreditCard class="text-primary h-10 w-10 shrink-0 sm:h-12 sm:w-12" />
							</label>

							<!-- Enhanced Trust Badges -->
							<div
								class="from-base-200 to-base-300 border-base-300 mt-5 space-y-3 rounded-xl border bg-gradient-to-br p-5 shadow-inner"
							>
								<div
									class="hover:bg-success/5 flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-gray-700 transition-colors"
								>
									<div class="bg-success/20 rounded-lg p-2">
										<Shield size={18} class="text-success shrink-0" />
									</div>
									<span>Mã hóa SSL 256-bit - Bảo mật tuyệt đối</span>
								</div>
								<div
									class="hover:bg-info/5 flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-gray-700 transition-colors"
								>
									<div class="bg-info/20 rounded-lg p-2">
										<CheckCircle size={18} class="text-info shrink-0" />
									</div>
									<span>Thanh toán được xử lý bởi VNPay - Đối tác uy tín</span>
								</div>
								<div
									class="hover:bg-warning/5 flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-gray-700 transition-colors"
								>
									<div class="bg-warning/20 rounded-lg p-2">
										<Package size={18} class="text-warning shrink-0" />
									</div>
									<span>Hoàn tiền 100% nếu gặp vấn đề</span>
								</div>
							</div>
						</div>

						<!-- Enhanced Terms & Conditions -->
						<div
							class="border-base-300 hover:border-primary/30 mt-7 rounded-xl border-2 border-dashed p-4 transition-colors"
						>
							<label class="label cursor-pointer justify-start gap-4">
								<input
									type="checkbox"
									id="terms"
									class="checkbox checkbox-primary checkbox-lg"
									class:checkbox-error={touched.terms && errors.terms}
									bind:checked={acceptTerms}
									onchange={() => validateField('terms')}
								/>
								<span class="label-text text-sm font-medium">
									Tôi đồng ý với
									<a href="/terms" class="link link-primary hover:link-secondary font-bold"
										>Điều khoản và chính sách</a
									>
									của Novus
									<span class="text-error text-lg">*</span>
								</span>
							</label>
							{#if touched.terms && errors.terms}
								<div
									class="text-error mt-2 ml-14 flex items-center gap-2 text-sm font-semibold"
									transition:slide={{ duration: 200 }}
								>
									<AlertCircle size={14} />
									{errors.terms}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Right Column: Enhanced Order Summary - Sticky on Desktop -->
			<div class="mt-7 lg:col-span-5 lg:mt-0">
				<div class="card bg-base-100 border-base-300 border-2 shadow-2xl lg:sticky lg:top-28">
					<div class="card-body p-5 sm:p-7">
						<h2 class="card-title mb-5 flex items-center gap-3 text-xl font-extrabold">
							<div class="bg-primary/10 rounded-lg p-2">
								<ShoppingBag class="text-primary h-6 w-6" />
							</div>
							<span>Tóm tắt đơn hàng</span>
						</h2>

						<!-- Enhanced Cart Items -->
						<ul role="list" class="divide-base-300 divide-y">
							{#each cartData.items as item}
								<li
									class="hover:bg-base-200 -mx-2 flex items-start gap-4 rounded-lg px-2 py-4 transition-colors"
								>
									<div
										class="border-base-300 group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 shadow-md"
									>
										<img
											src={item.imageUrl}
											alt={item.name}
											class="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-110"
										/>
										<span
											class="badge badge-primary badge-lg border-base-100 absolute -top-2 -right-2 border-2 font-bold shadow-lg"
										>
											{item.quantity}
										</span>
									</div>
									<div class="min-w-0 flex-1">
										<h3 class="line-clamp-2 text-base font-bold text-gray-900">{item.name}</h3>
										<p
											class="bg-base-200 mt-1.5 inline-block rounded px-2 py-1 text-xs font-semibold text-gray-500"
										>
											Số lượng: {item.quantity}
										</p>
									</div>
									<p class="text-primary text-base font-extrabold">
										{formatCurrency(item.price * item.quantity)}
									</p>
								</li>
							{/each}
						</ul>

						<!-- Enhanced Price Breakdown -->
						<div class="border-base-300 mt-5 space-y-4 border-t-2 border-dashed pt-5 text-base">
							<div class="flex justify-between text-gray-700">
								<span class="font-medium">Tạm tính ({itemCount} sản phẩm)</span>
								<span class="font-bold">{formatCurrency(subtotal)}</span>
							</div>

							<div class="flex justify-between text-gray-700">
								<span class="flex items-center gap-2 font-medium">
									Phí vận chuyển
									{#if qualifiesForFreeShipping}
										<span class="badge badge-success badge-sm gap-1 font-bold">
											<CheckCircle size={12} />
											Miễn phí
										</span>
									{/if}
								</span>
								<span
									class="font-bold"
									class:line-through={qualifiesForFreeShipping}
									class:text-gray-400={qualifiesForFreeShipping}
								>
									{qualifiesForFreeShipping
										? formatCurrency(SHIPPING_FEE)
										: formatCurrency(shipping)}
								</span>
							</div>

							<div class="flex justify-between text-gray-700">
								<span class="font-medium">Thuế VAT (10%)</span>
								<span class="font-bold">{formatCurrency(tax)}</span>
							</div>

							<div class="divider my-2"></div>

							<div
								class="from-primary/10 to-secondary/10 border-primary/20 flex items-center justify-between rounded-xl border-2 bg-gradient-to-r p-4 text-lg"
							>
								<span class="font-extrabold text-gray-900">Tổng cộng</span>
								<span class="text-primary text-2xl font-extrabold sm:text-3xl">
									{formatCurrency(total)}
								</span>
							</div>
						</div>

						<!-- Enhanced Estimated Delivery -->
						<div
							class="from-info/10 to-info/5 border-info/20 mt-5 flex items-center gap-3 rounded-xl border bg-gradient-to-r p-4"
						>
							<div class="bg-info/20 rounded-lg p-2">
								<Clock size={20} class="text-info shrink-0" />
							</div>
							<div class="text-sm font-medium">
								<span class="block text-gray-600">Dự kiến giao hàng:</span>
								<span class="text-base font-extrabold text-gray-900">{getEstimatedDelivery()}</span>
							</div>
						</div>

						<!-- Enhanced Desktop Submit Button -->
						<button
							type="submit"
							class="btn btn-primary btn-lg shadow-primary/30 mt-6 hidden w-full gap-3 text-base font-bold shadow-2xl transition-all hover:scale-[1.02] lg:flex"
							disabled={isSubmitting}
						>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-md"></span>
								Đang xử lý...
							{:else}
								<Lock size={20} />
								Đặt hàng ngay
								<CreditCard size={20} />
							{/if}
						</button>

						<!-- Trust Badge Below Button -->
						<div
							class="mt-4 hidden items-center justify-center gap-2 text-xs text-gray-500 lg:flex"
						>
							<Shield size={14} class="text-success" />
							<span>Thanh toán được bảo vệ bởi mã hóa SSL</span>
						</div>
					</div>
				</div>
			</div>
		</form>
	</main>

	<!-- Enhanced Mobile Sticky Bottom Bar -->
	<div
		class="btm-nav btm-nav-lg border-base-300 bg-base-100/95 z-50 h-24 border-t-2 shadow-2xl backdrop-blur-xl lg:hidden"
	>
		<div class="flex w-full items-center justify-between px-5">
			<div class="flex flex-col">
				<span class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Tổng cộng</span>
				<span class="text-primary text-xl font-extrabold">{formatCurrency(total)}</span>
				<span class="flex items-center gap-1 text-[10px] text-gray-400">
					<Lock size={10} />
					Thanh toán bảo mật
				</span>
			</div>
			<button
				type="submit"
				class="btn btn-primary btn-lg gap-2 px-8 font-bold shadow-lg transition-all hover:scale-105"
				disabled={isSubmitting}
				onclick={handleSubmit}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
					<span class="hidden sm:inline">Đang xử lý</span>
				{:else}
					<CreditCard size={20} />
					Đặt hàng
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	/* Enhanced mobile padding */
	@media (max-width: 1023px) {
		main {
			padding-bottom: 8rem;
		}
	}

	/* Enhanced transitions for validation states */
	.input,
	.textarea,
	.select,
	.checkbox {
		transition: all 0.3s ease;
	}

	/* Enhanced focus states with glow effect */
	.input:focus,
	.textarea:focus,
	.select:focus {
		outline: none;
		border-color: oklch(var(--p));
		box-shadow:
			0 0 0 4px oklch(var(--p) / 0.15),
			0 0 20px oklch(var(--p) / 0.2);
		transform: translateY(-1px);
	}

	/* Success state glow */
	.input-success,
	.textarea-success {
		border-color: oklch(var(--su));
		box-shadow: 0 0 0 3px oklch(var(--su) / 0.1);
	}

	/* Error state glow */
	.input-error,
	.textarea-error {
		box-shadow: 0 0 0 3px oklch(var(--er) / 0.1);
	}

	/* Animate bounce in for toast */
	@keyframes bounce-in {
		0% {
			transform: scale(0.8) translateY(-20px);
			opacity: 0;
		}
		50% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	.animate-bounce-in {
		animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
	}

	/* Enhanced hover effects */
	.card:hover {
		transform: translateY(-2px);
	}

	/* Progress bar animation */
	.progress::-webkit-progress-value {
		transition: width 0.5s ease;
	}

	/* Custom scrollbar for better aesthetics */
	::-webkit-scrollbar {
		width: 10px;
	}

	::-webkit-scrollbar-track {
		background: oklch(var(--b2));
	}

	::-webkit-scrollbar-thumb {
		background: oklch(var(--bc) / 0.3);
		border-radius: 5px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: oklch(var(--p));
	}
</style>
