package com.platform.ugc.controller.reference;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.offer.OfferResponseDTO;
import com.platform.ugc.repository.offer.GeoCountryRepository;
import com.platform.ugc.repository.offer.PlatformRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Small reference-data lookups for building dropdowns/checkboxes on the frontend — currently just
 * the Offer Wizard's platform and GEO pickers ({@code OfferWizardModal}), which previously
 * hardcoded ids ({@code [1,2,3]}) matching {@code DataInitializer}'s seed order.
 */
@RestController
@RequestMapping("/api/v1/reference")
@RequiredArgsConstructor
public class ReferenceDataController {

    private final PlatformRepository platformRepository;
    private final GeoCountryRepository geoCountryRepository;

    @GetMapping("/platforms")
    public ResponseEntity<ResponseDTO<List<OfferResponseDTO.PlatformDto>>> getPlatforms() {
        List<OfferResponseDTO.PlatformDto> platforms = platformRepository.findAllByIsEnabledTrue().stream()
                .map(OfferResponseDTO.PlatformDto::fromEntity)
                .toList();
        return ResponseEntity.ok(ResponseDTO.ok(platforms));
    }

    @GetMapping("/geos")
    public ResponseEntity<ResponseDTO<List<OfferResponseDTO.GeoDto>>> getGeos() {
        List<OfferResponseDTO.GeoDto> geos = geoCountryRepository.findAll().stream()
                .map(OfferResponseDTO.GeoDto::fromEntity)
                .toList();
        return ResponseEntity.ok(ResponseDTO.ok(geos));
    }
}
