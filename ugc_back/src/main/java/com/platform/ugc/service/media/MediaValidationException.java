package com.platform.ugc.service.media;

/** Thrown for rejected uploads: wrong extension/content-type or file too large. */
public class MediaValidationException extends RuntimeException {
    public MediaValidationException(String message) {
        super(message);
    }
}
