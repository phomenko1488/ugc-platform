package com.platform.ugc.service.partner;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.partner.PartnerAdvertiserSummaryDTO;
import com.platform.ugc.dto.partner.PartnerDashboardDTO;
import com.platform.ugc.model.user.B2BPartnerTerms;

public interface PartnerAnalyticsService {
    PartnerDashboardDTO getPartnerDashboard(Long partnerId);
    PageResponseDTO<PartnerAdvertiserSummaryDTO> getReferredAdvertisers(Long partnerId, String search, int page, int size);
    B2BPartnerTerms getPartnerTerms(Long partnerId);
}
