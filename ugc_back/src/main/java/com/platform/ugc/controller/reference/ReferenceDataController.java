package com.platform.ugc.controller.reference;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.offer.OfferResponseDTO;
import com.platform.ugc.dto.setting.PlatformSettingsDTO;
import com.platform.ugc.repository.offer.GeoCountryRepository;
import com.platform.ugc.repository.offer.PlatformRepository;
import com.platform.ugc.service.setting.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Small reference-data lookups for building dropdowns/checkboxes on the frontend — the Offer
 * Wizard's platform and GEO pickers ({@code OfferWizardModal}), which previously hardcoded ids
 * ({@code [1,2,3]}) matching {@code DataInitializer}'s seed order, and the platform's default
 * margin so the wizard can show the advertiser a live worker-payout/margin breakdown as they
 * type, matching what {@code OfferServiceImpl.createOffer} actually applies server-side.
 */
@RestController
@RequestMapping("/api/v1/reference")
@RequiredArgsConstructor
public class ReferenceDataController {

    private final PlatformRepository platformRepository;
    private final GeoCountryRepository geoCountryRepository;
    private final PlatformSettingsService platformSettingsService;

    @GetMapping("/platforms")
    public ResponseEntity<ResponseDTO<List<OfferResponseDTO.PlatformDto>>> getPlatforms() {
        List<OfferResponseDTO.PlatformDto> platforms = platformRepository.findAllByIsEnabledTrue().stream()
                .map(OfferResponseDTO.PlatformDto::fromEntity)
                .toList();
        return ResponseEntity.ok(ResponseDTO.ok(platforms));
    }

    @GetMapping("/geos")
    public ResponseEntity<ResponseDTO<List<OfferResponseDTO.GeoDto>>> getGeos() {
        List<OfferResponseDTO.GeoDto> geos = geoCountryRepository.findAllByIsEnabledTrue().stream()
                .map(OfferResponseDTO.GeoDto::fromEntity)
                .toList();
        return ResponseEntity.ok(ResponseDTO.ok(geos));
    }

    @GetMapping("/settings")
    public ResponseEntity<ResponseDTO<PlatformSettingsDTO>> getSettings() {
        return ResponseEntity.ok(ResponseDTO.ok(PlatformSettingsDTO.fromEntity(platformSettingsService.getPlatformSettings())));
    }
}
