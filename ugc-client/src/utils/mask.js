// Shared PII-masking helpers for the "Slate & Raw Terracotta" design system: any creator
// nickname, wallet address, transaction hash, or access-key preview shown in a table or log
// is masked head/tail with a middle-dot run rather than shown in full — matching the pattern
// specified for the platform (e.g. `8f2c••••e91a`, `@cr••••ip`). Purely a display concern: the
// underlying value passed in stays intact for search/filtering/links, only the rendered text
// is masked.

const MASK_DOTS = '••••';

/**
 * Generic head/tail mask for opaque identifiers (hashes, wallet addresses, long tokens).
 * "8f2c19a7e91a" with head=4, tail=4 -> "8f2c••••e91a".
 */
export function maskMiddle(value, head = 4, tail = 4) {
    if (!value) return value;
    const str = String(value);
    if (str.length <= head + tail) {
        // Too short to usefully reveal both ends without exposing the whole thing — keep a
        // single leading character as a visual anchor and mask the rest.
        return `${str.slice(0, 1)}${MASK_DOTS}`;
    }
    // `str.slice(-0)` is equivalent to `str.slice(0)` in JS (negative zero coerces to zero), so
    // a `tail: 0` caller asking to reveal nothing at the end would otherwise get the entire
    // remainder back — guard it explicitly rather than relying on slice's own footgun.
    const tailPart = tail > 0 ? str.slice(-tail) : '';
    return `${str.slice(0, head)}${MASK_DOTS}${tailPart}`;
}

/** Transaction hash / hex identifier mask, e.g. tronscan tx hashes: "8f2c••••e91a". */
export function maskHash(value) {
    return maskMiddle(value, 4, 4);
}

/** Wallet address mask — a little more of the head is kept since TRC-20 addresses are longer. */
export function maskWallet(value) {
    return maskMiddle(value, 6, 4);
}

/** Access-key preview mask — the backend already returns only a short leading prefix (never the
 * full secret), so this just appends a dot-run to signal "there's more, and it's hidden" rather
 * than head/tail-masking a value that's already partial. */
export function maskKeyPreview(value) {
    if (!value) return value;
    return `${value}${MASK_DOTS}${MASK_DOTS}`;
}

/**
 * Creator handle / display-name mask, e.g. "@creatorship" -> "@cr••••ip". Preserves a leading
 * "@" outside the masked span so the value still reads as a handle.
 */
export function maskHandle(value) {
    if (!value) return value;
    const str = String(value);
    const hasAt = str.startsWith('@');
    const core = hasAt ? str.slice(1) : str;
    if (core.length <= 4) {
        return `${hasAt ? '@' : ''}${core.slice(0, 1)}${MASK_DOTS}`;
    }
    return `${hasAt ? '@' : ''}${core.slice(0, 2)}${MASK_DOTS}${core.slice(-2)}`;
}
