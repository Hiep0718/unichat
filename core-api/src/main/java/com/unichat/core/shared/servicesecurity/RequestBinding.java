package com.unichat.core.shared.servicesecurity;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Hashes the actual bytes transmitted between services. */
public final class RequestBinding {
    private RequestBinding() { }
    /** Returns a lowercase SHA-256 digest; callers must not reserialize the body. */
    public static String hash(byte[] body) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body)); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException("SHA-256 unavailable", error); }
    }
}
