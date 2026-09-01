package com.platform.ugc.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Reads the authenticated {@link UserPrincipal} out of the current request's SecurityContext and
 * enforces resource-ownership ("is the caller who they claim to be, or an admin acting on their
 * behalf") on top of {@code SecurityConfig}'s role-only checks.
 * <p>
 * This class exists because a full security audit found that almost every controller in this
 * codebase takes the id of the resource owner (advertiserId, workerId, partnerId, userId) as a
 * plain client-supplied path/query parameter and never compares it to who actually holds the JWT
 * — SecurityConfig only ever checked "does this caller have the right ROLE", never "is this
 * caller the specific advertiser/worker/partner/user named in the URL". That gap let any
 * authenticated user read or mutate any OTHER user's data (IDOR) simply by substituting a
 * different id. Call {@link #assertSelfOrAdmin(Long)} (or the same-purpose helpers below) as the
 * very first line of any method that receives such an id, using the id exactly as it is used
 * afterwards (i.e. before any other business logic runs).
 */
public final class CurrentUserUtil {

    private CurrentUserUtil() {
    }

    /** The authenticated {@link UserPrincipal} for this request, or null if the endpoint is public. */
    public static UserPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            return null;
        }
        return principal;
    }

    /** The authenticated user's own id. Throws if called from a context with no authenticated principal. */
    public static Long id() {
        UserPrincipal principal = principal();
        if (principal == null) {
            throw new AccessDeniedException("Требуется авторизация.");
        }
        return principal.getId();
    }

    public static boolean hasAuthority(String authority) {
        UserPrincipal principal = principal();
        return principal != null && principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(authority));
    }

    public static boolean isAdmin() {
        return hasAuthority("ROLE_ADMIN");
    }

    /**
     * Throws {@link AccessDeniedException} unless the caller IS {@code targetUserId} or is an
     * admin. Use this for any endpoint scoped to "a specific advertiser/worker/partner/user's own
     * data", where {@code targetUserId} is the id named in the request.
     */
    public static void assertSelfOrAdmin(Long targetUserId) {
        assertSelfOrHasAnyAuthority(targetUserId, "ROLE_ADMIN");
    }

    /** Same as {@link #assertSelfOrAdmin} but also allows any of the given extra authorities (e.g. moderators). */
    public static void assertSelfOrHasAnyAuthority(Long targetUserId, String... extraAuthorities) {
        UserPrincipal principal = principal();
        if (principal == null) {
            throw new AccessDeniedException("Требуется авторизация.");
        }
        if (targetUserId != null && targetUserId.equals(principal.getId())) {
            return;
        }
        for (String authority : extraAuthorities) {
            if (hasAuthority(authority)) {
                return;
            }
        }
        throw new AccessDeniedException("Недостаточно прав для доступа к чужим данным.");
    }
}
