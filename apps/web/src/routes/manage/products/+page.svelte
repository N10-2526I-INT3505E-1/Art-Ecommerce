<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

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

	function openEditModal(product: any) {
		selectedProduct = product;
		editForm = {
			id: product.id,
			name: product.name,
			price: product.price,
			stock: product.stock || 0,
			description: product.description || '',
			categoryName: product.category?.name || '',
			imageUrl: product.imageUrl || '',
			tags: (product.tags || []).join(', '),
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

<div class="container mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Quản lý sản phẩm</h1>
		<button class="btn btn-primary" on:click={() => (showCreateModal = true)}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mr-2 h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Thêm sản phẩm
		</button>
	</div>

	<!-- Bộ lọc -->
	<div class="bg-base-100 rounded-box mb-6 p-4 shadow">
		<div class="flex flex-wrap items-end gap-4">
			<div class="form-control flex-1">
				<label class="label" for="search">
					<span class="label-text">Tìm kiếm</span>
				</label>
				<input
					type="text"
					id="search"
					class="input input-bordered"
					placeholder="Tìm sản phẩm..."
					bind:value={searchQuery}
					on:keypress={(e) => e.key === 'Enter' && handleSearch()}
				/>
			</div>
			<div class="form-control w-48">
				<label class="label" for="category">
					<span class="label-text">Danh mục</span>
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
	<div class="bg-base-100 rounded-box overflow-x-auto shadow-xl">
		<table class="table w-full">
			<thead>
				<tr class="bg-base-200">
					<th>Sản phẩm</th>
					<th>Danh mục</th>
					<th>Giá</th>
					<th>Tồn kho</th>
					<th>Trạng thái</th>
					<th>Thao tác</th>
				</tr>
			</thead>
			<tbody>
				{#if products.length === 0}
					<tr>
						<td colspan="6" class="py-8 text-center opacity-50">Không tìm thấy sản phẩm nào</td>
					</tr>
				{:else}
					{#each products as product}
						<tr class="hover">
							<td>
								<div class="flex items-center gap-3">
									<div class="avatar">
										<div class="mask mask-squircle h-12 w-12">
											<img
												src={product.imageUrl ||
													'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'}
												alt={product.name}
											/>
										</div>
									</div>
									<div>
										<div class="font-bold">{product.name}</div>
										<div class="text-sm opacity-50">ID: {product.id.slice(0, 8)}...</div>
									</div>
								</div>
							</td>
							<td>{product.category?.name || '-'}</td>
							<td>{formatCurrency(product.price)}</td>
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
							<td>
								<div class="flex gap-2">
									<button class="btn btn-ghost btn-sm" on:click={() => openEditModal(product)}>
										Sửa
									</button>
									<button
										class="btn btn-ghost btn-sm text-error"
										on:click={() => openDeleteModal(product)}
									>
										Xóa
									</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
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
		<div class="modal-box max-w-2xl">
			<h3 class="mb-4 text-lg font-bold">Thêm sản phẩm mới</h3>
			<form method="POST" action="?/create" use:enhance>
				<div class="grid grid-cols-2 gap-4">
					<div class="form-control col-span-2">
						<label class="label" for="create-name">
							<span class="label-text">Tên sản phẩm *</span>
						</label>
						<input
							type="text"
							id="create-name"
							name="name"
							class="input input-bordered"
							required
							bind:value={createForm.name}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="create-price">
							<span class="label-text">Giá (VND) *</span>
						</label>
						<input
							type="number"
							id="create-price"
							name="price"
							class="input input-bordered"
							required
							min="0"
							bind:value={createForm.price}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="create-stock">
							<span class="label-text">Tồn kho</span>
						</label>
						<input
							type="number"
							id="create-stock"
							name="stock"
							class="input input-bordered"
							min="0"
							bind:value={createForm.stock}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="create-category">
							<span class="label-text">Tên danh mục</span>
						</label>
						<input
							type="text"
							id="create-category"
							name="categoryName"
							class="input input-bordered"
							bind:value={createForm.categoryName}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="create-tags">
							<span class="label-text">Tags (phân cách bằng dấu phẩy)</span>
						</label>
						<input
							type="text"
							id="create-tags"
							name="tags"
							class="input input-bordered"
							placeholder="tag1, tag2"
							bind:value={createForm.tags}
						/>
					</div>

					<div class="form-control col-span-2">
						<label class="label" for="create-image">
							<span class="label-text">URL hình ảnh</span>
						</label>
						<input
							type="url"
							id="create-image"
							name="imageUrl"
							class="input input-bordered"
							bind:value={createForm.imageUrl}
						/>
					</div>

					<div class="form-control col-span-2">
						<label class="label" for="create-description">
							<span class="label-text">Mô tả</span>
						</label>
						<textarea
							id="create-description"
							name="description"
							class="textarea textarea-bordered h-24"
							bind:value={createForm.description}
						></textarea>
					</div>
				</div>

				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={closeModals}>Hủy</button>
					<button type="submit" class="btn btn-primary">Tạo sản phẩm</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
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
		<div class="modal-box max-w-2xl">
			<h3 class="mb-4 text-lg font-bold">Chỉnh sửa sản phẩm</h3>
			<form method="POST" action="?/update" use:enhance>
				<input type="hidden" name="id" value={editForm.id} />

				<div class="grid grid-cols-2 gap-4">
					<div class="form-control col-span-2">
						<label class="label" for="edit-name">
							<span class="label-text">Tên sản phẩm</span>
						</label>
						<input
							type="text"
							id="edit-name"
							name="name"
							class="input input-bordered"
							bind:value={editForm.name}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="edit-price">
							<span class="label-text">Giá (VND)</span>
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

					<div class="form-control">
						<label class="label" for="edit-stock">
							<span class="label-text">Tồn kho</span>
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

					<div class="form-control">
						<label class="label" for="edit-category">
							<span class="label-text">Tên danh mục</span>
						</label>
						<input
							type="text"
							id="edit-category"
							name="categoryName"
							class="input input-bordered"
							bind:value={editForm.categoryName}
						/>
					</div>

					<div class="form-control">
						<label class="label" for="edit-tags">
							<span class="label-text">Tags (phân cách bằng dấu phẩy)</span>
						</label>
						<input
							type="text"
							id="edit-tags"
							name="tags"
							class="input input-bordered"
							bind:value={editForm.tags}
						/>
					</div>

					<div class="form-control col-span-2">
						<label class="label" for="edit-image">
							<span class="label-text">URL hình ảnh</span>
						</label>
						<input
							type="url"
							id="edit-image"
							name="imageUrl"
							class="input input-bordered"
							bind:value={editForm.imageUrl}
						/>
					</div>

					<div class="form-control col-span-2">
						<label class="label" for="edit-description">
							<span class="label-text">Mô tả</span>
						</label>
						<textarea
							id="edit-description"
							name="description"
							class="textarea textarea-bordered h-24"
							bind:value={editForm.description}
						></textarea>
					</div>
				</div>

				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={closeModals}>Hủy</button>
					<button type="submit" class="btn btn-primary">Lưu thay đổi</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
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
			<h3 class="text-lg font-bold">Xác nhận Xóa</h3>
			<p class="py-4">
				Bạn có chắc chắn muốn xóa sản phẩm <strong>{selectedProduct.name}</strong>? Hành động này
				không thể hoàn tác.
			</p>
			<form method="POST" action="?/delete" use:enhance>
				<input type="hidden" name="id" value={selectedProduct.id} />
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={closeModals}>Hủy</button>
					<button type="submit" class="btn btn-error">Xóa</button>
				</div>
			</form>
		</div>
		<div
			class="modal-backdrop"
			on:click={closeModals}
			on:keypress={closeModals}
			role="button"
			tabindex="0"
		></div>
	</div>
{/if}
