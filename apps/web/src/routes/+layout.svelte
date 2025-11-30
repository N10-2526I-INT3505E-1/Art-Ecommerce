<script lang="ts">
    import "../app.css"; 
    import Header from "$lib/components/Header.svelte";
    import Footer from "$lib/components/Footer.svelte"; // <-- Nhớ import dòng này
    
    export let data; 
</script>

<div class="min-h-screen flex flex-col bg-gray-50 font-sans">
    <Header categories={data.categories} />
    
    <main class="flex-grow container mx-auto px-4 py-6">
        <slot />
    </main>

    <Footer /> </div>