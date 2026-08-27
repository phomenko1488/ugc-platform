package com.platform.ugc.service.offer;

import com.platform.ugc.dto.offer.OfferCreateRequestDTO;
import com.platform.ugc.dto.offer.OfferResponseDTO;
import com.platform.ugc.model.offer.Offer;

import java.math.BigDecimal;
import java.util.List;

public interface OfferService {
    Offer createOffer(Long advertiserId, OfferCreateRequestDTO request);
    Offer getById(Long id);
    OfferResponseDTO getOfferDetails(Long id);
    List<OfferResponseDTO> getActiveOffersForWorkers();
    List<OfferResponseDTO> getOffersByAdvertiser(Long advertiserId);
    void setOfferActiveStatus(Long offerId, Long advertiserId, boolean isActive);
    void topUpOfferBudget(Long offerId, Long advertiserId, BigDecimal additionalBudget);
    void deductBudget(Long offerId, BigDecimal amount);
    void refundBudget(Long offerId, BigDecimal amount);
}