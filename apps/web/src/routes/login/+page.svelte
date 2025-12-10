<script lang="ts">
	import { Lock, type Icon as LucideIcon, User } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
	import { showToast } from '$lib/toastStore';

	let submitting = $state(false);

	let googleBtn = $state<HTMLDivElement>();
	let submitBtn = $state<HTMLButtonElement>();

	let loginId = $state(page.url.searchParams.get('loginId') || '');
	let password = $state('');

	onMount(() => {
		if (!PUBLIC_GOOGLE_CLIENT_ID) return;

		if (typeof google === 'undefined' || !google.accounts) {
			console.warn('Google Identity Services script not loaded.');
			return;
		}

		google.accounts.id.initialize({
			client_id: PUBLIC_GOOGLE_CLIENT_ID,
			callback: handleGoogleLogin,
		});

		if (googleBtn && submitBtn) {
			const btnWidth = submitBtn.offsetWidth;
			google.accounts.id.renderButton(googleBtn, {
				theme: 'outline',
				size: 'large',
				width: btnWidth.toString(),
			});
		}
	});

	async function handleGoogleLogin(response: google.accounts.id.CredentialResponse) {
		try {
			const res = await fetch('/sessions/google', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: response.credential }),
			});

			if (res.ok) {
				// Chỉ cần check status 200/201
				showToast({ message: 'Logged in successfully!', type: 'success' });

				// Cookie đã được set tự động bởi Backend response
				await invalidateAll();
				await goto('/');
			} else {
				showToast({ message: 'Login failed', type: 'error' });
			}
		} catch (err) {
			console.error(err);
			showToast({ message: 'An error occurred', type: 'error' });
		}
	}
</script>

{#snippet inputField(
    id: string,
    label: string,
    value: string,
    oninput: (e: Event) => void,
    Icon: typeof User,
    type: string = 'text',
    required = true,
    readonly = false,
    pattern: string | undefined = undefined,
    minLength: number | undefined = undefined,
    maxLength: number | undefined = undefined,
    hint: string | undefined = undefined
)}
	<div class="form-control" style:view-transition-name={`auth-${id}`}>
		<div class="relative w-full">
			<Icon
				class="pointer-events-none absolute top-3 left-3 z-10 size-5 text-gray-500"
				aria-hidden="true"
			/>

			<input
				{id}
				name={id}
				{type}
				class="input validator peer input-bordered w-full pl-10"
				{required}
				{readonly}
				{pattern}
				placeholder={label}
				aria-label={label}
				{value}
				{oninput}
				onblur={(e) => e.currentTarget.classList.add('touched')}
				minlength={minLength}
				maxlength={maxLength}
				title={hint}
			/>

			<p
				class="text-error max-h-0 overflow-hidden text-xs opacity-0 transition-all duration-300 ease-in-out
                      peer-[&.touched:invalid]:mt-1 peer-[&.touched:invalid]:max-h-[5rem] peer-[&.touched:invalid]:opacity-100
                      peer-[&:not(:placeholder-shown):invalid]:mt-1 peer-[&:not(:placeholder-shown):invalid]:max-h-[5rem] peer-[&:not(:placeholder-shown):invalid]:opacity-100"
			>
				{hint || `${label} is invalid`}
			</p>
		</div>
	</div>
{/snippet}

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
				<span class="text-2xl font-bold">Novus</span>
			</a>
			<h1 class="font-josefin text-4xl font-bold">Đăng nhập</h1>
			<p class="text-base-content/70 mt-2">Hãy nhập thông tin vào bên dưới.</p>

			<form
				class="mt-8 space-y-4"
				method="POST"
				action="?/login"
				use:enhance={() => {
					submitting = true;
					document.querySelectorAll('input.validator').forEach((el) => el.classList.add('touched'));

					return async ({ result, update }) => {
						submitting = false;
						if (result.type === 'success') {
							showToast({ message: 'Welcome back!', type: 'success' });
							await invalidateAll();
							await goto('/');
						} else {
							await update();
						}
					};
				}}
			>
				{@render inputField(
					'loginId',
					'Tên tài khoản hoặc email',
					loginId,
					(e) => (loginId = (e.target as HTMLInputElement).value),
					User,
					'text',
					true,
					false,
					undefined,
					undefined,
					undefined,
					'Please enter your username or email.',
				)}

				<div class="flex flex-col gap-1">
					{@render inputField(
						'password',
						'Mật khẩu',
						password,
						(e) => (password = (e.target as HTMLInputElement).value),
						Lock,
						'password',
						true,
						false,
						undefined,
						undefined,
						undefined,
						'Password is required.',
					)}
					<div class="flex justify-end">
						<a href="/forgot-password" class="link-hover link text-base-content/70 text-xs">
							Quên mật khẩu?
						</a>
					</div>
				</div>

				<div
					class="grid w-full transition-[grid-template-rows] duration-300 ease-in-out"
					class:grid-rows-[1fr]={page.form?.message}
					class:grid-rows-[0fr]={!page.form?.message}
				>
					<div class="overflow-hidden">
						<div
							role="alert"
							aria-live="assertive"
							class="alert mb-4 w-full py-2 text-sm {page.form?.type === 'success'
								? 'alert-success'
								: 'alert-error'}"
						>
							{page.form?.message ?? ''}
						</div>
					</div>
				</div>

				<div class="form-control pt-2 text-center md:text-left">
					<button
						bind:this={submitBtn}
						type="submit"
						class="btn btn-primary w-full px-6"
						disabled={submitting}
						style="view-transition-name: auth-submit"
					>
						{#if submitting}
							<span class="loading loading-spinner" aria-hidden="true"></span>
							Đang đăng nhập...
						{:else}
							Đăng nhập
						{/if}
					</button>
				</div>
			</form>

			<div class="divider">HOẶC</div>

			<div
				bind:this={googleBtn}
				class="flex !w-full justify-center overflow-hidden"
				aria-label="Continue with Google"
			></div>

			<div class="mt-4 text-sm">
				Chưa có tài khoản?
				<a href="/register" class="link-primary link">Đăng ký</a>
			</div>
		</div>
	</div>

	<div
		class="hidden h-full items-center justify-center overflow-visible p-5 pr-0 lg:flex lg:translate-x-20"
	>
		<enhanced:img
			src="$lib/assets/backgrounds/login_background.jpg"
			class="h-[70vh] max-h-[70vh] min-h-[70svh] w-auto max-w-none rounded-xl object-cover shadow-xl"
			alt="Login background illustration"
			loading="lazy"
		/>
	</div>
</div>
