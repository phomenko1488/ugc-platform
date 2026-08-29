package com.platform.ugc.model.offer;

import com.platform.ugc.model.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "offers", indexes = {
        @Index(name = "idx_offer_advertiser", columnList = "advertiser_id"),
        @Index(name = "idx_offer_active", columnList = "isActive")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Offer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "advertiser_id", nullable = false)
    private User advertiser;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String requirementsDescription;

    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal advertiserCpmRate;

    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal workerCpmRate;

    @Column(nullable = false)
    private Long minViewsThreshold;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal minEngagementRate = new BigDecimal("2.50");

    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal totalBudget;

    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal remainingBudget;

    @Column(nullable = false)
    @Builder.Default
    private Integer holdPeriodDays = 7;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "offer_platforms",
            joinColumns = @JoinColumn(name = "offer_id"),
            inverseJoinColumns = @JoinColumn(name = "platform_id")
    )
    private Set<PlatformEntity> allowedPlatforms;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "offer_target_geos",
            joinColumns = @JoinColumn(name = "offer_id"),
            inverseJoinColumns = @JoinColumn(name = "geo_id")
    )
    private Set<GeoCountry> targetGeos;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Offer offer = (Offer) o;
        return id != null && Objects.equals(id, offer.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}