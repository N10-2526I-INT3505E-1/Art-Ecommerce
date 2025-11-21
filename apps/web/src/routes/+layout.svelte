<script lang="ts">
import "../app.css";
import favicon from "$lib/assets/favicon.svg";

const { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen flex flex-col">
    <div class="navbar bg-base-100 shadow-sm">
        <div class="flex-1">
            <a href="/" class="btn btn-ghost text-xl">L'Artelier</a>
        </div>
        <div class="flex-none">
            <ul class="menu menu-horizontal px-1">
                <li><a href="/products">Products</a></li>
                <li><a href="/login">Login</a></li>
            </ul>
        </div>
    </div>

    <main class="flex-grow">
        {@render children?.()}
    </main>

    <footer class="footer footer-center p-4 bg-base-300 text-base-content">
        <aside>
            <p>Copyright © 2024 - All right reserved by L'Artelier</p>
        </aside>
    </footer>
</div>
