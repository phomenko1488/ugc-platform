package com.platform.ugc.controller.auth;

import com.platform.ugc.dto.auth.AuthResponseDTO;
import com.platform.ugc.dto.auth.AuthUserDTO;
import com.platform.ugc.dto.auth.LoginRequestDTO;
import com.platform.ugc.dto.auth.RefreshRequestDTO;
import com.platform.ugc.dto.auth.TelegramAuthRequestDTO;
import com.platform.ugc.dto.common.ApiEnvelope;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.security.JwtService;
import com.platform.ugc.security.TelegramAuthException;
import com.platform.ugc.security.TelegramAuthService;
import com.platform.ugc.security.TelegramInitData;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Module 1: authentication.
 * <p>
 * - POST /api/v1/auth/login       — email + password (Advertiser / Moderator / Partner / Admin).
 * - POST /api/v1/auth/tg-webapp   — Telegram WebApp initData (Worker; auto-registers on first use).
 * - POST /api/v1/auth/refresh     — exchanges a refresh token for a new access+refresh pair.
 * <p>
 * These three endpoints must be permitAll() in SecurityConfig — see SecurityConfig.PROPOSED.java.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TelegramAuthService telegramAuthService;

    @PostMapping("/login")
    public ResponseEntity<ApiEnvelope<AuthResponseDTO>> login(@RequestBody LoginRequestDTO request) {
        if (isBlank(request.email()) || isBlank(request.password())) {
            return ResponseEntity.badRequest().body(ApiEnvelope.error("email и password обязательны"));
        }

        Optional<User> userOpt = userRepository.findByEmail(request.email());

        if (userOpt.isEmpty() || userOpt.get().getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), userOpt.get().getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiEnvelope.error("Неверный email или пароль"));
        }

        return ResponseEntity.ok(ApiEnvelope.ok(issueTokens(userOpt.get())));
    }

    @PostMapping("/tg-webapp")
    public ResponseEntity<ApiEnvelope<AuthResponseDTO>> telegramWebApp(@RequestBody TelegramAuthRequestDTO request) {
        if (isBlank(request.initData())) {
            return ResponseEntity.badRequest().body(ApiEnvelope.error("initData обязателен"));
        }

        TelegramInitData initData;
        try {
            initData = telegramAuthService.validate(request.initData());
        } catch (TelegramAuthException e) {
            log.warn("Telegram initData rejected: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiEnvelope.error(e.getMessage()));
        }

        User user = userRepository.findByTelegramId(initData.telegramId())
                .orElseGet(() -> registerTelegramWorker(initData));

        return ResponseEntity.ok(ApiEnvelope.ok(issueTokens(user)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiEnvelope<AuthResponseDTO>> refresh(@RequestBody RefreshRequestDTO request) {
        if (isBlank(request.refreshToken())) {
            return ResponseEntity.badRequest().body(ApiEnvelope.error("refreshToken обязателен"));
        }

        Optional<Claims> claimsOpt = jwtService.parseClaims(request.refreshToken());

        if (claimsOpt.isEmpty() || !jwtService.isRefreshToken(claimsOpt.get())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiEnvelope.error("Невалидный refresh token"));
        }

        Long userId = jwtService.extractUserId(claimsOpt.get());
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiEnvelope.error("Пользователь не найден"));
        }

        return ResponseEntity.ok(ApiEnvelope.ok(issueTokens(userOpt.get())));
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private User registerTelegramWorker(TelegramInitData initData) {
        log.info("--- Регистрация нового воркера через Telegram WebApp: tgId={} ---", initData.telegramId());

        String username = initData.username() != null && !initData.username().isBlank()
                ? initData.username()
                : (initData.firstName() != null ? initData.firstName() : "tg_" + initData.telegramId());

        String affiliateTag = "wrk_" + initData.telegramId();

        User user = User.builder()
                .username(username)
                .telegramId(initData.telegramId())
                .affiliateTag(affiliateTag)
                .availableBalance(BigDecimal.ZERO)
                .roles(new HashSet<>(Set.of(Role.ROLE_WORKER)))
                .build();

        return userRepository.save(user);
    }

    private AuthResponseDTO issueTokens(User user) {
        Set<String> roleNames = user.getRoles() == null
                ? Set.of()
                : user.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toSet());

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getUsername(), user.getEmail(), roleNames);
        String refreshToken = jwtService.generateRefreshToken(user.getId());

        return new AuthResponseDTO(
                accessToken,
                refreshToken,
                jwtService.getAccessTokenTtlMinutes() * 60,
                AuthUserDTO.from(user)
        );
    }
}
