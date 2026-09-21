package com.unichat.core.workchat.ws;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * Who is currently connected.
 *
 * <p>Held in this process's memory. That is a deliberate limit rather than an
 * oversight: presence is disposable — a stale "online" dot costs a moment of
 * confusion, not data — and persisting it would buy little at this scale.
 *
 * <p>The consequence to state plainly: with more than one instance running,
 * each would report only the clients connected to itself.
 *
 * <p>Sessions are counted rather than flagged, because one person with the app
 * open in two tabs must not appear offline when they close one.
 */
@Component
public class PresenceTracker {

    private final Map<UUID, Integer> sessionsPerUser = new ConcurrentHashMap<>();

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        userOf(event.getMessage()).ifPresent(userId ->
                sessionsPerUser.merge(userId, 1, Integer::sum));
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        userOf(event.getMessage()).ifPresent(userId ->
                sessionsPerUser.computeIfPresent(userId,
                        (key, count) -> count <= 1 ? null : count - 1));
    }

    /** Whether this person has at least one live connection. */
    public boolean isOnline(UUID userId) {
        return sessionsPerUser.containsKey(userId);
    }

    /** Everyone currently connected, as a snapshot. */
    public Set<UUID> onlineUsers() {
        return Set.copyOf(sessionsPerUser.keySet());
    }

    private java.util.Optional<UUID> userOf(org.springframework.messaging.Message<?> message) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        return accessor.getUser() instanceof StompAuthChannelInterceptor.StompPrincipal principal
                ? java.util.Optional.of(principal.userId())
                : java.util.Optional.empty();
    }
}
