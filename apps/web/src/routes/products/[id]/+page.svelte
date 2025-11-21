<script lang="ts">
    
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
import { page } from '$app/stores';

    let id = $page.params.id;
    let loading = true;
    let saving = false;

    let formData = {
        name: '',
        price: 0,
        imageUrl: '',
        description: '',
        categoryName: '',
        tags: ''
    };

    onMount(async () => {
        try {
            const res = await fetch(`http://localhost:3000/products/${id}`);
            if (res.ok) {
                const data = await res.json();
                formData = {
                    name: data.name,
                    price: data.price,
                    imageUrl: data.imageUrl,
                    description: data.description || '',
                    categoryName: data.category?.name || '',
                    tags: data.tags ? data.tags.map((t: any) => t.name).join(', ') : ''
                };
            } else {
                alert('Product not found');
                goto('/products');
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        saving = true;
        
        try {
            const body = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
            };

            const res = await fetch(`http://localhost:3000/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                goto('/products');
            } else {
                alert('Failed to update product');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating product');
        } finally {
            saving = false;
        }
    }
</script>

<div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Edit Product #{id}</h1>

    {#if loading}
        <div class="flex justify-center"><span class="loading loading-spinner loading-lg"></span></div>
    {:else}
        <form onsubmit={handleSubmit} class="space-y-4">
            <div class="form-control">
                <label class="label"><span class="label-text">Name</span></label>
                <input type="text" bind:value={formData.name} required class="input input-bordered" />
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text">Price</span></label>
                <input type="number" bind:value={formData.price} required class="input input-bordered" />
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text">Image URL</span></label>
                <input type="text" bind:value={formData.imageUrl} required class="input input-bordered" />
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text">Category Name</span></label>
                <input type="text" bind:value={formData.categoryName} class="input input-bordered" />
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text">Tags (comma separated)</span></label>
                <input type="text" bind:value={formData.tags} class="input input-bordered" />
            </div>

            <div class="form-control">
                <label class="label"><span class="label-text">Description</span></label>
                <textarea bind:value={formData.description} class="textarea textarea-bordered h-24"></textarea>
            </div>

            <div class="flex gap-4 mt-8">
                <button type="submit" class="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <a href="/products" class="btn btn-ghost">Cancel</a>
            </div>
        </form>
    {/if}
</div>
