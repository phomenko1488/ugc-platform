package com.platform.ugc.service.media.impl;

import com.platform.ugc.service.media.MediaStorageService;
import com.platform.ugc.service.media.MediaValidationException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Stores uploads on local disk under {@code app.media.upload-dir} and serves them back through
 * the Spring resource handler registered in {@link com.platform.ugc.config.WebMvcConfig}.
 */
@Slf4j
@Service
public class LocalDiskMediaStorageServiceImpl implements MediaStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private final Path uploadRoot;
    private final String baseUrl;
    private final long maxFileSizeBytes;

    public LocalDiskMediaStorageServiceImpl(
            @Value("${app.media.upload-dir:uploads}") String uploadDir,
            @Value("${app.media.base-url:http://localhost:80}") String baseUrl,
            @Value("${app.media.max-file-size-bytes:10485760}") long maxFileSizeBytes
    ) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @PostConstruct
    public void ensureUploadDirExists() throws IOException {
        Files.createDirectories(uploadRoot);
        log.info("Media upload directory ready at {}", uploadRoot);
    }

    @Override
    public String store(MultipartFile file) {
        validate(file);

        String extension = extractExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "." + extension;
        Path target = uploadRoot.resolve(filename).normalize();

        if (!target.startsWith(uploadRoot)) {
            // Defensive: should be unreachable since we generate the filename ourselves.
            throw new MediaValidationException("Недопустимый путь файла");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to store uploaded file", e);
            throw new RuntimeException("Не удалось сохранить файл", e);
        }

        return baseUrl + "/uploads/" + filename;
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new MediaValidationException("Файл не передан");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new MediaValidationException(
                    "Файл превышает лимит " + (maxFileSizeBytes / (1024 * 1024)) + " МБ");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new MediaValidationException("Недопустимый тип файла: " + contentType
                    + ". Разрешены: jpg, jpeg, png, webp");
        }

        String extension = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new MediaValidationException("Недопустимое расширение файла: ." + extension);
        }
    }

    private String extractExtension(String originalFilename) {
        String cleaned = StringUtils.cleanPath(originalFilename == null ? "" : originalFilename);
        int dot = cleaned.lastIndexOf('.');
        if (dot < 0 || dot == cleaned.length() - 1) {
            throw new MediaValidationException("У файла отсутствует расширение");
        }
        return cleaned.substring(dot + 1).toLowerCase();
    }
}
