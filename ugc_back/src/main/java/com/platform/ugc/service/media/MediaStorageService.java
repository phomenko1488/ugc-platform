package com.platform.ugc.service.media;

import org.springframework.web.multipart.MultipartFile;

/**
 * Storage abstraction for uploaded media (video submission screenshots, analytics proofs, etc.).
 * The MVP ships {@link com.platform.ugc.service.media.impl.LocalDiskMediaStorageServiceImpl}
 * (files under app.media.upload-dir, served via WebMvcConfig's /uploads/** resource handler).
 * Swap in an S3/MinIO implementation later without touching MediaUploadController.
 */
public interface MediaStorageService {

    /**
     * Persists the file and returns its publicly-reachable URL.
     */
    String store(MultipartFile file);
}
