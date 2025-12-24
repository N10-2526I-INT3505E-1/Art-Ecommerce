<script lang="ts">
	import { page } from '$app/state';

	export let role: 'operator' | 'manager' = 'manager';

	function isActive(path: string, currentPath: string): boolean {
		if (path === '/manage') {
			return currentPath === '/manage';
		}
		return currentPath.startsWith(path);
	}
</script>

<aside class="bg-base-200 flex min-h-screen w-64 flex-shrink-0 flex-col">
	<!-- Logo / Brand -->
	<div class="border-base-300 border-b p-4">
		<a href="/manage" class="flex items-center gap-3">
			<div
				class="bg-primary text-primary-content flex h-10 w-10 items-center justify-center rounded-lg"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>
			<div>
				<h1 class="text-lg font-bold">Novus</h1>
				<p class="text-xs opacity-60">Quản lý hệ thống</p>
			</div>
		</a>
	</div>

	<!-- User Info -->
	<div class="border-base-300 border-b p-4">
		<div class="flex items-center gap-3">
			<div class="avatar placeholder">
				<div
					class="bg-neutral text-neutral-content flex w-10 items-center justify-center rounded-full"
				>
					<span class="text-sm">{role === 'manager' ? 'MGR' : 'OPR'}</span>
				</div>
			</div>
			<div class="flex-1">
				<p class="text-sm font-medium">
					{role === 'manager' ? 'Quản lý' : 'Nhân viên'}
				</p>
				<p class="text-xs opacity-60">
					{role === 'manager' ? 'Toàn quyền' : 'Vận hành'}
				</p>
			</div>
			<div
				class="badge badge-sm"
				class:badge-primary={role === 'manager'}
				class:badge-secondary={role === 'operator'}
			>
				{role === 'manager' ? 'Admin' : 'Staff'}
			</div>
		</div>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto p-4">
		<ul class="menu rounded-box text-base-content w-full gap-1 p-0">
			<!-- Dashboard -->
			<li>
				<a
					href="/manage"
					class="flex items-center gap-3 rounded-lg"
					class:active={isActive('/manage', page.url.pathname)}
					class:bg-primary={isActive('/manage', page.url.pathname)}
					class:text-primary-content={isActive('/manage', page.url.pathname)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
						/>
					</svg>
					<span>Tổng quan</span>
					{#if isActive('/manage', page.url.pathname) && page.url.pathname === '/manage'}
						<span class="badge badge-xs badge-primary ml-auto">●</span>
					{/if}
				</a>
			</li>

			<!-- Operations Section -->
			<li class="menu-title mt-4">
				<span class="text-xs font-semibold tracking-wider uppercase opacity-60">Vận hành</span>
			</li>

			<li>
				<a
					href="/manage/products"
					class="flex items-center gap-3 rounded-lg"
					class:active={isActive('/manage/products', page.url.pathname)}
					class:bg-primary={isActive('/manage/products', page.url.pathname)}
					class:text-primary-content={isActive('/manage/products', page.url.pathname)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
						/>
					</svg>
					<span>Sản phẩm</span>
					{#if isActive('/manage/products', page.url.pathname)}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="ml-auto h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					{/if}
				</a>
			</li>

			<li>
				<a
					href="/manage/orders"
					class="flex items-center gap-3 rounded-lg"
					class:active={isActive('/manage/orders', page.url.pathname)}
					class:bg-primary={isActive('/manage/orders', page.url.pathname)}
					class:text-primary-content={isActive('/manage/orders', page.url.pathname)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
						/>
					</svg>
					<span>Đơn hàng</span>
					{#if isActive('/manage/orders', page.url.pathname)}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="ml-auto h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					{/if}
				</a>
			</li>

			<!-- Manager Only Section -->
			{#if role === 'manager'}
				<li class="menu-title mt-4">
					<span class="text-xs font-semibold tracking-wider uppercase opacity-60">Quản lý</span>
				</li>

				<li>
					<a
						href="/manage/statistics"
						class="flex items-center gap-3 rounded-lg"
						class:active={isActive('/manage/statistics', page.url.pathname)}
						class:bg-primary={isActive('/manage/statistics', page.url.pathname)}
						class:text-primary-content={isActive('/manage/statistics', page.url.pathname)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
						<span>Thống kê</span>
						{#if !isActive('/manage/statistics', page.url.pathname)}{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="ml-auto h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						{/if}
					</a>
				</li>

				<li>
					<a
						href="/manage/reports"
						class="flex items-center gap-3 rounded-lg"
						class:active={isActive('/manage/reports', page.url.pathname)}
						class:bg-primary={isActive('/manage/reports', page.url.pathname)}
						class:text-primary-content={isActive('/manage/reports', page.url.pathname)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<span>Báo cáo</span>
						{#if !isActive('/manage/reports', page.url.pathname)}{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="ml-auto h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						{/if}
					</a>
				</li>
			{/if}
		</ul>
	</nav>

	<!-- Footer -->
	<div class="border-base-300 border-t p-4">
		<ul class="menu rounded-box w-full gap-1 p-0">
			<li>
				<a
					href="/"
					class="flex items-center gap-3 rounded-lg text-sm opacity-70 transition-opacity hover:opacity-100"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					<span>Về trang chủ</span>
				</a>
			</li>
			<li>
				<a
					href="/profile"
					class="flex items-center gap-3 rounded-lg text-sm opacity-70 transition-opacity hover:opacity-100"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<span>Cài đặt</span>
				</a>
			</li>
		</ul>

		<!-- Version Info -->
		<div class="mt-4 text-center text-xs opacity-40">
			<p>Novus Management v1.0</p>
		</div>
	</div>
</aside>
