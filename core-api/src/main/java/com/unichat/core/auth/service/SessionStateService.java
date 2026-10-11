package com.unichat.core.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.auth.domain.RefreshFamilyRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/** Core-owned current account/session checks for HTTP and in-flight AI checkpoints. */
@Service
public class SessionStateService {
    private final UserRepository users;
    private final RefreshFamilyRepository families;
    private final Clock clock;
    /** Uses the same authoritative stores as credential rotation. */
    public SessionStateService(UserRepository users, RefreshFamilyRepository families, Clock clock) {
        this.users = users; this.families = families; this.clock = clock;
    }
    /** Fails closed for stale security revisions, manual locks and revoked sessions. */
    @Transactional(readOnly = true)
    public boolean isActive(UUID userId, UUID familyId, long securityVersion) {
        return users.findById(userId).filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .filter(user -> user.getSecurityVersion() == securityVersion)
                .flatMap(user -> families.findById(familyId))
                .filter(family -> family.getUserId().equals(userId))
                .filter(family -> family.isActive(Instant.now(clock))).isPresent();
    }
}
