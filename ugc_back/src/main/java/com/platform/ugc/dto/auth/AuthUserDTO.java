package com.platform.ugc.dto.auth;

import com.platform.ugc.model.user.User;

import java.util.Set;
import java.util.stream.Collectors;

/** Slim, JWT-response-safe view of a User — never include passwordHash here. */
public record AuthUserDTO(
        Long id,
        String username,
        String email,
        Long telegramId,
        String affiliateTag,
        Set<String> roles
) {
    public static AuthUserDTO from(User user) {
        return new AuthUserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getTelegramId(),
                user.getAffiliateTag(),
                user.getRoles() == null
                        ? Set.of()
                        : user.getRoles().stream().map(Enum::name).collect(Collectors.toSet())
        );
    }
}
