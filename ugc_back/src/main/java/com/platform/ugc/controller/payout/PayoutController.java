package com.platform.ugc.controller.payout;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.payout.PayoutResponseDTO;
import com.platform.ugc.service.payout.PayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * {@code /api/v1/payouts} — the Worker/Partner Wallet pages' own withdrawal flow
 * ({@code api.requestPayout}/{@code api.getPayoutHistory}), which previously called an endpoint
 * that didn't exist yet on the backend (see the caveat comment that used to sit over these
 * methods in api/index.js). Admin-side management of these same rows (process/complete/reject)
 * lives under {@code AdminController} instead, gated to ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/payouts")
@RequiredArgsConstructor
public class PayoutController {

    private final PayoutService payoutService;

    public record PayoutRequestDTO(Long userId, BigDecimal amount, String trc20Wallet) {
    }

    @PostMapping
    public ResponseEntity<ResponseDTO<PayoutResponseDTO>> requestPayout(@RequestBody PayoutRequestDTO request) {
        PayoutResponseDTO created = payoutService.requestPayout(request.userId(), request.amount(), request.trc20Wallet());
        return ResponseEntity.status(HttpStatus.CREATED).body(ResponseDTO.ok("Заявка на вывод создана", created));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ResponseDTO<PageResponseDTO<PayoutResponseDTO>>> getPayoutHistory(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(payoutService.getPayoutsForUser(userId, page, size)));
    }
}
