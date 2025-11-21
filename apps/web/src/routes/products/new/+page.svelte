<script lang="ts">
    import { goto } from '$app/navigation';

    let formData = {
        name: '',
        price: 0,
        imageUrl: '',
        description: '',
        categoryName: '',
        tags: ''
    };
    let loading = false;

    async function handleSubmit(e: Event) {
        e.preventDefault();
        loading = true;
        
        try {
            const body = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
            };

            const res = await fetch('http://localhost:3000/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                goto('/products');
            } else {
                alert('Failed to create product');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating product');
        } finally {
            loading = false;
        }
    }
</script>

<div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">New Product</h1>

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
            <input type="text" bind:value={formData.categoryName} class="input input-bordered" placeholder="e.g. Landscape" />
        </div>

        <div class="form-control">
            <label class="label"><span class="label-text">Tags (comma separated)</span></label>
            <input type="text" bind:value={formData.tags} class="input input-bordered" placeholder="nature, oil, canvas" />
        </div>

        <div class="form-control">
            <label class="label"><span class="label-text">Description</span></label>
            <textarea bind:value={formData.description} class="textarea textarea-bordered h-24"></textarea>
        </div>

        <div class="flex gap-4 mt-8">
            <button type="submit" class="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Create Product'}
            </button>
            <a href="/products" class="btn btn-ghost">Cancel</a>
        </div>
    </form>
</div>
