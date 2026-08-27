package com.platform.ugc.service.user.impl;

import com.platform.ugc.dto.user.UserCreateRequestDTO;
import com.platform.ugc.dto.user.UserResponseDTO;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.ReferralTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.service.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private static final String ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    @Transactional
    public User registerUser(UserCreateRequestDTO request) {
        Role targetRole = request.targetRole() != null ? request.targetRole() : Role.ROLE_WORKER;

        if (targetRole == Role.ROLE_WORKER) {
            if (request.telegramId() == null && (request.username() == null || request.username().isBlank())) {
                throw new IllegalArgumentException("Telegram ID или Username обязателен для воркера.");
            }
            if (request.telegramId() != null && userRepository.existsByTelegramId(request.telegramId())) {
                throw new IllegalStateException("Воркер с таким Telegram ID уже существует.");
            }
        } else {
            if (request.email() == null || request.email().isBlank()) {
                throw new IllegalArgumentException("Email обязателен для рекламодателя/партнера.");
            }
            if (userRepository.existsByEmail(request.email().toLowerCase(Locale.ROOT))) {
                throw new IllegalStateException("Пользователь с таким Email уже зарегистрирован.");
            }
        }

        User b2cReferrer = null;
        User b2bPartner = null;

        if (request.refTag() != null && !request.refTag().isBlank()) {
            User refUser = userRepository.findByAffiliateTag(request.refTag().trim()).orElse(null);
            if (refUser != null && !Boolean.TRUE.equals(refUser.getIsBanned())) {
                if (targetRole == Role.ROLE_WORKER) {
                    b2cReferrer = refUser;
                } else if (targetRole == Role.ROLE_ADVERTISER && refUser.getRoles().contains(Role.ROLE_PARTNER)) {
                    b2bPartner = refUser;
                }
            }
        }

        String tagPrefix = switch (targetRole) {
            case ROLE_WORKER -> "wrk_";
            case ROLE_ADVERTISER -> "adv_";
            case ROLE_PARTNER -> "prt_";
            default -> "usr_";
        };

        String generatedAffiliateTag = generateUniqueAffiliateTag(tagPrefix);

        User user = User.builder()
                .telegramId(request.telegramId())
                .email(request.email() != null ? request.email().toLowerCase(Locale.ROOT) : null)
                .passwordHash(request.password() != null ? passwordEncoder.encode(request.password()) : null)
                .username(request.username() != null ? request.username() : "User_" + generatedAffiliateTag)
                .roles(new HashSet<>(Collections.singleton(targetRole)))
                .b2cReferrer(b2cReferrer)
                .b2cReferralTerms(new ReferralTerms())
                .b2bPartner(b2bPartner)
                .b2bPartnerTerms(new B2BPartnerTerms())
                .affiliateTag(generatedAffiliateTag)
                .build();

        User saved = userRepository.save(user);
        log.info("Зарегистрирован пользователь [ID: {}, Role: {}, Tag: {}]", saved.getId(), targetRole, generatedAffiliateTag);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public User getByTelegramId(Long telegramId) {
        return userRepository.findByTelegramId(telegramId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь с Telegram ID " + telegramId + " не найден"));
    }

    @Override
    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalArgumentException("Пользователь с Email " + email + " не найден"));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserProfile(Long id) {
        return UserResponseDTO.fromEntity(getById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream().map(UserResponseDTO::fromEntity).toList();
    }

    @Override
    @Transactional
    public void updateTrc20Wallet(Long userId, String walletAddress) {
        if (walletAddress == null || !walletAddress.matches("^T[A-Za-z1-9]{33}$")) {
            throw new IllegalArgumentException("Невалидный TRC-20 адрес кошелька.");
        }
        User user = getById(userId);
        user.setTrc20Wallet(walletAddress.trim());
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void updateCustomB2CTerms(Long userId, ReferralTerms terms) {
        User user = getById(userId);
        terms.setIsCustomContract(true);
        user.setB2cReferralTerms(terms);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void updateCustomB2BTerms(Long userId, B2BPartnerTerms terms) {
        User user = getById(userId);
        user.setB2bPartnerTerms(terms);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void adjustBalance(Long userId, BigDecimal deltaAmount, boolean isHold) {
        User user = userRepository.findByIdWithLock(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + userId));

        if (isHold) {
            BigDecimal updated = user.getHoldBalance().add(deltaAmount);
            if (updated.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalStateException("Холд баланс не может быть отрицательным.");
            }
            user.setHoldBalance(updated);
        } else {
            BigDecimal updated = user.getAvailableBalance().add(deltaAmount);
            if (updated.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalStateException("Недостаточно средств на балансе.");
            }
            user.setAvailableBalance(updated);
        }
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void setUserBanStatus(Long userId, boolean isBanned) {
        User user = getById(userId);
        user.setIsBanned(isBanned);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void addRoleToUser(Long userId, Role role) {
        User user = getById(userId);
        user.getRoles().add(role);
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getReferrals(Long userId) {
        User user = getById(userId);
        if (user.getRoles().contains(Role.ROLE_PARTNER)) {
            return userRepository.findAdvertisersByPartnerId(userId).stream()
                    .map(UserResponseDTO::fromEntity)
                    .toList();
        }
        return userRepository.findReferralsByWorkerReferrerId(userId).stream()
                .map(UserResponseDTO::fromEntity)
                .toList();
    }

    private String generateUniqueAffiliateTag(String prefix) {
        String tag;
        do {
            StringBuilder sb = new StringBuilder(prefix);
            for (int i = 0; i < 6; i++) {
                sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            }
            tag = sb.toString();
        } while (userRepository.existsByAffiliateTag(tag));
        return tag;
    }
}