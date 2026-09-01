package com.platform.ugc.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Deque;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A minimal, dependency-free sliding-window rate limiter. Added because the security audit found
 * NO rate-limiting/brute-force protection anywhere on {@code /auth/login} (unlimited password
 * guesses per account), {@code /auth/register} (account-creation spam), or
 * {@code /auth/forgot-password} (unlimited reset-email spam against any address).
 * <p>
 * This is intentionally simple — an in-memory, per-instance counter — which is the right
 * trade-off for a single-instance deployment and a reasonable stopgap for a multi-instance one
 * (each instance enforces its own limit independently, so the effective limit is
 * {@code perInstanceLimit * instanceCount}, which still stops the common case of a single script
 * hammering one endpoint). If/when this runs behind a load balancer with several instances and
 * needs a hard global limit, replace the backing map with a Redis-backed counter (e.g.
 * Bucket4j + a Redis proxy) — the {@link #allow} call site doesn't need to change.
 */
@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    /**
     * @return true if this call is within the limit (and is now counted against it), false if the
     * caller has already made {@code maxAttempts} calls with this key inside {@code windowSeconds}.
     */
    public synchronized boolean allow(String key, int maxAttempts, long windowSeconds) {
        Instant now = Instant.now();
        Instant windowStart = now.minusSeconds(windowSeconds);
        Deque<Instant> timestamps = hits.computeIfAbsent(key, k -> new ArrayDeque<>());

        while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(windowStart)) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxAttempts) {
            return false;
        }
        timestamps.addLast(now);
        return true;
    }
}
