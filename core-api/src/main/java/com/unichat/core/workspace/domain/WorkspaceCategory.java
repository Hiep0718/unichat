package com.unichat.core.workspace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Master data for workspace topic categories used in community exploration.
 */
@Entity
@Table(name = "workspace_categories")
public class WorkspaceCategory {

    @Id
    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "icon", length = 10)
    private String icon;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public WorkspaceCategory() {}

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getIcon() {
        return icon;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
