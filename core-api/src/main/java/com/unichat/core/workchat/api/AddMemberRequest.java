package com.unichat.core.workchat.api;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/**
 * Who to add to a group.
 *
 * @param userId the person being added; they must share a group with the caller
 */
public record AddMemberRequest(
        @NotNull(message = "Chưa chọn người để thêm vào nhóm")
        UUID userId
) {}
