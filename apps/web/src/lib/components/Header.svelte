<script lang="ts">
    export let categories: { id: number, name: string }[] = [];
</script>

<div class="navbar bg-base-100 shadow-sm sticky top-0 z-50">
  <div class="navbar-start">
    <div class="dropdown">
      <button tabindex="0" class="btn btn-ghost lg:hidden">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
      </button>
      <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
        {#each categories as cat}
            <li><a href={`/products?categoryId=${cat.id}`}>{cat.name}</a></li>
        {/each}
      </ul>
    </div>
    <a href="/" class="btn btn-ghost text-xl font-serif text-primary">L'Artelier</a>
  </div>

  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal px-1">
      <li><a href="/">Trang chủ</a></li>
      <li>
        <details>
          <summary>Danh mục tranh</summary>
          <ul class="p-2 bg-base-100 min-w-[200px]">
            {#each categories as cat}
                <li><a href={`/products?categoryId=${cat.id}`}>{cat.name}</a></li>
            {/each}
          </ul>
        </details>
      </li>
      <li><a href="/ai" class="font-bold text-secondary">✨ AI Tư vấn</a></li>
    </ul>
  </div>

  <div class="navbar-end">
    <a href="/cart" class="btn btn-ghost btn-circle">
      <div class="indicator">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        <span class="badge badge-sm badge-primary indicator-item">0</span>
      </div>
    </a>
  </div>
</div>