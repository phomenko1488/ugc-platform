package com.platform.ugc.controller.advertiser;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.advertiser.AdvertiserDashboardDTO;
import com.platform.ugc.service.advertiser.AdvertiserAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/advertiser/{advertiserId}/dashboard")
@RequiredArgsConstructor
public class AdvertiserDashboardController {

    private final AdvertiserAnalyticsService advertiserAnalyticsService;

    @GetMapping
    public ResponseEntity<ResponseDTO<AdvertiserDashboardDTO>> getDashboard(@PathVariable Long advertiserId) {
        return ResponseEntity.ok(ResponseDTO.ok(advertiserAnalyticsService.getDashboard(advertiserId)));
    }
}
