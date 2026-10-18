package com.unichat.core.workspace.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

import com.unichat.core.workspace.domain.WorkspaceTopic;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Request payload to create a new workspace.
 */
public record CreateWorkspaceRequest(
    @NotBlank(message = "Tên workspace không được để trống")
    @Size(min = 3, max = 100, message = "Tên workspace phải từ 3 đến 100 ký tự")
    String name,

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    String description,

    @NotNull(message = "Chế độ hiển thị không được để trống")
    WorkspaceVisibility visibility,

    Boolean cloudAllowed,

    /**
     * What the group is about, for the discovery page. Optional, because a
     * group is useful before anyone has classified it.
     */
    @Size(max = 3, message = "Mỗi workspace chọn tối đa 3 chủ đề")
    List<WorkspaceTopic> topics
) {}
