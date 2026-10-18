package com.unichat.core.workchat.call.api;

import java.util.List;

/**
 * The ICE configuration a browser needs to reach its peer.
 *
 * <p>Shaped to go straight into {@code new RTCPeerConnection({iceServers})}
 * so the client does not translate it, and so adding a server is a deployment
 * change rather than a release.
 *
 * @param iceServers     in the order the browser should try them
 * @param ttlSeconds     how long the credentials last, so a long call can
 *                       fetch new ones before renegotiating
 */
public record IceServersResponse(List<IceServer> iceServers, long ttlSeconds) {

    /**
     * One entry of the browser's ICE server list.
     *
     * @param urls       one server reachable at several addresses
     * @param username   null for STUN, which needs no credentials
     * @param credential null for STUN
     */
    public record IceServer(List<String> urls, String username, String credential) {
    }
}
