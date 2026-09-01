package com.platform.ugc.model.user;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_tg_id", columnList = "telegramId", unique = true),
        @Index(name = "idx_user_email", columnList = "email", unique = true),
        @Index(name = "idx_user_aff_tag", columnList = "affiliateTag", unique = true)
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(unique = true)
    private Long telegramId;

    @Column(unique = true, length = 128)
    private String email;

    @Column(length = 255)
    private String passwordHash;

    @Column(length = 64)
    private String username;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    @Builder.Default
    private Set<Role> roles = new HashSet<>(Collections.singleton(Role.ROLE_WORKER));

    @Column(nullable = false, precision = 16, scale = 4)
    @Builder.Default
    private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(nullable = false, precision = 16, scale = 4)
    @Builder.Default
    private BigDecimal holdBalance = BigDecimal.ZERO;

    @Column(nullable = false, precision = 16, scale = 4)
    @Builder.Default
    private BigDecimal referralEarnedTotal = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "b2c_referrer_id")
    private User b2cReferrer;

    @Embedded
    @Builder.Default
    private ReferralTerms b2cReferralTerms = new ReferralTerms();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "b2b_partner_id")
    private User b2bPartner;

    @Embedded
    @Builder.Default
    private B2BPartnerTerms b2bPartnerTerms = new B2BPartnerTerms();

    @Column(length = 42)
    private String trc20Wallet;

    // Advertiser Cabinet -> "API и Интеграции": where the platform POSTs conversion/payout
    // events for this advertiser's own postback pipeline (their casino's tracker). Nullable —
    // most non-advertiser roles never set it, and an advertiser only needs one at a time, so a
    // single column is simpler than a child table for what is, in practice, a 1:1 setting.
    @Column(length = 512)
    private String postbackUrl;

    @Column(nullable = false)
    @Builder.Default
    private Integer trustLevel = 1;

    @Column(nullable = false, unique = true, length = 32)
    private String affiliateTag;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isBanned = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.roles == null || this.roles.isEmpty()) {
            this.roles = new HashSet<>(Collections.singleton(Role.ROLE_WORKER));
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return this.roles;
    }

    @Override
    public String getPassword() {
        return this.passwordHash;
    }

    @Override
    public String getUsername() {
        return this.telegramId != null ? String.valueOf(this.telegramId) : this.email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !Boolean.TRUE.equals(this.isBanned);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return !Boolean.TRUE.equals(this.isBanned);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return id != null && Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}