package com.unichat.core.workspace.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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

    @NotNull(message = "expectedVersion không được để trống để đảm bảo optimistic locking")
    Long expectedVersion
) {}
