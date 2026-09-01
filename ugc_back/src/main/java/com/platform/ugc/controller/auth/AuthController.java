package com.platform.ugc.controller.auth;

import com.platform.ugc.dto.auth.AuthResponseDTO;
import com.platform.ugc.dto.auth.AuthUserDTO;
import com.platform.ugc.dto.auth.ForgotPasswordRequestDTO;
import com.platform.ugc.dto.auth.LoginRequestDTO;
import com.platform.ugc.dto.auth.RefreshRequestDTO;
import com.platform.ugc.dto.auth.RegisterRequestDTO;
import com.platform.ugc.dto.auth.ResetPasswordRequestDTO;
import com.platform.ugc.dto.auth.TelegramAuthRequestDTO;
import com.platform.ugc.dto.common.ApiEnvelope;
import com.platform.ugc.dto.user.UserCreateRequestDTO;
import com.platform.ugc.email.EmailService;
import com.platform.ugc.model.auth.OneTimeToken;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.security.JwtService;
import com.platform.ugc.security.TelegramAuthException;
import com.platform.ugc.security.TelegramAuthService;
import com.platform.ugc.security.TelegramInitData;
import com.platform.ugc.service.auth.OneTimeTokenService;
import com.platform.ugc.service.user.UserService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Duration;
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
    private final UserService userService;
    private final OneTimeTokenService oneTimeTokenService;
    private final EmailService emailService;

    @Value("${app.auth.password-reset-ttl-minutes:60}")
    private long passwordResetTtlMinutes;

    /**
     * Public self-registration. Only ROLE_ADVERTISER and ROLE_PARTNER may register this way —
     * Workers register implicitly via the Telegram bot/WebApp, Moderator/Admin accounts are
     * admin-provisioned. Issues tokens immediately (like /login) so the frontend can log the new
     * account straight in, and fires a welcome email off-thread.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiEnvelope<AuthResponseDTO>> register(@Valid @RequestBody RegisterRequestDTO request) {
        if (request.role() != Role.ROLE_ADVERTISER && request.role() != Role.ROLE_PARTNER) {
            return ResponseEntity.badRequest().body(ApiEnvelope.error(
                    "Публичная регистрация доступна только для рекламодателя или партнера."));
        }

        try {
            User user = userService.registerUser(new UserCreateRequestDTO(
                    null,
                    request.email(),
                    request.password(),
                    request.username(),
                    request.role(),
                    request.refTag()
            ));
            emailService.sendWelcomeEmail(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiEnvelope.ok(issueTokens(user)));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiEnvelope.error(e.getMessage()));
        }
    }

    /**
     * Always responds with a generic success message regardless of whether the email is
     * registered — otherwise this endpoint would let anyone enumerate which emails have accounts.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiEnvelope<String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequestDTO request) {
        userRepository.findByEmail(request.email().trim().toLowerCase())
                .filter(u -> u.getPasswordHash() != null) // Telegram-only accounts have no password to reset.
                .ifPresent(user -> {
                    String token = oneTimeTokenService.issue(user, OneTimeToken.Purpose.PASSWORD_RESET,
                            Duration.ofMinutes(passwordResetTtlMinutes));
                    emailService.sendPasswordResetEmail(user, token);
                });

        return ResponseEntity.ok(ApiEnvelope.ok("Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля."));
    }

    // @Transactional here (not just inside OneTimeTokenService.consume()) so token-deletion and
    // the password-hash update commit together: if the save below ever failed, the token
    // shouldn't already be gone, or the person would be locked out with no way to retry short of
    // requesting a brand-new email.
    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<ApiEnvelope<String>> resetPassword(@Valid @RequestBody ResetPasswordRequestDTO request) {
        Optional<User> userOpt = oneTimeTokenService.consume(request.token(), OneTimeToken.Purpose.PASSWORD_RESET);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiEnvelope.error("Ссылка сброса пароля недействительна или устарела."));
        }

        User user = userOpt.get();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("Password reset completed for user [ID: {}]", user.getId());

        return ResponseEntity.ok(ApiEnvelope.ok("Пароль успешно изменен."));
    }

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
