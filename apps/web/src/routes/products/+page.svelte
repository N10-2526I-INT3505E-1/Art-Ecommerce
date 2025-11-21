<script lang="ts">
    import { onMount } from 'svelte';

    
    let products: any[] = [];
    let loading = true;

    async function fetchProducts() {
        try {
            const res = await fetch('http://localhost:3000/products');
            const data = await res.json();
            products = data.data;
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function deleteProduct(id: number) {
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`http://localhost:3000/products/${id}`, { method: 'DELETE' });
            await fetchProducts();
        } catch (e) {
            console.error(e);
            alert('Failed to delete');
        }
    }

    onMount(() => {
        fetchProducts();
    });
</script>

<div class="p-8">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Products</h1>
        <a href="/products/new" class="btn btn-primary">Add Product</a>
    </div>

    {#if loading}
        <div class="flex justify-center"><span class="loading loading-spinner loading-lg"></span></div>
    {:else}
        <div class="overflow-x-auto">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each products as product}
                        <tr>
                            <td>{product.id}</td>
                            <td>
                                <div class="avatar">
                                    <div class="w-12 rounded">
                                        <img src={product.imageUrl} alt={product.name} />
                                    </div>
                                </div>
                            </td>
                            <td class="font-bold">{product.name}</td>
                            <td>${product.price}</td>
                            <td>{product.category?.name || '-'}</td>
                            <td class="flex gap-2">
                                <a href={`/products/${product.id}`} class="btn btn-sm btn-ghost">Edit</a>
                                <button onclick={() => deleteProduct(product.id)} class="btn btn-sm btn-error">Delete</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
