<script lang="ts">
	import { Lock, Mail } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
	import { showToast } from '$lib/toastStore';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);

	onMount(() => {
		const btn = document.getElementById('google-btn');
		if (btn && window.google) {
			window.google.accounts.id.initialize({
				client_id: PUBLIC_GOOGLE_CLIENT_ID,
				callback: handleGoogleLogin
			});
			window.google.accounts.id.renderButton(btn, {
				theme: 'outline',
				size: 'large',
				width: 400
			});
		}
	});

	async function handleGoogleLogin(response: google.accounts.id.CredentialResponse) {
		const res = await fetch('/api/auth/google', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: response.credential })
		});

		const data = await res.json();

		if (data.status === 'login') {
			showToast({ message: 'Logged in successfully!', type: 'success' });
			await goto('/');
		} else if (data.status === 'register') {
			const params = new URLSearchParams({
				email: data.email,
				firstName: data.first_name,
				lastName: data.last_name
			});
			await goto(`/register?${params.toString()}`);
		} else {
			showToast({ message: 'Login failed', type: 'error' });
		}
	}
</script>

<div class="grid min-h-screen w-full overflow-x-hidden lg:grid-cols-[2fr_3fr]">
	<div class="bg-base-100 flex flex-col items-center justify-center p-6 sm:p-8">
		<div class="w-full max-w-md px-6">
			<a
				href="/"
				class="mb-8 flex items-center gap-3 self-start"
				style="view-transition-name: brand-logo"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 100 100">
					<g fill-rule="evenodd">
						<path fill="#282828" d="M46 12 15 88q-30-38 31-76Z" />
						<path fill="#825F41" d="m54 12 31 76q30-38-31-76Z" />
					</g>
				</svg>
				<span class="text-2xl font-bold">L'Artelier</span>
			</a>

			<h1 class="font-josefin text-4xl font-bold">Welcome back</h1>
			<p class="text-base-content/70 mt-2">Login to continue your journey.</p>

			<form
				class="mt-8 space-y-4"
				method="POST"
				action="?/login"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showToast({ message: 'Logged in successfully!', type: 'success' });
							await goto('/');
						} else if (result.type === 'failure') {
							await update();
						}
						submitting = false;
					};
				}}
			>
				<div id="email-field" style="view-transition-name: auth-email" class="w-full">
					<div class="relative">
						<Mail
							class="pointer-events-none absolute top-1/2 left-3 z-10 size-5 -translate-y-1/2 transform text-gray-500"
						/>
						<input
							type="email"
							id="email"
							name="email"
							class="input validator w-full pl-10"
							required
							placeholder="Enter your email"
						/>
					</div>
					<p class="validator-hint hidden">Please enter a valid email address</p>
				</div>

				<div id="password-field" style="view-transition-name: auth-password" class="w-full">
					<div class="relative">
						<Lock
							class="pointer-events-none absolute top-1/2 left-3 z-10 size-5 -translate-y-1/2 transform text-gray-500"
						/>
						<input
							type="password"
							id="password"
							name="password"
							class="input validator w-full pl-10"
							required
							placeholder="Password"
							minlength="6"
						/>
					</div>
					<p class="validator-hint hidden">Password must be at least 6 characters</p>
				</div>

				{#if form?.message}
					<div class="alert alert-error alert-soft text-sm p-2">
						<span>{form.message}</span>
					</div>
				{/if}

				<div class="pt-2">
					<button
						type="submit"
						class="btn btn-primary w-full"
						disabled={submitting}
						style="view-transition-name: auth-submit"
					>
						{#if submitting}
							<span class="loading loading-spinner"></span>
							Logging In...
						{:else}
							Login
						{/if}
					</button>
				</div>

				<div class="divider">OR</div>
				
				<div id="google-btn" class="w-full flex justify-center"></div>

				<div class="text-center text-sm">
					Don't have an account?
					<a href="/register" class="link link-primary">Register</a>
				</div>
			</form>
		</div>
	</div>

	<div
		class="hidden h-full items-center justify-center overflow-visible p-5 pr-0 lg:flex lg:translate-x-20"
	>
		<enhanced:img
			src="$lib/assets/backgrounds/signin_background.jpg"
			class="h-[70vh] max-h-[70vh] w-auto max-w-none rounded-xl object-cover shadow-xl"
			alt="Login Background"
		>
		</enhanced:img>
	</div>
</div>