package com.platform.ugc.service.admin;

import com.platform.ugc.dto.admin.*;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.payout.PayoutResponseDTO;
import com.platform.ugc.model.payout.Payout;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.Role;

import java.math.BigDecimal;
import java.util.List;

/**
 * Back-office control plane for ROLE_ADMIN: platform-wide P&L, user management (ban/adjust
 * balance/B2B terms), the global ledger feed, the payout desk's listing side (mutations delegate
 * to {@link com.platform.ugc.service.payout.PayoutService}), offer monitoring, platform/GEO
 * reference data, and the default-margin setting.
 */
public interface AdminService {

    AdminDashboardDTO getDashboard();

    PageResponseDTO<AdminLedgerEntryDTO> getGlobalLedger(String entryType, int page, int size);

    PageResponseDTO<AdminUserSummaryDTO> getUsers(Role role, String search, int page, int size);

    void setUserBanStatus(Long userId, boolean isBanned);

    void adjustUserBalance(Long userId, BigDecimal amount, String comment);

    void updatePartnerTerms(Long userId, B2BPartnerTerms terms);

    PageResponseDTO<PayoutResponseDTO> getPayouts(Payout.Status status, int page, int size);

    PageResponseDTO<AdminOfferSummaryDTO> getAllOffers(int page, int size);

    void setOfferStatus(Long offerId, boolean isActive);

    List<AdminPlatformDTO> getAllPlatforms();

    AdminPlatformDTO createPlatform(PlatformCreateRequestDTO request);

    AdminPlatformDTO togglePlatform(Long id);

    List<AdminGeoDTO> getAllGeos();

    AdminGeoDTO createGeo(GeoCreateRequestDTO request);

    AdminGeoDTO toggleGeo(Long id);

    void updateDefaultMargin(BigDecimal marginPercentage);
}
