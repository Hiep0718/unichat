package com.unichat.core.workchat.ws;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Authenticates a STOMP connection from the token on its CONNECT frame.
 *
 * <p>The HTTP handshake carries no Authorization header a browser can set, so
 * the socket itself is open to anyone; this is where identity is established.
 * A CONNECT without a valid token is rejected, which leaves the connection
 * unable to subscribe or send anything.
 *
 * <p>The principal name is the user id. Spring routes {@code /user/**}
 * destinations by that name, so a subscriber only ever receives their own
 * queue and cannot name someone else's.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthChannelInterceptor.class);
    private static final String BEARER = "Bearer ";

    private final JwtDecoder jwtDecoder;

    public StompAuthChannelInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        accessor.setUser(authenticate(accessor));
        return message;
    }

    /**
     * @return the connecting user as a principal named by their id
     * @throws IllegalArgumentException when the token is missing or invalid,
     *                                  which STOMP reports back as an ERROR
     *                                  frame and closes the connection
     */
    private Principal authenticate(StompHeaderAccessor accessor) {
        String header = firstHeader(accessor, "Authorization");
        if (header == null || !header.startsWith(BEARER)) {
            throw new IllegalArgumentException("Thiếu token xác thực");
        }

        try {
            Jwt jwt = jwtDecoder.decode(header.substring(BEARER.length()));
            UUID userId = UUID.fromString(jwt.getSubject());
            return new StompPrincipal(userId);
        } catch (JwtException | IllegalArgumentException e) {
            // The reason is logged here and not returned: telling a caller why
            // a token was rejected helps them forge a better one.
            log.warn("Rejected a Work Chat connection with an invalid token");
            throw new IllegalArgumentException("Token không hợp lệ");
        }
    }

    private static String firstHeader(StompHeaderAccessor accessor, String name) {
        List<String> values = accessor.getNativeHeader(name);
        return values == null || values.isEmpty() ? null : values.get(0);
    }

    /** Names the connection by user id, which is how user destinations route. */
    record StompPrincipal(UUID userId) implements Principal {
        @Override
        public String getName() {
            return userId.toString();
        }
    }
}
