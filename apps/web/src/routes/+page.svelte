<script lang="ts">
    export let data; // Nhận dữ liệu từ +page.ts
    
    // Hàm format giá tiền Việt Nam
    const formatPrice = (price: number) => 
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
</script>

<div class="hero h-96 rounded-box overflow-hidden mb-10" style="background-image: url(https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&q=80&w=1000);">
  <div class="hero-overlay bg-opacity-60"></div>
  <div class="hero-content text-center text-neutral-content">
    <div class="max-w-md">
      <h1 class="mb-5 text-5xl font-bold font-serif">Nghệ Thuật</h1>
      <p class="mb-5">Khám phá bộ sưu tập tranh độc bản cho không gian của bạn.</p>
      <a href="/products" class="btn btn-primary">Xem tất cả tranh</a>
    </div>
  </div>
</div>

<h2 class="text-3xl font-bold mb-6 text-center font-serif">Tác Phẩm</h2>

{#if data.products && data.products.length > 0}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {#each data.products as product}
            <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
                <figure class="h-64">
                    <img src={product.imageUrl} alt={product.name} class="w-full h-full object-cover" />
                </figure>
                <div class="card-body p-4">
                    {#if product.category}
                        <div class="badge badge-outline text-xs">{product.category.name}</div>
                    {/if}
                    <h2 class="card-title text-lg">{product.name}</h2>
                    <div class="text-xl font-bold text-primary mt-2">{formatPrice(product.price)}</div>
                    <div class="card-actions justify-end mt-4">
                        <a href={`/products/${product.id}`} class="btn btn-sm btn-primary w-full">Chi tiết</a>
                    </div>
                </div>
            </div>
        {/each}
    </div>
{:else}
    <div class="text-center py-10">
        <p class="text-lg text-gray-500">Chưa có sản phẩm nào được crawl.</p>
        <p class="text-sm">Hãy chạy crawler python để nạp dữ liệu.</p>
    </div>
{/if}