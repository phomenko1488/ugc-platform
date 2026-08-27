package com.platform.ugc.controller.user;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.user.UserCreateRequestDTO;
import com.platform.ugc.dto.user.UserResponseDTO;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.ReferralTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.service.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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