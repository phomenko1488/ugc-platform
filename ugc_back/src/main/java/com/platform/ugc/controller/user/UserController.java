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

    @Value("${app.telegram.bot-username:ugc_flow_bot}")
    private String telegramBotUsername;

    @Value("${app.telegram.tg-bind-ttl-minutes:15}")
    private long tgBindTtlMinutes;

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO<UserResponseDTO>> register(@Valid @RequestBody UserCreateRequestDTO request) {
        User user = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.ok("Пользователь успешно зарегистрирован", UserResponseDTO.fromEntity(user)));
    }

    @GetMapping
    public ResponseEntity<ResponseDTO<List<UserResponseDTO>>> getAllUsers() {
        return ResponseEntity.ok(ResponseDTO.ok(userService.getAllUsers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO<UserResponseDTO>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.ok(userService.getUserProfile(id)));
    }

    @PutMapping("/{id}/wallet")
    public ResponseEntity<ResponseDTO<Void>> updateWallet(
            @PathVariable Long id,
            @RequestParam String walletAddress
    ) {
        userService.updateTrc20Wallet(id, walletAddress);
        return ResponseEntity.ok(ResponseDTO.ok("TRC-20 кошелек сохранен", null));
    }

    /**
     * Issues a one-time, 15-minute Telegram-binding token and the ready-made deep link
     * ({@code t.me/<bot>?start=bind_<token>}) — the frontend's "Link Telegram" banner (Advertiser/
     * Partner dashboards, shown while {@code telegramId} is null) points its button straight at
     * {@code deepLink}. Sending {@code /start bind_TOKEN} to the bot completes the binding.
     */
    @PostMapping("/{id}/tg-bind-token")
    public ResponseEntity<ResponseDTO<TgBindTokenResponseDTO>> issueTgBindToken(@PathVariable Long id) {
        User user = userService.getById(id);
        String token = oneTimeTokenService.issue(user, OneTimeToken.Purpose.TG_BIND, Duration.ofMinutes(tgBindTtlMinutes));
        String deepLink = "https://t.me/" + telegramBotUsername + "?start=bind_" + token;
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(tgBindTtlMinutes));
        return ResponseEntity.ok(ResponseDTO.ok(new TgBindTokenResponseDTO(token, deepLink, expiresAt)));
    }

    @GetMapping("/{id}/referrals")
    public ResponseEntity<ResponseDTO<List<UserResponseDTO>>> getReferrals(@PathVariable Long id) {
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