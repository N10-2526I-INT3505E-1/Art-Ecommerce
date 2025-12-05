import { writable } from 'svelte/store';

// Interface for the toast object, aligning with the new usage
export interface Toast {
	message: string;
	background: string; // This will hold classes like 'variant-filled-success'
}

function createToastStore() {
	const { subscribe, set } = writable<Toast | null>(null);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function trigger(toast: Toast, duration = 5000) {
		// Clear any existing timeout to avoid overlapping toasts
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		set(toast);

		// Set a timeout to automatically hide the toast
		timeoutId = setTimeout(() => {
			set(null);
			timeoutId = null;
		}, duration);
	}

	function hide() {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		set(null);
	}

	return {
		subscribe,
		trigger,
		hide,
	};
}

export const toastStore = createToastStore();

/**
 * A backward-compatible function to show toasts.
 * It converts the old `type`-based format to the new `background`-based one.
 * @param toast An object with message and type ('success' | 'error')
 * @param duration Optional duration in milliseconds
 */
export function showToast(
	toast: { message: string; type: 'success' | 'error' },
	duration?: number,
) {
	toastStore.trigger(
		{
			message: toast.message,
			background: `variant-filled-${toast.type}`,
		},
		duration,
	);
}

export function hideToast() {
	toastStore.hide();
}
