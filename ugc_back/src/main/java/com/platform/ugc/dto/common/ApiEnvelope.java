package com.platform.ugc.dto.common;

/**
 * Minimal {@code {success, message, data}} response envelope matching what
 * ugc-client/src/api/index.js already expects (it reads response.data.success /
 * .message / .data on every call).
 * <p>
 * Kept deliberately separate from the existing {@code com.platform.ugc.dto.ResponseDTO} (which
 * this delivery could not inspect — it lives too deep in the tree for the file bridge available
 * while building this). If ResponseDTO already does exactly this, swap it in and delete this class;
 * the two controllers in this module (AuthController, MediaUploadController) are the only callers.
 */
public record ApiEnvelope<T>(boolean success, String message, T data) {

    public static <T> ApiEnvelope<T> ok(T data) {
        return new ApiEnvelope<>(true, null, data);
    }

    public static <T> ApiEnvelope<T> error(String message) {
        return new ApiEnvelope<>(false, message, null);
    }
}
