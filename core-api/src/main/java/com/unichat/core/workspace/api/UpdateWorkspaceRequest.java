package com.unichat.core.workspace.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

import com.unichat.core.workspace.domain.WorkspaceTopic;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Request payload to update an existing workspace.
 */
public record UpdateWorkspaceRequest(
    @Size(min = 3, max = 100, message = "Tên workspace phải từ 3 đến 100 ký tự")
    String name,

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    String description,

    WorkspaceVisibility visibility,

    Boolean cloudAllowed,

    /**
     * Replaces the group's topics outright. Null leaves them untouched; an
     * empty list clears them, which is how a group says it has none.
     */
    @Size(max = 3, message = "Mỗi workspace chọn tối đa 3 chủ đề")
    List<WorkspaceTopic> topics,

    @NotNull(message = "expectedVersion không được để trống để đảm bảo optimistic locking")
    Long expectedVersion
) {}
