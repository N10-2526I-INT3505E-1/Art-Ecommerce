<script lang="ts">
	
	import { yinYang } from '@lucide/lab';
	import { ChevronDown, Icon, LogOut, Package, Settings, ShoppingCart, User } from 'lucide-svelte';
import { page } from '$app/state';

	let { user = null } = $props();
	let currentUser = $derived(user || page.data.user);

	// Mock cart count - replace with real cart state
	let cartCount = $state(8);
	let cartSubtotal = $state(1200000);
</script>

<div
	class="navbar border-base-300/50 bg-base-100/95 fixed inset-x-0 top-0 z-40 border-b px-3 shadow-sm backdrop-blur md:px-5 lg:px-6"
>
	<!-- Brand -->
	<div class="navbar-start">
		<a
			href="/"
			class="flex items-center gap-2 transition-transform hover:scale-105 md:gap-3"
			style="view-transition-name: brand-logo"
			aria-label="Novus Home"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="32"
				height="32"
				viewBox="0 0 100 100"
				class="md:h-10 md:w-10"
			>
				<g fill-rule="evenodd">
					<path fill="#282828" d="M46 12 15 88q-30-38 31-76Z" />
					<path fill="#825F41" d="m54 12 31 76q30-38-31-76Z" />
				</g>
			</svg>
			<span class="text-lg font-bold md:text-xl lg:text-2xl">Novus</span>
		</a>
	</div>

	<!-- Right side: cart + auth -->
	<div class="navbar-end gap-1.5 md:gap-3">
		<!-- Cart dropdown -->
		<div class="dropdown dropdown-end">
			<button
				type="button"
				tabindex="0"
				class="btn btn-ghost btn-circle h-11 w-11 md:h-10 md:w-10"
				aria-label="Shopping cart"
			>
				<div class="indicator">
					<ShoppingCart class="h-5 w-5" />
					{#if cartCount > 0}
						<span class="badge badge-primary badge-sm indicator-item font-semibold">
							{cartCount > 99 ? '99+' : cartCount}
						</span>
					{/if}
				</div>
			</button>

			<div
				tabindex="-1"
				class="card card-compact dropdown-content bg-base-100 z-1 mt-3 w-72 shadow-lg md:w-80"
			>
				<div class="card-body">
					<div class="flex items-baseline justify-between">
						<span class="text-base font-bold md:text-lg">
							{cartCount}
							{cartCount === 1 ? 'Item' : 'Items'}
						</span>
						{#if cartCount > 0}
							<span class="text-base-content/70 text-xs"> Subtotal </span>
						{/if}
					</div>

					{#if cartCount > 0}
						<span class="text-primary text-lg font-semibold md:text-xl">
							{new Intl.NumberFormat('vi-VN', {
								style: 'currency',
								currency: 'VND',
								minimumFractionDigits: 0,
							}).format(cartSubtotal)}
						</span>

						<!-- Mini cart preview placeholder -->
						<div class="text-base-content/70 my-2 space-y-2 text-xs">
							<p>Items in your cart...</p>
						</div>

						<div class="card-actions">
							<a href="/cart" class="btn btn-primary btn-block btn-sm md:btn-md"> View Cart </a>
						</div>
					{:else}
						<p class="text-base-content/70 py-2 text-sm">Your cart is empty</p>
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
					class="btn btn-ghost btn-sm h-11 gap-1 normal-case md:h-10 md:gap-1.5"
					aria-label="User menu"
				>
					<span class="max-w-[8ch] truncate text-sm font-medium md:max-w-[12ch]">
						{currentUser.first_name}
					</span>
					<ChevronDown class="h-4 w-4 opacity-70" />
				</button>

				<ul
					tabindex="-1"
					class="menu menu-sm dropdown-content rounded-box bg-base-100 md:menu-md z-1 mt-3 w-56 gap-1 p-2 shadow-lg md:w-64"
				>
					<!-- User info header -->
					<li class="menu-title px-4 py-2">
						<div class="flex flex-col gap-1">
							<span class="text-base-content text-sm font-semibold">
								{currentUser.first_name}
								{currentUser.last_name}
							</span>
							<span class="text-base-content/60 text-xs font-normal">
								@{currentUser.username}
							</span>
							{#if ['manager', 'operator'].includes(currentUser.role)}
								<span
									class="bg-primary/10 text-primary mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
								>
									{currentUser.role}
								</span>
							{/if}
						</div>
					</li>

					<div class="divider my-0"></div>

					<!-- Menu items with icons -->
					<li>
						<a href="/profile" class="gap-3">
							<User class="h-4 w-4" />
							<span>Hồ sơ</span>
						</a>
					</li>
					<li>
						<a href="/orders" class="gap-3">
							<Package class="h-4 w-4" />
							<span>Đơn hàng</span>
						</a>
					</li>
					<li>
						<a href="/bazi" class="gap-3">
							<Icon iconNode={yinYang} class="h-4 w-4" />
							<span>Bát tự</span>
						</a>
					</li>

					{#if ['manager', 'operator'].includes(currentUser.role)}
						<div class="divider my-0"></div>
						<li>
							<a href="/manage" class="gap-3">
								<Settings class="h-4 w-4" />
								<span>Manage</span>
							</a>
						</li>
					{/if}

					<div class="divider my-0"></div>

					<li>
						<form action="/login?/logout" method="POST" class="w-full">
							<button type="submit" class="text-error flex w-full gap-3">
								<LogOut class="h-4 w-4" />
								<span>Logout</span>
							</button>
						</form>
					</li>
				</ul>
			</div>
		{:else}
			<div class="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
				<a href="/login" class="btn btn-ghost btn-sm h-9 min-h-9 px-3 md:h-10 md:min-h-10 md:px-4">
					Login
				</a>
				<a
					href="/register"
					class="btn btn-primary btn-sm h-9 min-h-9 px-3 md:h-10 md:min-h-10 md:px-4"
				>
					Register
				</a>
			</div>
		{/if}
	</div>
</div>
