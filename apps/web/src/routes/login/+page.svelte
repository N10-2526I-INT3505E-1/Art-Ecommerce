<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
    import { showToast } from '$lib/toastStore';
    import { Lock, User, type Icon as LucideIcon } from 'lucide-svelte';
    import { onMount } from 'svelte';

    let submitting = $state(false);

    let googleBtn = $state<HTMLDivElement>();

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
            callback: handleGoogleLogin
        });

        if (googleBtn) {
            google.accounts.id.renderButton(googleBtn, {
                theme: 'outline',
                size: 'large',
                width: '400'
            });
        }
    });

    async function handleGoogleLogin(response: google.accounts.id.CredentialResponse) {
        try {
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
                const params = new URLSearchParams();
                if (data.email) params.set('email', data.email);
                if (data.first_name) params.set('firstName', data.first_name);
                if (data.last_name) params.set('lastName', data.last_name);
                await goto(`/register?${params.toString()}`);
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
                value={value}
                oninput={oninput}
                onblur={(e) => e.currentTarget.classList.add('touched')}
                minlength={minLength}
                maxlength={maxLength}
                title={hint} 
            />

            <p class="text-error overflow-hidden text-xs transition-all duration-300 ease-in-out max-h-0 opacity-0 
                      peer-[&:not(:placeholder-shown):invalid]:max-h-[5rem] peer-[&:not(:placeholder-shown):invalid]:opacity-100 peer-[&:not(:placeholder-shown):invalid]:mt-1
                      peer-[&.touched:invalid]:max-h-[5rem] peer-[&.touched:invalid]:opacity-100 peer-[&.touched:invalid]:mt-1">
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
                <span class="text-2xl font-bold">L'Artelier</span>
            </a>
            <h1 class="font-josefin text-4xl font-bold">Welcome back</h1>
            <p class="text-base-content/70 mt-2">Please enter your details.</p>

            <form
                class="mt-8 space-y-4"
                method="POST"
                action="?/login"
                use:enhance={() => {
                    submitting = true;
                    document.querySelectorAll('input.validator').forEach(el => el.classList.add('touched'));

                    return async ({ result, update }) => {
                        submitting = false;
                        if (result.type === 'success') {
                            showToast({ message: 'Welcome back!', type: 'success' });
                            await goto('/');
                        } else {
                            await update();
                        }
                    };
                }}
            >
                {@render inputField(
                    'loginId',
                    'Username or Email',
                    loginId,
                    (e) => (loginId = (e.target as HTMLInputElement).value),
                    User,
                    'text',
                    true,
                    false,
                    undefined,
                    undefined,
                    undefined,
                    'Please enter your username or email.'
                )}

                <div class="flex flex-col gap-1">
                    {@render inputField(
                        'password',
                        'Password',
                        password,
                        (e) => (password = (e.target as HTMLInputElement).value),
                        Lock,
                        'password',
                        true,
                        false,
                        undefined,
                        undefined,
                        undefined,
                        'Password is required.'
                    )}
                    <div class="flex justify-end">
                        <a href="/forgot-password" class="link-hover link text-xs text-base-content/70">
                            Forgot password?
                        </a>
                    </div>
                </div>

                <div class="grid w-full transition-[grid-template-rows] duration-300 ease-in-out"
                     class:grid-rows-[1fr]={page.form?.message}
                     class:grid-rows-[0fr]={!page.form?.message}>
                    <div class="overflow-hidden">
                        <div
                            role="alert"
                            aria-live="assertive"
                            class="alert w-full text-sm py-2 mb-4 {page.form?.type === 'success' ? 'alert-success' : 'alert-error'}"
                        >
                            {page.form?.message ?? ''}
                        </div>
                    </div>
                </div>

                <div class="form-control pt-2 text-center md:text-left">
                    <button
                        type="submit"
                        class="btn btn-primary px-6 w-full"
                        disabled={submitting}
                        style="view-transition-name: auth-submit"
                    >
                        {#if submitting}
                            <span class="loading loading-spinner" aria-hidden="true"></span>
                            Logging in...
                        {:else}
                            Log in
                        {/if}
                    </button>
                </div>
            </form>

            <div class="divider">OR</div>

            <div
                bind:this={googleBtn}
                class="w-full flex justify-center"
                aria-label="Continue with Google"
            ></div>

            <div class="mt-4 text-sm">
                Don't have an account?
                <a href="/register" class="link-primary link">Sign up</a>
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