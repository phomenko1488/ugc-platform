package com.platform.ugc.controller.user;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.auth.TgBindTokenResponseDTO;
import com.platform.ugc.dto.user.UserCreateRequestDTO;
import com.platform.ugc.dto.user.UserResponseDTO;
import com.platform.ugc.model.auth.OneTimeToken;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.ReferralTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.security.CurrentUserUtil;
import com.platform.ugc.service.auth.OneTimeTokenService;
import com.platform.ugc.service.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final OneTimeTokenService oneTimeTokenService;

    @Value("${telegram.bot.username:ugc_flow_bot}")
    private String telegramBotUsername;

    @Value("${app.telegram.tg-bind-ttl-minutes:15}")
    private long tgBindTtlMinutes;

    // NOTE on this whole controller: every {id}-scoped endpoint below now checks
    // CurrentUserUtil.assertSelfOrAdmin(id) — the audit found that none of them compared the
    // path-variable id to who was actually holding the JWT, so any authenticated user could read
    // or mutate ANY other user's profile/wallet/referrals/bind-token by substituting a different
    // id. /register, /{id}/ban, /{id}/role and /{id}/terms/** are additionally restricted to
    // ROLE_ADMIN in SecurityConfig — they were reachable by any authenticated role before, which
    // for /{id}/role in particular meant any Worker could grant themselves ROLE_ADMIN.

    /**
     * Self-service registration should go through POST /api/v1/auth/register (which whitelists
     * targetRole to ADVERTISER/PARTNER). This endpoint is for admin-provisioned accounts
     * (Moderator/Admin, or a Worker created by an admin without Telegram) — UserService.registerUser
     * places no restriction on targetRole, so it must never be reachable by a non-admin (see the
     * SecurityConfig rule added alongside this).
     */
    @PostMapping("/register")
    public ResponseEntity<ResponseDTO<UserResponseDTO>> register(@Valid @RequestBody UserCreateRequestDTO request) {
        User user = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.ok("Пользователь успешно зарегистрирован", UserResponseDTO.fromEntity(user)));
    }

    /** The authenticated caller's own profile — always safe, needs no ownership check by construction. */
    @GetMapping("/me")
    public ResponseEntity<ResponseDTO<UserResponseDTO>> getCurrentUser() {
        return ResponseEntity.ok(ResponseDTO.ok(userService.getUserProfile(CurrentUserUtil.id())));
    }

    /** ROLE_ADMIN only (see SecurityConfig) — returns every user's email/balances/wallet/PII. */
    @GetMapping
    public ResponseEntity<ResponseDTO<List<UserResponseDTO>>> getAllUsers() {
        return ResponseEntity.ok(ResponseDTO.ok(userService.getAllUsers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO<UserResponseDTO>> getUserById(@PathVariable Long id) {
        CurrentUserUtil.assertSelfOrAdmin(id);
        return ResponseEntity.ok(ResponseDTO.ok(userService.getUserProfile(id)));
    }

    @PutMapping("/{id}/wallet")
    public ResponseEntity<ResponseDTO<Void>> updateWallet(
            @PathVariable Long id,
            @RequestParam String walletAddress
    ) {
        CurrentUserUtil.assertSelfOrAdmin(id);
        userService.updateTrc20Wallet(id, walletAddress);
        return ResponseEntity.ok(ResponseDTO.ok("TRC-20 кошелек сохранен", null));
    }

    /**
     * Issues a one-time, 15-minute Telegram-binding token and the ready-made deep link
     * ({@code t.me/<bot>?start=bind_<token>}) — the frontend's "Link Telegram" banner (Advertiser/
     * Partner dashboards, shown while {@code telegramId} is null) points its button straight at
     * {@code deepLink}. Sending {@code /start bind_TOKEN} to the bot completes the binding.
     * <p>
     * Ownership check added: this used to accept ANY {@code id}, so any authenticated user could
     * mint a bind token for someone else's account, send the deep link's /start command from
     * their own Telegram, and take over that account (their telegramId would overwrite the
     * victim's). Only the account owner (or an admin) may request a token for it now.
     */
    @PostMapping("/{id}/tg-bind-token")
    public ResponseEntity<ResponseDTO<TgBindTokenResponseDTO>> issueTgBindToken(@PathVariable Long id) {
        CurrentUserUtil.assertSelfOrAdmin(id);
        User user = userService.getById(id);
        String token = oneTimeTokenService.issue(user, OneTimeToken.Purpose.TG_BIND, Duration.ofMinutes(tgBindTtlMinutes));
        String deepLink = "https://t.me/" + telegramBotUsername + "?start=bind_" + token;
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(tgBindTtlMinutes));
        return ResponseEntity.ok(ResponseDTO.ok(new TgBindTokenResponseDTO(token, deepLink, expiresAt)));
    }

    @GetMapping("/{id}/referrals")
    public ResponseEntity<ResponseDTO<List<UserResponseDTO>>> getReferrals(@PathVariable Long id) {
        CurrentUserUtil.assertSelfOrAdmin(id);
        return ResponseEntity.ok(ResponseDTO.ok(userService.getReferrals(id)));
    }

    @PutMapping("/{id}/ban")
    public ResponseEntity<ResponseDTO<Void>> setBanStatus(
            @PathVariable Long id,
            @RequestParam boolean isBanned
    ) {
        userService.setUserBanStatus(id, isBanned);
        return ResponseEntity.ok(ResponseDTO.ok("Статус блокировки обновлен", null));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<ResponseDTO<Void>> addRole(
            @PathVariable Long id,
            @RequestParam Role role
    ) {
        userService.addRoleToUser(id, role);
        return ResponseEntity.ok(ResponseDTO.ok("Роль добавлена", null));
    }

    @PutMapping("/{id}/terms/b2c")
    public ResponseEntity<ResponseDTO<Void>> updateB2CTerms(
            @PathVariable Long id,
            @RequestBody ReferralTerms terms
    ) {
        userService.updateCustomB2CTerms(id, terms);
        return ResponseEntity.ok(ResponseDTO.ok("B2C условия обновлены", null));
    }

    @PutMapping("/{id}/terms/b2b")
    public ResponseEntity<ResponseDTO<Void>> updateB2BTerms(
            @PathVariable Long id,
            @RequestBody B2BPartnerTerms terms
    ) {
        userService.updateCustomB2BTerms(id, terms);
        return ResponseEntity.ok(ResponseDTO.ok("B2B условия обновлены", null));
    }
}