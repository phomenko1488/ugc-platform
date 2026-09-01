package com.platform.ugc.dto.integration;

import java.time.Instant;

/**
 * Returned exactly once, from the generate endpoint — the only response that ever carries the
 * plaintext {@code token}. The frontend must show it to the advertiser and warn them to copy it
 * now; every later listing only ever returns {@link ApiTokenResponseDTO}'s masked preview.
 */
public record ApiTokenCreatedResponseDTO(
        Long id,
        String label,
        String token,
        Instant createdAt
) {
}
