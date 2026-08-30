package com.platform.ugc.controller.advertiser;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.advertiser.AdvertiserDashboardDTO;
import com.platform.ugc.dto.advertiser.AdvertiserDeepAnalyticsDTO;
import com.platform.ugc.dto.advertiser.CampaignPerformanceDTO;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.service.advertiser.AdvertiserAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/advertiser/{advertiserId}")
@RequiredArgsConstructor
public class AdvertiserDashboardController {

    private final AdvertiserAnalyticsService advertiserAnalyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<ResponseDTO<AdvertiserDashboardDTO>> getDashboard(@PathVariable Long advertiserId) {
        return ResponseEntity.ok(ResponseDTO.ok(advertiserAnalyticsService.getDashboard(advertiserId)));
    }

    /**
     * Advertiser Analytics Hub. {@code from}/{@code to} are optional ISO-8601 dates
     * ({@code yyyy-MM-dd}); omitting either defaults the whole range to the trailing 30 days.
     */
    @GetMapping("/analytics")
    public ResponseEntity<ResponseDTO<AdvertiserDeepAnalyticsDTO>> getDeepAnalytics(
            @PathVariable Long advertiserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(advertiserAnalyticsService.getDeepAnalytics(advertiserId, from, to)));
    }

    /**
     * Campaign-comparison table, split out of {@link #getDeepAnalytics} into its own paginated
     * endpoint (pagination initiative) — same {@code from}/{@code to} semantics as the analytics
     * endpoint above.
     */
    @GetMapping("/analytics/campaigns")
    public ResponseEntity<ResponseDTO<PageResponseDTO<CampaignPerformanceDTO>>> getCampaignComparison(
            @PathVariable Long advertiserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(advertiserAnalyticsService.getCampaignComparison(advertiserId, from, to, page, size)));
    }
}
