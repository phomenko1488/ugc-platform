package com.platform.ugc.controller.admin;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.admin.*;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.payout.PayoutResponseDTO;
import com.platform.ugc.model.payout.Payout;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.service.admin.AdminService;
import com.platform.ugc.service.payout.PayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * {@code /api/v1/admin} — the Back-Office (Admin Module). Every endpoint here is gated to
 * {@code ROLE_ADMIN} alone by {@code SecurityConfig}. Payout mutation endpoints delegate straight
 * to {@link PayoutService} (the same service {@code PayoutController} uses to create requests in
 * the first place) rather than duplicating that lifecycle logic here.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final PayoutService payoutService;

    // --- Дашборд и Аналитика ---

    @GetMapping("/dashboard")
    public ResponseEntity<ResponseDTO<AdminDashboardDTO>> getDashboard() {
        return ResponseEntity.ok(ResponseDTO.ok(adminService.getDashboard()));
    }

    @GetMapping("/ledger")
    public ResponseEntity<ResponseDTO<PageResponseDTO<AdminLedgerEntryDTO>>> getGlobalLedger(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(adminService.getGlobalLedger(type, page, size)));
    }

    // --- Управление пользователями ---

    @GetMapping("/users")
    public ResponseEntity<ResponseDTO<PageResponseDTO<AdminUserSummaryDTO>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Role parsedRole = parseRole(role);
        return ResponseEntity.ok(ResponseDTO.ok(adminService.getUsers(parsedRole, search, page, size)));
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<ResponseDTO<Void>> setUserStatus(@PathVariable Long userId, @RequestParam boolean isBanned) {
        adminService.setUserBanStatus(userId, isBanned);
        return ResponseEntity.ok(ResponseDTO.ok(isBanned ? "Пользователь заблокирован" : "Пользователь разблокирован", null));
    }

    @PostMapping("/users/{userId}/balance-adjust")
    public ResponseEntity<ResponseDTO<Void>> adjustBalance(@PathVariable Long userId, @RequestBody AdminBalanceAdjustRequestDTO request) {
        adminService.adjustUserBalance(userId, request.amount(), request.comment());
        return ResponseEntity.ok(ResponseDTO.ok("Баланс скорректирован", null));
    }

    @PutMapping("/users/{userId}/b2b-terms")
    public ResponseEntity<ResponseDTO<Void>> updatePartnerTerms(@PathVariable Long userId, @RequestBody B2BPartnerTerms terms) {
        adminService.updatePartnerTerms(userId, terms);
        return ResponseEntity.ok(ResponseDTO.ok("Условия партнера обновлены", null));
    }

    // --- Деск выплат ---

    @GetMapping("/payouts")
    public ResponseEntity<ResponseDTO<PageResponseDTO<PayoutResponseDTO>>> getPayouts(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Payout.Status parsed = (status == null || status.isBlank()) ? null : Payout.Status.valueOf(status.trim().toUpperCase());
        return ResponseEntity.ok(ResponseDTO.ok(adminService.getPayouts(parsed, page, size)));
    }

    @PostMapping("/payouts/{payoutId}/process")
    public ResponseEntity<ResponseDTO<PayoutResponseDTO>> processPayout(@PathVariable Long payoutId) {
        return ResponseEntity.ok(ResponseDTO.ok(payoutService.process(payoutId)));
    }

    @PostMapping("/payouts/{payoutId}/complete")
    public ResponseEntity<ResponseDTO<PayoutResponseDTO>> completePayout(@PathVariable Long payoutId, @RequestBody AdminPayoutActionDTO request) {
        return ResponseEntity.ok(ResponseDTO.ok(payoutService.complete(payoutId, request.txHash())));
    }

    @PostMapping("/payouts/{payoutId}/reject")
    public ResponseEntity<ResponseDTO<PayoutResponseDTO>> rejectPayout(@PathVariable Long payoutId, @RequestBody AdminPayoutActionDTO request) {
        return ResponseEntity.ok(ResponseDTO.ok(payoutService.reject(payoutId, request.comment())));
    }

    // --- Мониторинг офферов ---

    @GetMapping("/offers")
    public ResponseEntity<ResponseDTO<PageResponseDTO<AdminOfferSummaryDTO>>> getAllOffers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(adminService.getAllOffers(page, size)));
    }

    @PutMapping("/offers/{offerId}/status")
    public ResponseEntity<ResponseDTO<Void>> setOfferStatus(@PathVariable Long offerId, @RequestParam boolean isActive) {
        adminService.setOfferStatus(offerId, isActive);
        return ResponseEntity.ok(ResponseDTO.ok("Статус оффера обновлен", null));
    }

    // --- Справочники платформ и ГЕО ---

    @GetMapping("/reference/platforms")
    public ResponseEntity<ResponseDTO<List<AdminPlatformDTO>>> getPlatforms() {
        return ResponseEntity.ok(ResponseDTO.ok(adminService.getAllPlatforms()));
    }

    @PostMapping("/reference/platforms")
    public ResponseEntity<ResponseDTO<AdminPlatformDTO>> createPlatform(@RequestBody PlatformCreateRequestDTO request) {
        return ResponseEntity.ok(ResponseDTO.ok("Платформа добавлена", adminService.createPlatform(request)));
    }

    @PutMapping("/reference/platforms/{id}/toggle")
    public ResponseEntity<ResponseDTO<AdminPlatformDTO>> togglePlatform(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.ok(adminService.togglePlatform(id)));
    }

    @GetMapping("/reference/geos")
    public ResponseEntity<ResponseDTO<List<AdminGeoDTO>>> getGeos() {
        return ResponseEntity.ok(ResponseDTO.ok(adminService.getAllGeos()));
    }

    @PostMapping("/reference/geos")
    public ResponseEntity<ResponseDTO<AdminGeoDTO>> createGeo(@RequestBody GeoCreateRequestDTO request) {
        return ResponseEntity.ok(ResponseDTO.ok("Страна добавлена", adminService.createGeo(request)));
    }

    @PutMapping("/reference/geos/{id}/toggle")
    public ResponseEntity<ResponseDTO<AdminGeoDTO>> toggleGeo(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.ok(adminService.toggleGeo(id)));
    }

    // --- Системные настройки ---

    @PutMapping("/settings/margin")
    public ResponseEntity<ResponseDTO<Void>> updateMargin(@RequestParam BigDecimal margin) {
        adminService.updateDefaultMargin(margin);
        return ResponseEntity.ok(ResponseDTO.ok("Маржа платформы обновлена", null));
    }

    /** Accepts both "WORKER" and "ROLE_WORKER" from the frontend's role filter dropdown. */
    private Role parseRole(String role) {
        if (role == null || role.isBlank() || "ALL".equalsIgnoreCase(role)) {
            return null;
        }
        String normalized = role.trim().toUpperCase();
        return Role.valueOf(normalized.startsWith("ROLE_") ? normalized : "ROLE_" + normalized);
    }
}
