package com.platform.ugc.controller.partner;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.partner.PartnerAdvertiserSummaryDTO;
import com.platform.ugc.dto.partner.PartnerDashboardDTO;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.service.partner.PartnerAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * B2B Partner Cabinet routes — dashboard KPIs, the referred-advertisers CRM, and the partner's own
 * contract terms. All three are read-only views over {@link PartnerAnalyticsService}, which itself
 * enforces that {@code partnerId} actually carries {@code ROLE_PARTNER}.
 */
@RestController
@RequestMapping("/api/v1/partner")
@RequiredArgsConstructor
public class PartnerController {

    private final PartnerAnalyticsService partnerAnalyticsService;

    @GetMapping("/{partnerId}/dashboard")
    public ResponseEntity<ResponseDTO<PartnerDashboardDTO>> getDashboard(@PathVariable Long partnerId) {
        return ResponseEntity.ok(ResponseDTO.ok(partnerAnalyticsService.getPartnerDashboard(partnerId)));
    }

    @GetMapping("/{partnerId}/advertisers")
    public ResponseEntity<ResponseDTO<PageResponseDTO<PartnerAdvertiserSummaryDTO>>> getAdvertisers(
            @PathVariable Long partnerId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(partnerAnalyticsService.getReferredAdvertisers(partnerId, search, page, size)));
    }

    @GetMapping("/{partnerId}/terms")
    public ResponseEntity<ResponseDTO<B2BPartnerTerms>> getTerms(@PathVariable Long partnerId) {
        return ResponseEntity.ok(ResponseDTO.ok(partnerAnalyticsService.getPartnerTerms(partnerId)));
    }
}
