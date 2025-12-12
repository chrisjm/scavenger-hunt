export type AnyFunction = (...args: any[]) => any;

/**
 * Simple debounce helper for client-side usage.
 * Returns a debounced version of the given function that delays
 * execution until `delay` ms have elapsed since the last call.
 */
export function debounce<F extends AnyFunction>(fn: F, delay: number) {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	const debounced = (...args: Parameters<F>): void => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			fn(...args);
		}, delay);
	};

	debounced.cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return debounced as F & { cancel: () => void };
}
