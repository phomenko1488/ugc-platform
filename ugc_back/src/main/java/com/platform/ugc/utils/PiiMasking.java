package com.platform.ugc.utils;

/**
 * Server-side port of {@code ugc-client/src/utils/mask.js}'s {@code maskHandle} — kept in sync
 * with that same "{@code @cr••••ip}" visual convention deliberately, so a masked value looks
 * identical whether the frontend happens to re-mask it or not.
 * <p>
 * This exists because the frontend-only masking utility gave a false sense of privacy: the
 * Traffic Inspector displayed masked creator handles, but the API response underneath still
 * carried the full raw handle, visible in the Network tab or to a direct API call with a valid
 * advertiser token. Use this wherever a value must never leave the backend unmasked for a given
 * caller — see {@code SubmissionResponseDTO.fromEntity(Submission, boolean)}.
 */
public final class PiiMasking {

    private static final String MASK_DOTS = "••••";

    private PiiMasking() {
    }

    /** Creator handle / display-name mask, e.g. "@creatorship" -> "@cr••••ip". */
    public static String maskHandle(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        boolean hasAt = value.startsWith("@");
        String core = hasAt ? value.substring(1) : value;
        String prefix = hasAt ? "@" : "";
        if (core.length() <= 4) {
            String head = core.isEmpty() ? "" : core.substring(0, 1);
            return prefix + head + MASK_DOTS;
        }
        String head = core.substring(0, 2);
        String tail = core.substring(core.length() - 2);
        return prefix + head + MASK_DOTS + tail;
    }
}
