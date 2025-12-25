<script lang="ts">
	import { yinYang } from '@lucide/lab';
	import {
		ChevronDown,
		Icon,
		LogOut,
		Package,
		Settings,
		ShoppingCart,
		User,
		Menu,
		UserPlus,
		Search,
	} from 'lucide-svelte';
	import { page } from '$app/state';
	import { cart } from '$lib/stores/cart.svelte';
	import SearchBar from './SearchBar.svelte';

	let { user = null } = $props();
	let currentUser = $derived(user || page.data.user);
	let currentPath = $derived(page.url.pathname);

	// Scroll State
	let y = $state(0);

	// Derived States
	let isHomePage = $derived(page.url.pathname === '/');

	// Transparent ONLY if on Homepage AND at the very top
	let isTransparent = $derived(isHomePage && y < 20);

	let cartItems = $derived(cart.items);
	let cartCount = $derived(cartItems.reduce((sum, item) => sum + item.quantity, 0));
	let cartSubtotal = $derived(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));

	const categories = [
		{ label: 'Tranh', href: '/c/tranh' },
		{ label: 'Tượng', href: '/c/tuong' },
		{ label: 'Cây', href: '/c/cay' },
		{ label: 'Đồ vật phong thuỷ', href: '/c/do-vat-phong-thuy' },
		{ label: 'Tư vấn AI', href: '/ai-consult' },
	];
</script>

<svelte:window bind:scrollY={y} />

<div
	class="navbar fixed inset-x-0 top-0 z-50 h-16 w-full border-b px-2 transition-all duration-500 ease-in-out md:px-6
    {isTransparent
		? 'border-transparent bg-transparent text-white'
		: 'border-base-200/50 bg-base-100/70 text-base-content shadow-sm backdrop-blur-md'}
    {!isHomePage ? 'sticky' : ''}"
>
	<!-- Gradient overlay ONLY for transparent mode to ensure text readability -->
	<div
		class="absolute inset-0 -z-10 transition-opacity duration-500 {isTransparent
			? 'bg-gradient-to-b from-black/40 to-transparent opacity-100'
			: 'opacity-0'}"
	></div>

	<!-- Left: mobile menu + brand -->
	<div class="navbar-start gap-2 md:gap-4">
		<!-- Mobile categories dropdown -->
		<div class="dropdown dropdown-bottom md:hidden">
			<button
				type="button"
				tabindex="0"
				class="btn btn-ghost btn-circle btn-sm h-10 w-10 transition-colors hover:bg-white/10"
				aria-label="Mở danh mục sản phẩm"
			>
				<Menu class="h-5 w-5" />
			</button>

			<ul
				tabindex="-1"
				class="menu menu-md dropdown-content bg-base-100 text-base-content rounded-box border-base-200 z-[1] mt-4 w-56 p-2 shadow-lg ring-1 ring-black/5"
			>
				{#each categories as category}
					<li>
						<a
							href={category.href}
							class:active={currentPath.startsWith(category.href)}
							class="rounded-lg font-medium"
						>
							{category.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Brand -->
		<a
			href="/"
			class="group flex items-center gap-2.5 transition-opacity hover:opacity-90 active:scale-95 md:gap-3"
			aria-label="Novus Home"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="32"
				height="32"
				viewBox="0 0 100 100"
				class="h-9 w-9 transition-transform duration-500 ease-out group-hover:rotate-[10deg] md:h-10 md:w-10"
			>
				<g fill-rule="evenodd">
					<!-- Dynamic fill for Logo: White on transparent, Black on glass -->
					<path
						class="transition-colors duration-500"
						fill={isTransparent ? '#FFFFFF' : '#282828'}
						d="M46 12 15 88q-30-38 31-76Z"
					/>
					<path
						class="transition-colors duration-500"
						fill={isTransparent ? '#E0E0E0' : '#825F41'}
						d="m54 12 31 76q30-38-31-76Z"
					/>
				</g>
			</svg>
			<span class="font-montserrat text-xl font-bold tracking-tight md:text-2xl"> Novus </span>
		</a>
	</div>

	<!-- Center: desktop categories + search -->
	<div class="navbar-center hidden gap-2 lg:flex">
		<!-- Navigation Pills -->
		<nav
			class="flex items-center gap-1 rounded-full p-1 transition-colors duration-300 {isTransparent
				? 'bg-white/10 backdrop-blur-sm'
				: 'bg-base-200/50'}"
		>
			{#each categories as category}
				{@const isActive = currentPath.startsWith(category.href)}
				<a
					href={category.href}
					class="btn btn-sm rounded-full border-none px-4 text-sm font-medium transition-all
                    {isActive
						? 'bg-primary hover:bg-primary text-white shadow-sm'
						: `btn-ghost hover:bg-white/20 ${isTransparent ? 'text-white' : 'text-base-content/80 hover:bg-base-200'}`}"
				>
					{category.label}
				</a>
			{/each}
		</nav>

		<!-- Desktop Search -->
		<div class="ml-4">
			<!-- Pass transparent prop to SearchBar if needed, or wrap it -->
			<div class={isTransparent ? 'text-gray-800' : ''}>
				<SearchBar />
			</div>
		</div>
	</div>

	<!-- Right side -->
	<div class="navbar-end gap-1.5 md:gap-3">
		<!-- Mobile Search Button -->
		<a
			href="/search"
			class="btn btn-ghost btn-circle btn-sm h-10 w-10 hover:bg-white/10 md:hidden"
			aria-label="Tìm kiếm"
		>
			<Search class="h-5 w-5" />
		</a>

		<!-- Cart dropdown -->
		<div class="dropdown dropdown-end">
			<button
				type="button"
				tabindex="0"
				class="btn btn-ghost btn-circle btn-sm h-10 w-10 transition-colors hover:bg-white/10"
				aria-label="Giỏ hàng"
			>
				<div class="indicator">
					<ShoppingCart class="h-5 w-5 transition-transform active:scale-90" />
					{#if cartCount > 0}
						<span
							class="badge badge-primary badge-xs indicator-item h-4 min-w-[18px] border-none px-1 text-[10px] font-bold shadow-sm"
						>
							{cartCount > 99 ? '99+' : cartCount}
						</span>
					{/if}
				</div>
			</button>

			<div
				tabindex="-1"
				class="card card-compact dropdown-content bg-base-100 text-base-content border-base-200 z-[1] mt-4 w-80 border shadow-lg ring-1 ring-black/5 md:w-96"
			>
				<div class="card-body gap-4 p-5">
					<div class="border-base-200 flex items-baseline justify-between border-b pb-3">
						<span class="text-base font-bold">
							Giỏ hàng <span class="text-primary font-normal">({cartCount})</span>
						</span>
					</div>

					{#if cartCount > 0}
						<div class="flex items-center justify-between py-1">
							<span class="text-base-content/70 text-sm">Tổng cộng:</span>
							<span class="font-montserrat text-primary text-xl font-bold">
								{new Intl.NumberFormat('vi-VN', {
									style: 'currency',
									currency: 'VND',
									minimumFractionDigits: 0,
								}).format(cartSubtotal)}
							</span>
						</div>
						<div class="card-actions mt-1">
							<a
								href="/cart"
								class="btn btn-primary btn-md w-full font-bold text-white shadow-md hover:brightness-110"
							>
								Xem giỏ hàng
							</a>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<ShoppingCart class="text-base-content/30 mb-2 h-10 w-10" />
							<p class="text-base-content/60 font-medium">Giỏ hàng trống</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Auth -->
		{#if currentUser}
			<div class="dropdown dropdown-end">
				<button
					type="button"
					tabindex="0"
					class="btn btn-ghost btn-sm h-10 gap-2 rounded-full border px-1.5 pr-3 pl-1.5 transition-all
                    {isTransparent
						? 'border-white/30 hover:bg-white/20'
						: 'border-base-200 hover:bg-base-200/60'}"
				>
					<div
						class="bg-neutral text-neutral-content ring-base-100 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-2"
					>
						{currentUser.first_name[0]}
					</div>
					<div class="hidden flex-col items-start text-xs md:flex">
						<span class="max-w-[12ch] truncate leading-none font-semibold">
							{currentUser.first_name}
						</span>
					</div>
					<ChevronDown class="ml-1 h-3 w-3 opacity-60" />
				</button>

				<!-- Dropdown always uses standard theme colors (white bg) -->
				<ul
					tabindex="-1"
					class="menu menu-sm dropdown-content bg-base-100 text-base-content rounded-box border-base-200 z-[1] mt-4 w-64 border p-2 shadow-lg ring-1 ring-black/5"
				>
					<li class="menu-title px-4 py-3 opacity-100">
						<div class="flex flex-col gap-1">
							<span class="text-base-content text-base font-bold">
								{currentUser.first_name}
								{currentUser.last_name}
							</span>
							<span class="text-base-content/50 font-mono text-xs font-normal">
								@{currentUser.username}
							</span>
						</div>
					</li>
					<div class="divider my-0"></div>
					<li class="p-1">
						<a href="/profile" class="gap-3 rounded-lg py-2.5 font-medium">
							<User class="h-4 w-4 opacity-70" /> <span>Hồ sơ cá nhân</span>
						</a>
					</li>
					<li class="p-1">
						<a href="/orders" class="gap-3 rounded-lg py-2.5 font-medium">
							<Package class="h-4 w-4 opacity-70" /> <span>Đơn mua hàng</span>
						</a>
					</li>
					<div class="divider my-0"></div>
					<li class="p-1">
						<form action="/login?/logout" method="POST" class="w-full p-0">
							<button
								type="submit"
								class="text-error hover:bg-error/10 hover:text-error flex w-full gap-3 rounded-lg px-4 py-2.5 font-medium"
							>
								<LogOut class="h-4 w-4" /> <span>Đăng xuất</span>
							</button>
						</form>
					</li>
				</ul>
			</div>
		{:else}
			<!-- Desktop: Login Buttons -->
			<div class="hidden items-center gap-3 md:flex">
				<a
					href="/login"
					class="btn btn-ghost btn-sm h-10 min-h-[40px] px-4 font-medium hover:bg-white/10"
				>
					Đăng nhập
				</a>
				<a
					href="/register"
					class="btn btn-primary btn-sm h-10 min-h-[40px] rounded-full px-6 font-bold text-white shadow-md transition-transform hover:scale-105"
				>
					Đăng ký
				</a>
			</div>
		{/if}
	</div>
</div>
