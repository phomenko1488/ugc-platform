package com.platform.ugc.controller.advertiser;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.integration.AdvertiserIntegrationsDTO;
import com.platform.ugc.dto.integration.ApiTokenCreatedResponseDTO;
import com.platform.ugc.dto.integration.GenerateApiTokenRequestDTO;
import com.platform.ugc.dto.integration.UpdatePostbackUrlRequestDTO;
import com.platform.ugc.service.advertiser.AdvertiserIntegrationsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Advertiser Cabinet's "API и Интеграции" section — API token issuance/revocation and the
 * advertiser's own postback URL. Sits under the existing {@code /api/v1/advertiser/**} matcher
 * in {@code SecurityConfig} (ROLE_ADVERTISER or ROLE_ADMIN), so no security-rule change was
 * needed to add it.
 */
@RestController
@RequestMapping("/api/v1/advertiser/{advertiserId}/integrations")
@RequiredArgsConstructor
public class AdvertiserIntegrationsController {

    private final AdvertiserIntegrationsService integrationsService;

    @GetMapping
    public ResponseEntity<ResponseDTO<AdvertiserIntegrationsDTO>> getIntegrations(@PathVariable Long advertiserId) {
        return ResponseEntity.ok(ResponseDTO.ok(integrationsService.getIntegrations(advertiserId)));
    }

    @PostMapping("/tokens")
    public ResponseEntity<ResponseDTO<ApiTokenCreatedResponseDTO>> generateToken(
            @PathVariable Long advertiserId,
            @Valid @RequestBody GenerateApiTokenRequestDTO request
    ) {
        ApiTokenCreatedResponseDTO created = integrationsService.generateToken(advertiserId, request.label());
        return ResponseEntity.ok(ResponseDTO.ok(
                "Токен создан. Скопируйте его сейчас — второй раз он показан не будет.", created));
    }

    @DeleteMapping("/tokens/{tokenId}")
    public ResponseEntity<ResponseDTO<Void>> revokeToken(
            @PathVariable Long advertiserId,
            @PathVariable Long tokenId
    ) {
        integrationsService.revokeToken(advertiserId, tokenId);
        return ResponseEntity.ok(ResponseDTO.ok("Токен отозван", null));
    }

    @PutMapping("/postback-url")
    public ResponseEntity<ResponseDTO<Void>> updatePostbackUrl(
            @PathVariable Long advertiserId,
            @Valid @RequestBody UpdatePostbackUrlRequestDTO request
    ) {
        integrationsService.updatePostbackUrl(advertiserId, request.postbackUrl());
        return ResponseEntity.ok(ResponseDTO.ok("Postback URL обновлён", null));
    }
}
