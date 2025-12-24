// ABOUTME: Utilities for converting unlock dates to datetime-local strings.
// ABOUTME: Provides rounding helpers to align unlock times to consistent intervals.

const DEFAULT_INTERVAL_MINUTES = 15;

const pad = (value: number) => String(value).padStart(2, '0');

export const roundDownToInterval = (
	input: Date,
	intervalMinutes = DEFAULT_INTERVAL_MINUTES
): Date => {
	const intervalMs = intervalMinutes * 60 * 1000;
	const roundedTime = Math.floor(input.getTime() / intervalMs) * intervalMs;
	return new Date(roundedTime);
};

export const formatDatetimeLocal = (date: Date): string => {
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const getRoundedLocalDatetimeLocalString = (now: Date = new Date()): string => {
	const rounded = roundDownToInterval(now);
	return formatDatetimeLocal(rounded);
};
