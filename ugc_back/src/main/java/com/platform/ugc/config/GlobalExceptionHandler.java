package com.platform.ugc.config;

import com.platform.ugc.dto.ResponseDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Before this class existed, this codebase had NO {@code @ControllerAdvice} at all — every
 * controller either caught its own exceptions individually (most do, for the specific
 * cases they anticipated) or let anything else fall through to Spring Boot's default
 * {@code /error} handler, whose response shape ({@code {timestamp, status, error, path}}) does
 * not match what {@code ugc-client/src/api/index.js} expects ({@code {success, message, data}}),
 * and which can leak exception class names/messages to the client. This handler is a safety net,
 * not a replacement for a controller's own specific error handling — Spring dispatches to the
 * MOST SPECIFIC applicable handler, so a controller catching {@code IllegalStateException} itself
 * still wins over this class.
 * <p>
 * Concretely, this closes: (1) an unhandled 500 with a leaked stack trace whenever
 * {@link AccessDeniedException} is thrown by an ownership check (see
 * {@link com.platform.ugc.security.CurrentUserUtil}) instead of a clean 403; (2) an unhandled 500
 * on the password-reset TOCTOU race / any other optimistic-lock conflict, instead of a clean 409
 * the client can retry against; (3) inconsistent error shapes on bean-validation failures.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ResponseDTO<Void>> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ResponseDTO.error(e.getMessage() != null ? e.getMessage() : "Доступ запрещен."));
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, DataIntegrityViolationException.class})
    public ResponseEntity<ResponseDTO<Void>> handleConflict(Exception e) {
        log.warn("Data conflict: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ResponseDTO.error("Данные были изменены параллельным запросом. Повторите операцию."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseDTO<Void>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Некорректные данные запроса.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ResponseDTO.error(message));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ResponseDTO<Void>> handleBadRequest(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ResponseDTO.error(e.getMessage() != null ? e.getMessage() : "Некорректный запрос."));
    }

    /**
     * Last-resort fallback. Never echoes {@code e.getMessage()}/the exception class to the
     * client — an uncaught exception here is by definition something we didn't anticipate, and
     * could be a driver/SQL error, a null-pointer, etc. that would otherwise leak internal detail.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ResponseDTO<Void>> handleUnexpected(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ResponseDTO.error("Внутренняя ошибка сервера. Мы уже разбираемся."));
    }
}
