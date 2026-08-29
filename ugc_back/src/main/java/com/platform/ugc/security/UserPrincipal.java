package com.platform.ugc.security;

import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Spring Security {@link UserDetails} adapter around the domain {@link User} entity.
 * <p>
 * NOTE: this class assumes {@code User} exposes {@code getId()}, {@code getUsername()},
 * {@code getEmail()}, {@code getRoles()} (returning {@code Set<Role>}) and a new
 * {@code getPasswordHash()} accessor (see INTEGRATION_GUIDE.md — this field needs to be added
 * to the real User entity, it did not exist before Module 1). If any accessor name differs in
 * the real entity, this is the only class that needs to change.
 */
public class UserPrincipal implements UserDetails {

    private final User user;

    public UserPrincipal(User user) {
        this.user = user;
    }

    public User getUser() {
        return user;
    }

    public Long getId() {
        return user.getId();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<Role> roles = user.getRoles();
        if (roles == null) {
            return Set.of();
        }
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.name()))
                .collect(Collectors.toSet());
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        // Spring Security's "username" is just the principal's unique login handle here;
        // we authenticate by id/email/telegramId upstream, this is only used for logging/UserDetails contract.
        return user.getEmail() != null ? user.getEmail() : ("tg:" + user.getTelegramId());
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
