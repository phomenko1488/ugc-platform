package com.platform.ugc.dto.integration;

import jakarta.validation.constraints.Size;

public record UpdatePostbackUrlRequestDTO(
        @Size(max = 512, message = "URL постбека не должен превышать 512 символов")
        String postbackUrl
) {
}
