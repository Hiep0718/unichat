package com.unichat.core.workspace.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.unichat.core.workspace.domain.ContributionPolicy;
import com.unichat.core.workspace.domain.JoinPolicy;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Request payload to create a new workspace, including optional community fields.
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

    @Size(max = 50, message = "Mã danh mục tối đa 50 ký tự")
    String category,

    JoinPolicy joinPolicy,

    ContributionPolicy contributionPolicy
) {}
