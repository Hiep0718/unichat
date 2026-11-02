package com.unichat.core.workchat.call.api;

import com.unichat.core.workchat.call.domain.CallMedia;

import jakarta.validation.constraints.NotNull;

/**
 * What the caller is asking for.
 *
 * <p>Only the kind of media. Who is being called is not sent: it follows from
 * the conversation, and accepting it from the client would mean trusting the
 * client to say who it is allowed to ring.
 */
public record StartCallRequest(@NotNull(message = "Thiếu loại cuộc gọi") CallMedia media) {
}
