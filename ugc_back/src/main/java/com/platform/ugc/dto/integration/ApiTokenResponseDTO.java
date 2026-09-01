package com.platform.ugc.dto.integration;

import com.platform.ugc.model.integration.ApiToken;

import java.time.Instant;

/** Listing shape — never carries the plaintext secret, only the masked {@code preview}. */
public record ApiTokenResponseDTO(
        Long id,
        String label,
        String preview,
        Instant createdAt,
        Instant lastUsedAt,
        boolean revoked
) {
    public static ApiTokenResponseDTO fromEntity(ApiToken token) {
        return new ApiTokenResponseDTO(
                token.getId(),
                token.getLabel(),
                token.getTokenPreview() + "••••••••••••••••••••",
                token.getCreatedAt(),
                token.getLastUsedAt(),
                token.isRevoked()
        );
    }
}
