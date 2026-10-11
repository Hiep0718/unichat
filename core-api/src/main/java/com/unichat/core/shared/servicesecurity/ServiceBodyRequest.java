package com.unichat.core.shared.servicesecurity;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

/** Replays the verified request bytes to Jackson without altering their representation. */
final class ServiceBodyRequest extends HttpServletRequestWrapper {
    private final byte[] body;
    ServiceBodyRequest(HttpServletRequest request, byte[] body) { super(request); this.body = body; }
    @Override
    public ServletInputStream getInputStream() {
        var stream = new ByteArrayInputStream(body);
        return new ServletInputStream() {
            @Override public int read() { return stream.read(); }
            @Override public boolean isFinished() { return stream.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener listener) {
                try { listener.onDataAvailable(); if (isFinished()) listener.onAllDataRead(); }
                catch (IOException error) { listener.onError(error); }
            }
        };
    }
    @Override
    public java.io.BufferedReader getReader() {
        return new java.io.BufferedReader(new java.io.InputStreamReader(getInputStream(), java.nio.charset.StandardCharsets.UTF_8));
    }
}
