<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import {
		Copy,
		Check,
		Plus,
		Search,
		X,
		Package,
		DollarSign,
		Boxes,
		FolderOpen,
		Image,
		Tags,
		FileText,
		AlertCircle,
		Pencil,
		Trash2,
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	// Copy to clipboard state
	let copiedId: string | null = null;
	let isSubmitting = false;

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedId = text;
			setTimeout(() => {
				copiedId = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	$: products = data?.products || [];
	$: pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
	$: categories = data?.categories || [];
	$: filters = data?.filters || { search: '', categoryId: '' };

	// Modal states
	let showCreateModal = false;
	let showEditModal = false;
	let showDeleteModal = false;
	let selectedProduct: any = null;

	// Form data
	let createForm = {
		name: '',
		price: 0,
		stock: 10,
		description: '',
		categoryName: '',
		imageUrl: '',
		tags: '',
	};

	let editForm = {
		id: '',
		name: '',
		price: 0,
		stock: 0,
		description: '',
		categoryName: '',
		imageUrl: '',
		tags: '',
	};

	// Search
	let searchQuery = '';
	let selectedCategoryId = '';

	// Initialize search values from filters
	$: {
		searchQuery = filters?.search || '';
		selectedCategoryId = filters?.categoryId || '';
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	}

	function getStockStatusClass(stock: number): string {
		if (stock === 0) return 'badge-error';
		if (stock < 10) return 'badge-warning';
		return 'badge-success';
	}

	function getStockStatusText(stock: number): string {
		if (stock === 0) return 'Hết hàng';
		if (stock < 10) return 'Sắp hết';
		return 'Còn hàng';
	}

	function getProductTags(product: any): string[] {
		// Handle different tag formats from API
		if (Array.isArray(product.tags)) {
			return product.tags;
		}
		if (Array.isArray(product.productTags)) {
			return product.productTags.map((pt: any) => pt.tag?.name || pt.name).filter(Boolean);
		}
		return [];
	}

	function openEditModal(product: any) {
		selectedProduct = product;
		const productTags = getProductTags(product);
		editForm = {
			id: product.id,
			name: product.name,
			price: product.price,
			stock: product.stock || 0,
			description: product.description || '',
			categoryName: product.category?.name || '',
			imageUrl: product.imageUrl || '',
			tags: productTags.join(', '),
		};
		showEditModal = true;
	}

	function openDeleteModal(product: any) {
		selectedProduct = product;
		showDeleteModal = true;
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showDeleteModal = false;
		selectedProduct = null;
		resetCreateForm();
	}

	function resetCreateForm() {
		createForm = {
			name: '',
			price: 0,
			stock: 10,
			description: '',
			categoryName: '',
			imageUrl: '',
			tags: '',
		};
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
		window.location.href = `/manage/products?${params.toString()}`;
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		window.location.href = `/manage/products?${params.toString()}`;
	}

	$: if (form?.success) {
		closeModals();
	}
</script>

<div class="container mx-auto max-w-7xl p-4 lg:p-6">
	<div class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Quản lý sản phẩm</h1>
			<p class="text-base-content/60 mt-1 flex items-center gap-2">
				<Package class="h-4 w-4" />
				Tổng cộng {pagination.total} sản phẩm trong hệ thống
			</p>
		</div>
		<button class="btn btn-primary" on:click={() => (showCreateModal = true)}>
			<Plus class="h-5 w-5" />
			Thêm sản phẩm
		</button>
	</div>

	<!-- Bộ lọc -->
	<div class="bg-base-100 border-base-200 mb-6 rounded-2xl border p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-4">
			<div class="form-control flex-1">
				<label class="label py-0 pb-1.5" for="search">
					<span class="label-text text-base-content/60 text-xs font-bold uppercase">Tìm kiếm</span>
				</label>
				<div class="relative">
					<Search class="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 opacity-50" />
					<input
						type="text"
						id="search"
						class="input input-bordered w-full pl-9"
						placeholder="Tìm sản phẩm..."
						bind:value={searchQuery}
						on:keypress={(e) => e.key === 'Enter' && handleSearch()}
					/>
				</div>
			</div>
			<div class="form-control w-48">
				<label class="label py-0 pb-1.5" for="category">
					<span class="label-text text-base-content/60 text-xs font-bold uppercase">Danh mục</span>
				</label>
				<select id="category" class="select select-bordered" bind:value={selectedCategoryId}>
					<option value="">Tất cả danh mục</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</div>
			<button class="btn btn-primary" on:click={handleSearch}>Tìm</button>
			<a href="/manage/products" class="btn btn-ghost">Đặt lại</a>
		</div>
	</div>

	<!-- Thông báo -->
	{#if form?.error}
		<div class="alert alert-error mb-4">
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.success}
		<div class="alert alert-success mb-4">
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Bảng sản phẩm -->
	<div class="bg-base-100 border-base-200 overflow-hidden rounded-2xl border shadow-lg">
		<div class="overflow-x-auto">
			<table class="table w-full">
				<thead>
					<tr class="bg-base-200/50 text-base-content/70">
						<th class="font-bold">Sản phẩm</th>
						<th class="font-bold">Danh mục</th>
						<th class="font-bold">Tags</th>
						<th class="font-bold">Giá</th>
						<th class="font-bold">Tồn kho</th>
						<th class="font-bold">Trạng thái</th>
						<th class="pr-6 text-right font-bold">Thao tác</th>
					</tr>
				</thead>
				<tbody>
					{#if products.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center">
								<div class="flex flex-col items-center justify-center opacity-50">
									<Package class="text-base-content/20 mb-4 h-16 w-16" />
									<p class="font-bold">Không tìm thấy sản phẩm nào</p>
									<p class="text-sm">Thử thay đổi bộ lọc tìm kiếm</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each products as product}
							{@const productTags = getProductTags(product)}
							<tr class="hover group/row transition-colors">
								<td>
									<div class="flex items-center gap-3">
										<div class="avatar">
											<div class="mask mask-squircle bg-base-200 h-12 w-12">
												<img
													src={product.imageUrl ||
														'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'}
													alt={product.name}
												/>
											</div>
										</div>
										<div class="max-w-xs min-w-0">
											<div class="font-bold">{product.name}</div>
											<div class="group/id flex items-center gap-1">
												<span
													class="max-w-[200px] truncate font-mono text-xs opacity-50"
													title={product.id}
												>
													{product.id}
												</span>
												<button
													type="button"
													class="btn btn-ghost btn-xs opacity-0 transition-opacity group-hover/id:opacity-100"
													title="Copy ID"
													on:click|stopPropagation={() => copyToClipboard(product.id)}
												>
													{#if copiedId === product.id}
														<Check class="text-success h-3 w-3" />
													{:else}
														<Copy class="h-3 w-3" />
													{/if}
												</button>
											</div>
										</div>
									</div>
								</td>
								<td>
									<span class="badge badge-ghost">{product.category?.name || '-'}</span>
								</td>
								<td>
									<div class="flex max-w-[200px] flex-wrap gap-1">
										{#if productTags.length > 0}
											{#each productTags.slice(0, 3) as tag}
												<span class="badge badge-outline badge-sm">{tag}</span>
											{/each}
											{#if productTags.length > 3}
												<span class="badge badge-ghost badge-sm">+{productTags.length - 3}</span>
											{/if}
										{:else}
											<span class="text-xs opacity-50">-</span>
										{/if}
									</div>
								</td>
								<td class="font-semibold">{formatCurrency(product.price)}</td>
								<td>
									<span class={product.stock < 10 ? 'text-error font-bold' : ''}>
										{product.stock ?? 0}
									</span>
								</td>
								<td>
									<span class="badge {getStockStatusClass(product.stock ?? 0)}">
										{getStockStatusText(product.stock ?? 0)}
									</span>
								</td>
								<td class="text-right">
									<div class="join">
										<button
											class="btn btn-ghost btn-sm btn-square join-item"
											title="Sửa"
											on:click={() => openEditModal(product)}
										>
											<Pencil class="h-4 w-4" />
										</button>
										<button
											class="btn btn-ghost btn-sm btn-square join-item text-error hover:bg-error/10"
											title="Xóa"
											on:click={() => openDeleteModal(product)}
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Phân trang -->
	{#if pagination.totalPages > 1}
		<div class="mt-6 flex justify-center">
			<div class="join">
				<button
					class="join-item btn"
					disabled={pagination.page <= 1}
					on:click={() => goToPage(pagination.page - 1)}
				>
					«
				</button>
				{#each Array(pagination.totalPages) as _, i}
					{#if i + 1 === pagination.page || i + 1 === 1 || i + 1 === pagination.totalPages || (i + 1 >= pagination.page - 1 && i + 1 <= pagination.page + 1)}
						<button
							class="join-item btn"
							class:btn-active={i + 1 === pagination.page}
							on:click={() => goToPage(i + 1)}
						>
							{i + 1}
						</button>
					{:else if i + 1 === pagination.page - 2 || i + 1 === pagination.page + 2}
						<button class="join-item btn btn-disabled">...</button>
					{/if}
				{/each}
				<button
					class="join-item btn"
					disabled={pagination.page >= pagination.totalPages}
					on:click={() => goToPage(pagination.page + 1)}
				>
					»
				</button>
			</div>
		</div>
	{/if}

	<div class="mt-4 text-center text-sm opacity-70">
		Hiển thị {products.length} / {pagination.total} sản phẩm
	</div>
</div>

<!-- Modal Thêm sản phẩm -->
{#if showCreateModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl overflow-hidden p-0">
			<!-- Modal Header -->
			<div class="bg-base-200/50 border-base-200 flex items-center justify-between border-b p-4">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 rounded-full p-2">
						<Plus class="text-primary h-5 w-5" />
					</div>
					<div>
						<h3 class="text-lg font-bold">Thêm sản phẩm mới</h3>
						<p class="text-xs opacity-60">Điền thông tin sản phẩm bên dưới</p>
					</div>
				</div>
				<button class="btn btn-sm btn-circle btn-ghost" on:click={closeModals}>
					<X class="h-5 w-5" />
				</button>
			</div>

			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
			>
				<div class="max-h-[70vh] overflow-y-auto p-6">
					<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
						<!-- Tên sản phẩm -->
						<div class="form-control col-span-2">
							<label class="label" for="create-name">
								<span class="label-text flex items-center gap-2 font-medium">
									<Package class="h-4 w-4 opacity-50" />
									Tên sản phẩm <span class="text-error">*</span>
								</span>
							</label>
							<input
								type="text"
								id="create-name"
								name="name"
								class="input input-bordered"
								placeholder="Nhập tên sản phẩm"
								required
								bind:value={createForm.name}
							/>
						</div>

						<!-- Giá -->
						<div class="form-control">
							<label class="label" for="create-price">
								<span class="label-text flex items-center gap-2 font-medium">
									<DollarSign class="h-4 w-4 opacity-50" />
									Giá (VND) <span class="text-error">*</span>
								</span>
							</label>
							<input
								type="number"
								id="create-price"
								name="price"
								class="input input-bordered"
								placeholder="0"
								required
								min="0"
								bind:value={createForm.price}
							/>
						</div>

						<!-- Tồn kho -->
						<div class="form-control">
							<label class="label" for="create-stock">
								<span class="label-text flex items-center gap-2 font-medium">
									<Boxes class="h-4 w-4 opacity-50" />
									Tồn kho
								</span>
							</label>
							<input
								type="number"
								id="create-stock"
								name="stock"
								class="input input-bordered"
								placeholder="10"
								min="0"
								bind:value={createForm.stock}
							/>
						</div>

						<!-- Danh mục -->
						<div class="form-control">
							<label class="label" for="create-category">
								<span class="label-text flex items-center gap-2 font-medium">
									<FolderOpen class="h-4 w-4 opacity-50" />
									Danh mục
								</span>
							</label>
							<input
								type="text"
								id="create-category"
								name="categoryName"
								class="input input-bordered"
								placeholder="Nhập tên danh mục"
								list="category-list"
								bind:value={createForm.categoryName}
							/>
							<datalist id="category-list">
								{#each categories as category}
									<option value={category.name}></option>
								{/each}
							</datalist>
						</div>

						<!-- Tags -->
						<div class="form-control">
							<label class="label" for="create-tags">
								<span class="label-text flex items-center gap-2 font-medium">
									<Tags class="h-4 w-4 opacity-50" />
									Tags
								</span>
							</label>
							<input
								type="text"
								id="create-tags"
								name="tags"
								class="input input-bordered"
								placeholder="tag1, tag2, tag3"
								bind:value={createForm.tags}
							/>
							<label class="label" for="create-tags">
								<span class="label-text-alt opacity-50">Phân cách bằng dấu phẩy</span>
							</label>
						</div>

						<!-- URL hình ảnh -->
						<div class="form-control col-span-2">
							<label class="label" for="create-image">
								<span class="label-text flex items-center gap-2 font-medium">
									<Image class="h-4 w-4 opacity-50" />
									URL hình ảnh
								</span>
							</label>
							<input
								type="url"
								id="create-image"
								name="imageUrl"
								class="input input-bordered"
								placeholder="https://example.com/image.jpg"
								bind:value={createForm.imageUrl}
							/>
							{#if createForm.imageUrl}
								<div class="mt-2">
									<img
										src={createForm.imageUrl}
										alt="Preview"
										class="h-20 w-20 rounded-lg object-cover"
										on:error={(e) => (e.currentTarget.style.display = 'none')}
									/>
								</div>
							{/if}
						</div>

						<!-- Mô tả -->
						<div class="form-control col-span-2">
							<label class="label" for="create-description">
								<span class="label-text flex items-center gap-2 font-medium">
									<FileText class="h-4 w-4 opacity-50" />
									Mô tả
								</span>
							</label>
							<textarea
								id="create-description"
								name="description"
								class="textarea textarea-bordered h-28"
								placeholder="Nhập mô tả sản phẩm..."
								bind:value={createForm.description}
							></textarea>
						</div>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="bg-base-200/30 flex justify-end gap-2 p-4">
					<button type="button" class="btn btn-ghost" on:click={closeModals} disabled={isSubmitting}
						>Hủy</button
					>
					<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						Tạo sản phẩm
					</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop bg-neutral/50 backdrop-blur-sm"
			on:click={closeModals}
			on:keypress={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}

<!-- Modal Sửa sản phẩm -->
{#if showEditModal && selectedProduct}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl overflow-hidden p-0">
			<!-- Modal Header -->
			<div class="bg-base-200/50 border-base-200 flex items-center justify-between border-b p-4">
				<div class="flex items-center gap-3">
					<div class="bg-info/10 rounded-full p-2">
						<Pencil class="text-info h-5 w-5" />
					</div>
					<div>
						<h3 class="text-lg font-bold">Chỉnh sửa sản phẩm</h3>
						<p class="font-mono text-xs opacity-60">{editForm.id}</p>
					</div>
				</div>
				<button class="btn btn-sm btn-circle btn-ghost" on:click={closeModals}>
					<X class="h-5 w-5" />
				</button>
			</div>

			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
			>
				<input type="hidden" name="id" value={editForm.id} />

				<div class="max-h-[70vh] overflow-y-auto p-6">
					<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
						<!-- Tên sản phẩm -->
						<div class="form-control col-span-2">
							<label class="label" for="edit-name">
								<span class="label-text flex items-center gap-2 font-medium">
									<Package class="h-4 w-4 opacity-50" />
									Tên sản phẩm
								</span>
							</label>
							<input
								type="text"
								id="edit-name"
								name="name"
								class="input input-bordered"
								placeholder="Nhập tên sản phẩm"
								bind:value={editForm.name}
							/>
						</div>

						<!-- Giá -->
						<div class="form-control">
							<label class="label" for="edit-price">
								<span class="label-text flex items-center gap-2 font-medium">
									<DollarSign class="h-4 w-4 opacity-50" />
									Giá (VND)
								</span>
							</label>
							<input
								type="number"
								id="edit-price"
								name="price"
								class="input input-bordered"
								min="0"
								bind:value={editForm.price}
							/>
						</div>

						<!-- Tồn kho -->
						<div class="form-control">
							<label class="label" for="edit-stock">
								<span class="label-text flex items-center gap-2 font-medium">
									<Boxes class="h-4 w-4 opacity-50" />
									Tồn kho
								</span>
							</label>
							<input
								type="number"
								id="edit-stock"
								name="stock"
								class="input input-bordered"
								min="0"
								bind:value={editForm.stock}
							/>
						</div>

						<!-- Danh mục -->
						<div class="form-control">
							<label class="label" for="edit-category">
								<span class="label-text flex items-center gap-2 font-medium">
									<FolderOpen class="h-4 w-4 opacity-50" />
									Danh mục
								</span>
							</label>
							<input
								type="text"
								id="edit-category"
								name="categoryName"
								class="input input-bordered"
								placeholder="Nhập tên danh mục"
								list="edit-category-list"
								bind:value={editForm.categoryName}
							/>
							<datalist id="edit-category-list">
								{#each categories as category}
									<option value={category.name}></option>
								{/each}
							</datalist>
						</div>

						<!-- Tags -->
						<div class="form-control">
							<label class="label" for="edit-tags">
								<span class="label-text flex items-center gap-2 font-medium">
									<Tags class="h-4 w-4 opacity-50" />
									Tags
								</span>
							</label>
							<input
								type="text"
								id="edit-tags"
								name="tags"
								class="input input-bordered"
								placeholder="tag1, tag2, tag3"
								bind:value={editForm.tags}
							/>
							<label class="label" for="edit-tags">
								<span class="label-text-alt opacity-50">Phân cách bằng dấu phẩy</span>
							</label>
						</div>

						<!-- URL hình ảnh -->
						<div class="form-control col-span-2">
							<label class="label" for="edit-image">
								<span class="label-text flex items-center gap-2 font-medium">
									<Image class="h-4 w-4 opacity-50" />
									URL hình ảnh
								</span>
							</label>
							<input
								type="url"
								id="edit-image"
								name="imageUrl"
								class="input input-bordered"
								placeholder="https://example.com/image.jpg"
								bind:value={editForm.imageUrl}
							/>
							{#if editForm.imageUrl}
								<div class="mt-2">
									<img
										src={editForm.imageUrl}
										alt="Preview"
										class="h-20 w-20 rounded-lg object-cover"
										on:error={(e) => (e.currentTarget.style.display = 'none')}
									/>
								</div>
							{/if}
						</div>

						<!-- Mô tả -->
						<div class="form-control col-span-2">
							<label class="label" for="edit-description">
								<span class="label-text flex items-center gap-2 font-medium">
									<FileText class="h-4 w-4 opacity-50" />
									Mô tả
								</span>
							</label>
							<textarea
								id="edit-description"
								name="description"
								class="textarea textarea-bordered h-28"
								placeholder="Nhập mô tả sản phẩm..."
								bind:value={editForm.description}
							></textarea>
						</div>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="bg-base-200/30 flex justify-end gap-2 p-4">
					<button type="button" class="btn btn-ghost" on:click={closeModals} disabled={isSubmitting}
						>Hủy</button
					>
					<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						Lưu thay đổi
					</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop bg-neutral/50 backdrop-blur-sm"
			on:click={closeModals}
			on:keypress={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}

<!-- Modal Xác nhận xóa -->
{#if showDeleteModal && selectedProduct}
	<div class="modal modal-open">
		<div class="modal-box">
			<div class="flex gap-4">
				<div
					class="bg-error/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
				>
					<AlertCircle class="text-error h-6 w-6" />
				</div>
				<div>
					<h3 class="text-error text-lg font-bold">Xóa sản phẩm?</h3>
					<p class="py-2 text-sm opacity-80">
						Bạn có chắc chắn muốn xóa sản phẩm <strong class="text-base-content"
							>{selectedProduct.name}</strong
						>? Hành động này không thể hoàn tác.
					</p>
				</div>
			</div>

			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
					};
				}}
			>
				<input type="hidden" name="id" value={selectedProduct.id} />
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={closeModals} disabled={isSubmitting}
						>Hủy bỏ</button
					>
					<button type="submit" class="btn btn-error" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
						{/if}
						Xóa vĩnh viễn
					</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop bg-neutral/50 backdrop-blur-sm"
			on:click={closeModals}
			on:keypress={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}
