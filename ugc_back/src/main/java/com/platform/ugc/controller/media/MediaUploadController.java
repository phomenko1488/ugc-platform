package com.platform.ugc.controller.media;

import com.platform.ugc.dto.common.ApiEnvelope;
import com.platform.ugc.dto.media.MediaUploadResponseDTO;
import com.platform.ugc.service.media.MediaStorageService;
import com.platform.ugc.service.media.MediaValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Module 4: media upload for submission screenshots / analytics proofs.
 * <p>
 * POST /api/v1/media/upload (multipart/form-data, field name "file") — jpg/jpeg/png/webp, ≤10MB.
 * Response: {@code {"success": true, "data": {"url": "http://domain/uploads/<uuid>.png"}}}
 * matching the shape ugc-client/src/api/index.js already expects.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
public class MediaUploadController {

    private final MediaStorageService mediaStorageService;

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<ApiEnvelope<MediaUploadResponseDTO>> upload(@RequestParam("file") MultipartFile file) {
        try {
            String url = mediaStorageService.store(file);
            return ResponseEntity.ok(ApiEnvelope.ok(new MediaUploadResponseDTO(url)));
        } catch (MediaValidationException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiEnvelope.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Media upload failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiEnvelope.error("Внутренняя ошибка при загрузке файла"));
        }
    }
}
