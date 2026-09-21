package com.unichat.core.workchat.ws;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

/**
 * The STOMP connection is where a Work Chat client proves who it is. A CONNECT
 * without a valid token must not yield a usable connection.
 */
class StompAuthChannelInterceptorTest {

    private JwtDecoder jwtDecoder;
    private MessageChannel channel;
    private StompAuthChannelInterceptor interceptor;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        jwtDecoder = mock(JwtDecoder.class);
        channel = mock(MessageChannel.class);
        interceptor = new StompAuthChannelInterceptor(jwtDecoder);
    }

    @Test
    void shouldNameTheConnectionByUserIdSoUserDestinationsRouteToIt() {
        // Arrange: the Jwt mock is built before stubbing the decoder, since
        // creating a mock inside a when(...) argument leaves it unfinished.
        Jwt jwt = jwtFor(userId);
        when(jwtDecoder.decode("good-token")).thenReturn(jwt);
        Message<byte[]> connect = connectWith("Bearer good-token");

        // Act
        Message<?> result = interceptor.preSend(connect, channel);

        // Assert
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertEquals(userId.toString(), accessor.getUser().getName());
    }

    @Test
    void shouldRejectAConnectWithNoToken() {
        // Act and Assert
        assertThrows(IllegalArgumentException.class,
                () -> interceptor.preSend(connectWith(null), channel));
        verify(jwtDecoder, never()).decode(anyString());
    }

    @Test
    void shouldRejectATokenThatIsNotABearerToken() {
        // Act and Assert: a Basic credential must not be treated as a JWT.
        assertThrows(IllegalArgumentException.class,
                () -> interceptor.preSend(connectWith("Basic dXNlcjpwYXNz"), channel));
        verify(jwtDecoder, never()).decode(anyString());
    }

    @Test
    void shouldRejectAnInvalidToken() {
        // Arrange
        when(jwtDecoder.decode("bad-token")).thenThrow(new JwtException("expired"));

        // Act and Assert
        assertThrows(IllegalArgumentException.class,
                () -> interceptor.preSend(connectWith("Bearer bad-token"), channel));
    }

    @Test
    void shouldRejectATokenWhoseSubjectIsNotAUserId() {
        // Arrange
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("not-a-uuid");
        when(jwtDecoder.decode("odd-token")).thenReturn(jwt);

        // Act and Assert
        assertThrows(IllegalArgumentException.class,
                () -> interceptor.preSend(connectWith("Bearer odd-token"), channel));
    }

    @Test
    void shouldLeaveFramesOtherThanConnectAlone() {
        // Arrange: only CONNECT carries credentials; a SEND must not be able to
        // re-authenticate itself as someone else mid-connection.
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setLeaveMutable(true);
        accessor.addNativeHeader("Authorization", "Bearer good-token");
        Message<byte[]> send = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // Act
        Message<?> result = interceptor.preSend(send, channel);

        // Assert
        assertNull(StompHeaderAccessor.wrap(result).getUser());
        verify(jwtDecoder, never()).decode(anyString());
    }

    /**
     * Builds the frame the way Spring builds inbound STOMP messages: with a
     * mutable accessor, which is what lets an interceptor set the user.
     */
    private Message<byte[]> connectWith(String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        if (authorization != null) {
            accessor.addNativeHeader("Authorization", authorization);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Jwt jwtFor(UUID subject) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(subject.toString());
        return jwt;
    }
}
