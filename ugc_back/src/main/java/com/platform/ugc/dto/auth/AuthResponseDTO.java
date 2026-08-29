package com.platform.ugc.dto.auth;

public record AuthResponseDTO(
        String accessToken,
        String refreshToken,
        long expiresInSeconds,
        AuthUserDTO user
) {
}
