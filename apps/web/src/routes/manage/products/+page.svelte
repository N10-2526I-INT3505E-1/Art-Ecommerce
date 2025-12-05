<script lang="ts">
	// Example product data
	let products = [
		{
			id: 1,
			name: 'Tượng Phật Di Lặc',
			category: 'Tượng',
			price: 1500000,
			stock: 12,
			status: 'Active',
			image: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp',
		},
		{
			id: 2,
			name: 'Vòng Tay Thạch Anh',
			category: 'Trang sức',
			price: 550000,
			stock: 45,
			status: 'Active',
			image: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp',
		},
		{
			id: 3,
			name: 'Tỳ Hưu Phong Thủy',
			category: 'Linh vật',
			price: 2100000,
			stock: 5,
			status: 'Low Stock',
			image: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp',
		},
		{
			id: 4,
			name: 'Tranh Mã Đáo Thành Công',
			category: 'Tranh',
			price: 3200000,
			stock: 0,
			status: 'Out of Stock',
			image: 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp',
		},
	];
</script>

<div class="container mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Product Management</h1>
		<button class="btn btn-primary">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mr-2 h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Product
		</button>
	</div>

	<div class="bg-base-100 rounded-box overflow-x-auto shadow-xl">
		<table class="table w-full">
			<!-- head -->
			<thead>
				<tr class="bg-base-200">
					<th>
						<label>
							<input type="checkbox" class="checkbox" />
						</label>
					</th>
					<th>Product</th>
					<th>Category</th>
					<th>Price</th>
					<th>Stock</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each products as product}
					<tr class="hover">
						<th>
							<label>
								<input type="checkbox" class="checkbox" />
							</label>
						</th>
						<td>
							<div class="flex items-center gap-3">
								<div class="avatar">
									<div class="mask mask-squircle h-12 w-12">
										<img src={product.image} alt={product.name} />
									</div>
								</div>
								<div>
									<div class="font-bold">{product.name}</div>
									<div class="text-sm opacity-50">ID: #{product.id}</div>
								</div>
							</div>
						</td>
						<td>{product.category}</td>
						<td
							>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
								product.price,
							)}</td
						>
						<td>
							<span class={product.stock < 10 ? 'text-error font-bold' : ''}>
								{product.stock}
							</span>
						</td>
						<td>
							<div
								class="badge {product.status === 'Active'
									? 'badge-success'
									: product.status === 'Low Stock'
										? 'badge-warning'
										: 'badge-error'} gap-2"
							>
								{product.status}
							</div>
						</td>
						<th>
							<button class="btn btn-ghost btn-xs">Edit</button>
							<button class="btn btn-ghost btn-xs text-error">Delete</button>
						</th>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-6 flex justify-center">
		<div class="join">
			<button class="join-item btn">«</button>
			<button class="join-item btn">Page 1</button>
			<button class="join-item btn btn-active">2</button>
			<button class="join-item btn">3</button>
			<button class="join-item btn">4</button>
			<button class="join-item btn">»</button>
		</div>
	</div>
</div>
