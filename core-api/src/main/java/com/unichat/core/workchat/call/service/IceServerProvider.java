package com.unichat.core.workchat.call.service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.unichat.core.common.error.InternalError;
import com.unichat.core.workchat.call.api.IceServersResponse;
import com.unichat.core.workchat.call.api.IceServersResponse.IceServer;

/**
 * The servers a browser needs to find a path to its peer.
 *
 * <p>STUN alone settles most calls: it tells each browser how it looks from
 * outside so the two can address each other directly. Roughly one call in
 * five cannot be arranged that way — symmetric NAT, corporate firewalls, some
 * mobile carriers — and those need a TURN server to relay the media.
 *
 * <p>TURN credentials are minted per request and expire, following the
 * long-term credential scheme in RFC 5389 that every TURN service implements:
 * the username is an expiry timestamp and the password is its HMAC under a
 * shared secret. The secret never leaves this process. A static credential in
 * the frontend bundle would be a stranger's relay bandwidth on this project's
 * bill.
 */
@Service
public class IceServerProvider {

    /** Long enough to place a call, short enough that a leaked pair is stale. */
    private static final Duration CREDENTIAL_TTL = Duration.ofMinutes(10);

    private static final String HMAC_SHA1 = "HmacSHA1";

    private final List<String> stunUrls;
    private final List<String> turnUrls;
    private final String turnSecret;

    public IceServerProvider(
            @Value("${unichat.calls.stun-urls:stun:stun.l.google.com:19302}") String stunUrls,
            @Value("${unichat.calls.turn-urls:}") String turnUrls,
            @Value("${unichat.calls.turn-secret:}") String turnSecret) {
        this.stunUrls = split(stunUrls);
        this.turnUrls = split(turnUrls);
        this.turnSecret = turnSecret;
    }

    /**
     * Builds the ICE configuration for one caller.
     *
     * <p>Returns STUN only when no TURN service is configured, which is the
     * normal state in local development. Calls then work between machines on
     * the same network and fail on the harder ones, which is a better default
     * than refusing to start.
     */
    public IceServersResponse forCaller() {
        List<IceServer> servers = new ArrayList<>();
        if (!stunUrls.isEmpty()) {
            servers.add(new IceServer(stunUrls, null, null));
        }
        if (!turnUrls.isEmpty() && !turnSecret.isBlank()) {
            servers.add(turnServer());
        }
        return new IceServersResponse(servers, CREDENTIAL_TTL.toSeconds());
    }

    private IceServer turnServer() {
        String username = Long.toString(Instant.now().plus(CREDENTIAL_TTL).getEpochSecond());
        return new IceServer(turnUrls, username, sign(username));
    }

    private String sign(String username) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA1);
            mac.init(new SecretKeySpec(turnSecret.getBytes(StandardCharsets.UTF_8), HMAC_SHA1));
            return Base64.getEncoder()
                    .encodeToString(mac.doFinal(username.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) {
            // Misconfiguration rather than a user error: the secret is set by
            // deployment, so the caller can do nothing about it. The secret
            // itself is never logged, only the fact that signing failed.
            throw new InternalError();
        }
    }

    private static List<String> split(String value) {
        if (value == null || value.isBlank()) return List.of();
        return java.util.Arrays.stream(value.split(","))
                .map(String::strip)
                .filter(url -> !url.isEmpty())
                .toList();
    }
}
