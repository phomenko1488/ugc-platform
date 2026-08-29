package com.platform.ugc.security;

import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Reads "Authorization: Bearer <token>", validates it as an access token, and populates the
 * SecurityContext. Registered in SecurityConfig before UsernamePasswordAuthenticationFilter
 * (see INTEGRATION_GUIDE.md / SecurityConfig.PROPOSED.java).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER_NAME = "Authorization";
    private static final String HEADER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String header = request.getHeader(HEADER_NAME);
        if (header == null || !header.startsWith(HEADER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(HEADER_PREFIX.length());
        Optional<Claims> claimsOpt = jwtService.parseClaims(token);

        if (claimsOpt.isPresent() && jwtService.isAccessToken(claimsOpt.get())
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            Claims claims = claimsOpt.get();
            Long userId = jwtService.extractUserId(claims);

            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                UserPrincipal principal = new UserPrincipal(userOpt.get());
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } else {
                log.warn("JWT valid but user {} no longer exists", userId);
            }
        }

        filterChain.doFilter(request, response);
    }
}
