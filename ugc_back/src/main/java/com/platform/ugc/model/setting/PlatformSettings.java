package com.platform.ugc.model.setting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Platform-wide economics knobs, currently just the default margin applied when an advertiser's
 * offer is created: {@code workerCpmRate = advertiserCpmRate * (1 - defaultMarginPercentage/100)}.
 * A single-row settings table (see {@code PlatformSettingsService.getPlatformSettings}, which
 * creates the 25.00% row on first read if the table is empty) rather than a hardcoded constant,
 * so an operator can tune the platform's take rate without a redeploy.
 */
@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal defaultMarginPercentage = new BigDecimal("25.00");

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = Instant.now();
    }
}
