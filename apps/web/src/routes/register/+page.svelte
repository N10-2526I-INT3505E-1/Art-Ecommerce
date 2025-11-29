<script lang="ts">
    import { Lock, type Icon as LucideIcon, Mail, User } from 'lucide-svelte';
    import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
    import { showToast } from '$lib/toastStore';

    let submitting = $state(false);
    
    let googleBtn = $state<HTMLDivElement>();

    let firstName = $state(page.url.searchParams.get('firstName') || '');
    let lastName = $state(page.url.searchParams.get('lastName') || '');
    let email = $state(page.url.searchParams.get('email') || '');
    let password = $state('');
    let confirmPassword = $state('');

    let isGoogleRegister = $derived(!!page.url.searchParams.get('email'));

    const patterns = {
        name: "[\\p{L}\\s'\\-]+", 
        username: "[A-Za-z0-9\\-]{5,30}",
        password: ".{6,}" 
    };

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
                firstName = data.first_name || firstName;
                lastName = data.last_name || lastName;
                email = data.email || email;
            } else {
                showToast({ message: 'Login failed', type: 'error' });
            }
        } catch (err) {
            console.error(err);
            showToast({ message: 'An error occurred', type: 'error' });
        }
    }

    function handlePasswordInput(e: Event) {
        const input = e.target as HTMLInputElement;
        const form = input.form;
        if (!form) return;
        
        const passInput = form.elements.namedItem('password') as HTMLInputElement;
        const confirmInput = form.elements.namedItem('confirmPassword') as HTMLInputElement;

        if (passInput && confirmInput) {
            if (passInput.value !== confirmInput.value && confirmInput.value !== '') {
                confirmInput.setCustomValidity('Passwords do not match.');
            } else {
                confirmInput.setCustomValidity('');
            }
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

            <p class="validator-hint overflow-hidden text-xs transition-all duration-300 ease-in-out max-h-0 opacity-0 
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
            <h1 class="font-josefin text-4xl font-bold">Create an account</h1>
            <p class="text-base-content/70 mt-2">Your journey begins here.</p>

            <form
                class="mt-8 space-y-4"
                method="POST"
                action="?/register"
    use:enhance={() => {
        submitting = true;
        document.querySelectorAll('input.validator').forEach(el => el.classList.add('touched'));

        return async ({ result, update }) => {
            submitting = false;

            if (result.type === 'redirect') {
                showToast({ message: 'Account created successfully.', type: 'success' });
                await update(); 
            } 
            else {
                await update();
            }
        };
    }}
            >
                <div class="flow-row flex gap-4">
                    <div class="w-full">
                        {@render inputField(
                            'firstName',
                            'First name',
                            firstName,
                            (e) => (firstName = (e.target as HTMLInputElement).value),
                            User,
                            'text',
                            true,
                            false,
                            patterns.name,
                            1,
                            50,
                            'Must be 1-50 characters (letters only).'
                        )}
                    </div>
                    <div class="w-full">
                        {@render inputField(
                            'lastName',
                            'Last name',
                            lastName,
                            (e) => (lastName = (e.target as HTMLInputElement).value),
                            User,
                            'text',
                            true,
                            false,
                            patterns.name,
                            1,
                            50,
                            'Must be 1-50 characters (letters only).'
                        )}
                    </div>
                </div>

                {@render inputField(
                    'username',
                    'Username',
                    '',
                    () => {},
                    User,
                    'text',
                    true,
                    false,
                    patterns.username,
                    5,
                    30,
                    '5-30 characters, letters, numbers, or dashes.'
                )}

                {@render inputField(
                    'email',
                    'Email',
                    email,
                    (e) => (email = (e.target as HTMLInputElement).value),
                    Mail,
                    'email',
                    true,
                    isGoogleRegister,
                    undefined,
                    undefined,
                    undefined,
                    'Must be a valid email address.'
                )}

                {@render inputField(
                    'password',
                    'Password',
                    password,
                    (e) => {
                        password = (e.target as HTMLInputElement).value;
                        handlePasswordInput(e);
                    },
                    Lock,
                    'password',
                    true,
                    false,
                    patterns.password,
                    6,
                    undefined,
                    'Password must be at least 6 characters.'
                )}

                {@render inputField(
                    'confirmPassword',
                    'Confirm password',
                    confirmPassword,
                    (e) => {
                        confirmPassword = (e.target as HTMLInputElement).value;
                        handlePasswordInput(e);
                    },
                    Lock,
                    'password',
                    true,
                    false,
                    undefined,
                    6,
                    undefined,
                    'Passwords do not match.'
                )}

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
                            Signing up...
                        {:else}
                            Sign up
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
                Already have an account?
                <a href="/login" class="link-primary link">Login</a>
            </div>
        </div>
    </div>

    <div
        class="hidden h-full items-center justify-center overflow-visible p-5 pr-0 lg:flex lg:translate-x-20"
    >
        <enhanced:img
            src="$lib/assets/backgrounds/register_background.jpg"
            class="h-[70vh] max-h-[70vh] min-h-[70svh] w-auto max-w-none rounded-xl object-cover shadow-xl"
            alt="Sign up background illustration"
            loading="lazy"
        />
    </div>
</div>