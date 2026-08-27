package com.platform.ugc.service.user;

import com.platform.ugc.dto.user.UserCreateRequestDTO;
import com.platform.ugc.dto.user.UserResponseDTO;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.ReferralTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;

import java.math.BigDecimal;
import java.util.List;

public interface UserService {
    User registerUser(UserCreateRequestDTO request);

    User getById(Long id);

    User getByTelegramId(Long telegramId);

    User getByEmail(String email);

    UserResponseDTO getUserProfile(Long id);

    List<UserResponseDTO> getAllUsers();

    void updateTrc20Wallet(Long userId, String walletAddress);

    void updateCustomB2CTerms(Long userId, ReferralTerms terms);

    void updateCustomB2BTerms(Long userId, B2BPartnerTerms terms);

    void adjustBalance(Long userId, BigDecimal deltaAmount, boolean isHold);

    void setUserBanStatus(Long userId, boolean isBanned);

    void addRoleToUser(Long userId, Role role);

    List<UserResponseDTO> getReferrals(Long userId);
}