package com.platform.ugc.config;

/*
 * Stateless JWT filter chain + request-matcher-based authorization for the whole API, gated per
 * the role matrix in the ТЗ. Add a new endpoint's role requirement here, not via @PreAuthorize —
 * this class is the single source of truth for who can call what.
 */

import com.platform.ugc.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Module 1: auth endpoints must stay open, obviously.
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        // Module 4: uploaded files must be readable without a token (moderator's
                        // <img> tags, worker's own preview) — uploading itself still requires auth.
                        .requestMatchers("/uploads/**").permitAll()

                        // Existing endpoints, gated per the ТЗ's role matrix (Module 1 §3):
                        .requestMatchers("/api/v1/moderation/**").hasAnyAuthority("ROLE_MODERATOR", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/offers").hasAnyAuthority("ROLE_ADVERTISER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/offers/*/status").hasAnyAuthority("ROLE_ADVERTISER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/offers/*/topup").hasAnyAuthority("ROLE_ADVERTISER", "ROLE_ADMIN")

                        // Advertiser Cabinet (dashboard, campaign detail, traffic inspector, billing).
                        .requestMatchers("/api/v1/advertiser/**").hasAnyAuthority("ROLE_ADVERTISER", "ROLE_ADMIN")
                        // Dispute Flow: an advertiser flagging a submission from the Traffic Inspector.
                        .requestMatchers(HttpMethod.POST, "/api/v1/submissions/*/dispute").hasAnyAuthority("ROLE_ADVERTISER", "ROLE_ADMIN")

                        // B2B Partner Cabinet (dashboard, referred-advertisers CRM, contract terms).
                        .requestMatchers("/api/v1/partner/**").hasAnyAuthority("ROLE_PARTNER", "ROLE_ADMIN")

                        // Admin Back-Office: full platform control (dashboard, users, payout desk,
                        // platform/GEO reference data, settings) — ROLE_ADMIN only, no shared access.
                        .requestMatchers("/api/v1/admin/**").hasAuthority("ROLE_ADMIN")

                        // Everything else just needs a valid, logged-in user of any role.
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ВАЖНО: именно setAllowedOriginPatterns, а не setAllowedOrigins!
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://*.trycloudflare.com",
                "https://*.ngrok-free.app",
                "https://*.loca.lt",
                "https://*.ngrok.io"
        ));

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Link", "X-Total-Count"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
