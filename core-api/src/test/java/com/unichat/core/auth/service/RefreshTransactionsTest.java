package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.domain.*;
import com.unichat.core.user.domain.*;

class RefreshTransactionsTest {
    private final Instant now = Instant.parse("2026-10-11T00:00:00Z");
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final RefreshFamilyRepository families = mock(RefreshFamilyRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final EntityManager persistence = mock(EntityManager.class);
    private final User user = new User(UUID.randomUUID(), "student@unichat.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, now);
    private final RefreshFamily family = new RefreshFamily(UUID.randomUUID(), user.getId(), now.plusSeconds(60));
    private final RefreshToken token = new RefreshToken(UUID.randomUUID(), user.getId(), family.getId(), TokenHash.digest("original"), family.getExpiresAt());
    private final RefreshTransactions service = new RefreshTransactions(tokens, families, users, audit, Clock.fixed(now, ZoneOffset.UTC), persistence);

    @BeforeEach
    void prepareSession() {
        when(tokens.findByTokenHash(TokenHash.digest("original"))).thenReturn(Optional.of(token));
        when(users.lockById(user.getId())).thenReturn(Optional.of(user));
        when(families.lockById(family.getId())).thenReturn(Optional.of(family));
    }
    @Test
    void shouldCreateOneSuccessorWithOriginalAbsoluteExpiry() {
        var result = service.rotate("original");
        var captured = ArgumentCaptor.forClass(RefreshToken.class); verify(tokens).saveAndFlush(captured.capture());
        assertTrue(result.accepted()); assertEquals(token.getExpiresAt(), captured.getValue().getExpiresAt());
        assertEquals(TokenHash.digest(result.rawToken()), captured.getValue().getTokenHash());
        assertEquals(captured.getValue().getId(), token.getReplacedById()); assertEquals(now, token.getUsedAt());
        var order = inOrder(users, families, persistence, tokens);
        order.verify(users).lockById(user.getId()); order.verify(families).lockById(family.getId());
        order.verify(persistence).refresh(token); order.verify(tokens).saveAndFlush(any());
    }
    @Test
    void shouldRevokeWinnerSuccessorWhenLoserReusesOriginal() {
        token.setUsedAt(now.minusSeconds(1));
        var successor = new RefreshToken(UUID.randomUUID(), user.getId(), family.getId(), "hash-next", token.getExpiresAt());
        when(tokens.findByFamilyId(family.getId())).thenReturn(List.of(token, successor));
        assertFalse(service.rotate("original").accepted());
        assertEquals(now, family.getRevokedAt()); assertEquals(now, successor.getRevokedAt());
        verify(tokens, never()).saveAndFlush(any());
        verify(audit).record(user.getId(), "AUTH_REFRESH_REUSE", "SESSION", family.getId(), "DENIED");
    }
    @Test
    void shouldDenyExpiredFamilyWithoutSuccessor() {
        when(families.lockById(family.getId())).thenReturn(Optional.of(new RefreshFamily(family.getId(), user.getId(), now)));
        assertFalse(service.rotate("original").accepted()); verify(tokens, never()).saveAndFlush(any());
    }
    @Test
    void shouldDenyManuallyLockedAccount() {
        user.setStatus(UserStatus.LOCKED);
        assertFalse(service.rotate("original").accepted()); verify(tokens, never()).saveAndFlush(any());
    }
    @Test
    void shouldRejectMissingAndUnknownCredentials() {
        assertFalse(service.rotate(null).accepted()); assertFalse(service.rotate("unknown").accepted());
        verifyNoInteractions(families);
    }
    @Test
    void shouldRevokeCurrentFamilyIncludingSuccessorOnLogout() {
        when(tokens.findByFamilyId(family.getId())).thenReturn(List.of(token));
        service.revoke("original");
        assertEquals(now, family.getRevokedAt()); assertEquals(now, token.getRevokedAt());
    }
}
