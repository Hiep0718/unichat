package com.unichat.core.workchat.call.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class IceServerProviderTest {

    private static final String STUN = "stun:stun.example:3478";
    private static final String TURN = "turn:turn.example:3478";

    @Test
    void shouldServeStunAloneWhenNoTurnIsConfigured() {
        var response = new IceServerProvider(STUN, "", "").forCaller();

        // The normal state in local development. Calls then work between
        // machines on the same network and fail on the harder ones, which is
        // a better default than refusing to start.
        assertEquals(1, response.iceServers().size());
        assertNull(response.iceServers().get(0).username());
    }

    @Test
    void shouldIgnoreTurnUrlsThatCameWithoutASecret() {
        var response = new IceServerProvider(STUN, TURN, "").forCaller();

        // Offering a relay nobody can authenticate to would make every call
        // on a restrictive network wait for a server that refuses it.
        assertEquals(1, response.iceServers().size());
    }

    @Test
    void shouldMintACredentialThatExpires() {
        var response = new IceServerProvider(STUN, TURN, "shared-secret").forCaller();
        var turn = response.iceServers().get(1);

        assertNotNull(turn.credential());
        // The username is the expiry, which is what makes the pair short-lived
        // rather than a password sitting in a bundle forever.
        long expiry = Long.parseLong(turn.username());
        assertTrue(expiry > Instant.now().getEpochSecond());
        assertEquals(response.ttlSeconds(), 600);
    }

    @Test
    void shouldSignDifferentExpiriesDifferently() throws InterruptedException {
        var provider = new IceServerProvider(STUN, TURN, "shared-secret");
        String first = provider.forCaller().iceServers().get(1).credential();
        Thread.sleep(1_100);
        String second = provider.forCaller().iceServers().get(1).credential();

        // If these matched, the signature would not be covering the expiry and
        // a leaked credential would never go stale.
        assertTrue(!first.equals(second));
    }

    @Test
    void shouldReadSeveralAddressesForOneServer() {
        var response = new IceServerProvider(
                "stun:a.example:3478,stun:b.example:3478", "", "").forCaller();

        assertEquals(2, response.iceServers().get(0).urls().size());
    }
}
