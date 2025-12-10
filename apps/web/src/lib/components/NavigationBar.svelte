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
	} from 'lucide-svelte';
	import { page } from '$app/state';
	import { cart } from '$lib/stores/cart.svelte';

	let { user = null } = $props();
	let currentUser = $derived(user || page.data.user);
	let currentPath = $derived(page.url.pathname);

	let cartItems = $derived(cart.items);

	let cartCount = $derived(cartItems.reduce((sum, item) => sum + item.quantity, 0));

	let cartSubtotal = $derived(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));

	const categories = [
		{ label: 'Tranh', href: '/c/tranh' },
		{ label: 'Tượng', href: '/c/tuong' },
		{ label: 'Cây', href: '/c/cay' },
		{ label: 'Đồ vật phong thuỷ', href: '/c/do-vat-phong-thuy' },
	];
</script>

<div
	class="navbar border-base-200/50 bg-base-100/95 fixed inset-x-0 top-0 z-50 h-14 border-b px-3 shadow-sm backdrop-blur transition-all md:px-6"
>
	<!-- Left: mobile menu + brand -->
	<div class="navbar-start gap-1 md:gap-3">
		<!-- Mobile categories dropdown -->
		<div class="dropdown md:hidden">
			<button
				type="button"
				tabindex="0"
				class="btn btn-ghost btn-circle btn-sm hover:bg-base-200 h-9 w-9"
				aria-label="Mở danh mục sản phẩm"
			>
				<Menu class="h-4 w-4" />
			</button>

			<ul
				tabindex="-1"
				class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-48 p-2 shadow"
			>
				{#each categories as category}
					<li>
						<a href={category.href} class:active={currentPath.startsWith(category.href)}>
							{category.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Brand -->
		<a
			href="/"
			class="group flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 md:gap-3"
			style="view-transition-name: brand-logo"
			aria-label="Novus Home"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="32"
				height="32"
				viewBox="0 0 100 100"
				class="h-8 w-8 transition-transform group-hover:rotate-12 md:h-9 md:w-9"
			>
				<g fill-rule="evenodd">
					<path fill="#282828" d="M46 12 15 88q-30-38 31-76Z" />
					<path fill="#825F41" d="m54 12 31 76q30-38-31-76Z" />
				</g>
			</svg>
			<span class="font-montserrat text-base-content text-lg font-bold tracking-tight md:text-xl">
				Novus
			</span>
		</a>
	</div>

	<!-- Center: desktop categories -->
	<div class="navbar-center hidden md:flex">
		<ul class="menu menu-horizontal gap-1 px-1 text-sm">
			{#each categories as category}
				<li>
					<a href={category.href} class:active={currentPath.startsWith(category.href)}>
						{category.label}
					</a>
				</li>
			{/each}
		</ul>
	</div>

	<!-- Right side -->
	<div class="navbar-end gap-2 md:gap-3">
		<!-- Cart dropdown -->
		<div class="dropdown dropdown-end">
			<button
				type="button"
				tabindex="0"
				class="btn btn-ghost btn-circle btn-sm hover:bg-base-200 h-9 w-9 transition-colors"
				aria-label="Giỏ hàng"
			>
				<div class="indicator">
					<ShoppingCart class="h-4 w-4 md:h-5 md:w-5" />
					{#if cartCount > 0}
						<span
							class="badge badge-primary badge-xs indicator-item h-4 min-w-[16px] border-none px-1 text-[10px] font-bold"
						>
							{cartCount > 99 ? '99+' : cartCount}
						</span>
					{/if}
				</div>
			</button>

			<div
				tabindex="-1"
				class="card card-compact dropdown-content bg-base-100 ring-base-content/5 z-[1] mt-3 w-72 shadow-xl ring-1 md:w-80"
			>
				<div class="card-body p-4">
					<div class="border-base-200 flex items-baseline justify-between border-b pb-2">
						<span class="text-base font-bold">
							{cartCount}
							{cartCount === 1 ? 'Sản phẩm' : 'Sản phẩm'}
						</span>
						{#if cartCount > 0}
							<span class="text-base-content/60 text-xs">Tạm tính</span>
						{/if}
					</div>

					{#if cartCount > 0}
						<div class="py-2">
							<span class="font-montserrat text-primary text-lg font-bold">
								{new Intl.NumberFormat('vi-VN', {
									style: 'currency',
									currency: 'VND',
									minimumFractionDigits: 0,
								}).format(cartSubtotal)}
							</span>
						</div>
						<div class="card-actions mt-2">
							<a href="/cart" class="btn btn-primary btn-sm w-full font-bold text-white shadow-md">
								Xem giỏ hàng
							</a>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-6 text-center">
							<ShoppingCart class="text-base-content/20 mb-2 h-10 w-10" />
							<p class="text-base-content/60 text-sm">Giỏ hàng trống</p>
							<a href="/" class="btn btn-ghost btn-xs text-primary mt-2">Mua sắm ngay</a>
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
					class="btn btn-ghost btn-sm hover:bg-base-200 h-9 gap-2 rounded-full px-2 normal-case transition-colors"
				>
					<div
						class="bg-neutral text-neutral-content flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
					>
						{currentUser.first_name[0]}
					</div>
					<div class="hidden flex-col items-start text-xs md:flex">
						<span class="max-w-[10ch] truncate leading-none font-semibold">
							{currentUser.first_name}
						</span>
					</div>
					<ChevronDown class="h-3 w-3 opacity-50" />
				</button>

				<ul
					tabindex="-1"
					class="menu menu-sm dropdown-content bg-base-100 ring-base-content/5 z-[1] mt-3 w-60 rounded-xl p-2 shadow-xl ring-1"
				>
					<li class="menu-title px-4 py-2 opacity-100">
						<div class="flex flex-col gap-0.5">
							<span class="text-base-content font-bold">
								{currentUser.first_name}
								{currentUser.last_name}
							</span>
							<span class="text-base-content/60 text-xs font-normal">
								@{currentUser.username}
							</span>
							{#if ['manager', 'operator'].includes(currentUser.role)}
								<span
									class="bg-primary/10 text-primary mt-1 w-fit rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
								>
									{currentUser.role}
								</span>
							{/if}
						</div>
					</li>

					<div class="divider my-1"></div>

					<li>
						<a href="/profile" class="gap-3 py-2">
							<User class="h-4 w-4 opacity-70" />
							<span>Hồ sơ cá nhân</span>
						</a>
					</li>
					<li>
						<a href="/orders" class="gap-3 py-2">
							<Package class="h-4 w-4 opacity-70" />
							<span>Đơn mua hàng</span>
						</a>
					</li>
					<li>
						<a href="/bazi" class="gap-3 py-2">
							<Icon iconNode={yinYang} class="h-4 w-4 opacity-70" />
							<span>Lá số Bát tự</span>
						</a>
					</li>

					{#if ['manager', 'operator'].includes(currentUser.role)}
						<div class="divider my-1"></div>
						<li>
							<a href="/manage" class="text-secondary gap-3 py-2 font-medium">
								<Settings class="h-4 w-4" />
								<span>Quản lý hệ thống</span>
							</a>
						</li>
					{/if}

					<div class="divider my-1"></div>

					<li>
						<form action="/login?/logout" method="POST" class="w-full p-0">
							<button
								type="submit"
								class="text-error hover:bg-error/10 flex w-full gap-3 px-4 py-2"
							>
								<LogOut class="h-4 w-4" />
								<span>Đăng xuất</span>
							</button>
						</form>
					</li>
				</ul>
			</div>
		{:else}
			<!-- Mobile: user icon dropdown -->
			<div class="dropdown dropdown-end md:hidden">
				<button
					type="button"
					tabindex="0"
					class="btn btn-ghost btn-circle btn-sm hover:bg-base-200 h-9 w-9"
					aria-label="Tài khoản"
				>
					<User class="h-4 w-4" />
				</button>

				<ul
					tabindex="-1"
					class="menu menu-md dropdown-content bg-base-100 rounded-box ring-base-content/10 z-[1] mt-3 w-52 p-3 shadow-xl ring-1"
				>
					<!-- Header -->
					<li class="menu-title text-base-content/80 px-2 py-2">
						<span>Tài khoản</span>
					</li>

					<li>
						<a href="/login" class="justify-start gap-3 px-4 py-3">
							<User class="h-5 w-5 opacity-70" />
							<span class="font-medium">Đăng nhập</span>
						</a>
					</li>
					<li>
						<a href="/register" class="justify-start gap-3 px-4 py-3">
							<UserPlus class="h-5 w-5 opacity-70" />
							<span class="font-bold">Đăng ký</span>
						</a>
					</li>
				</ul>
			</div>

			<!-- Desktop: full buttons -->
			<div class="hidden items-center gap-2 md:flex">
				<a href="/login" class="btn btn-ghost btn-sm h-9 min-h-[36px] font-medium"> Đăng nhập </a>
				<a
					href="/register"
					class="btn btn-primary btn-sm h-9 min-h-[36px] px-4 font-bold text-white shadow-md"
				>
					Đăng ký
				</a>
			</div>
		{/if}
	</div>
</div>
