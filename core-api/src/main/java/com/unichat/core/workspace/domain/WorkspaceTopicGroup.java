package com.unichat.core.workspace.domain;

/**
 * The band a topic belongs to in a picker.
 *
 * <p>Exists because twenty chips in one wrap is a wall: the eye has nowhere to
 * rest and finding "Tâm lý" means reading all twenty. Four short bands turn
 * that into picking a band and then one of five.
 *
 * <p>Presentation only. Nothing is stored against a group and nothing filters
 * by one, so regrouping is a label change and never a migration.
 */
public enum WorkspaceTopicGroup {

    TECHNICAL("Kỹ thuật và công nghệ"),
    WORK("Công việc và tổ chức"),
    LIFE("Đời sống và nhân văn"),
    GENERAL("Học thuật và khác");

    private final String label;

    WorkspaceTopicGroup(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
