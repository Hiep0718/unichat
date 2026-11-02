package com.unichat.core.workspace.domain;

import java.util.Arrays;

/**
 * The subject a knowledge space is about.
 *
 * <p>Order here is display order everywhere, and it is deliberate: technical
 * subjects lead because they are the bulk of what this platform holds, and the
 * two catch-alls trail so they do not invite themselves. Reordering is safe —
 * {@code workspace_topics} stores the name, never the ordinal.
 *
 * <p>A fixed vocabulary rather than free text. Free tags fragment on the first
 * day — "Lập trình", "lap trinh" and "Programming" become three groups nobody
 * can filter by — and the whole point of topics here is browsing, which needs
 * the same word to mean the same thing on every card.
 *
 * <p>Held in code rather than in a table because there is no screen for
 * curating it and a table without one is an enum that is harder to read. If
 * the list ever needs to change without a deploy, that is the moment to move
 * it, and {@code workspace_topics} stores the name as text so the move costs
 * no data migration. See ADR-027.
 *
 * <p>Deliberately not constrained by a CHECK in the database: every addition
 * would then be a schema migration on the shared development database, which
 * is this project's most error-prone operation. Values are validated here, at
 * the boundary, and persisted through this enum so nothing else can be written.
 */
public enum WorkspaceTopic {

    // Technical subjects first: they are what this platform actually holds,
    // and collapsing them into one "Công nghệ" chip the way a general-audience
    // product does would file nearly every workspace under the same label.
    PROGRAMMING("Lập trình", "code", WorkspaceTopicGroup.TECHNICAL),
    DATABASE("Cơ sở dữ liệu", "database", WorkspaceTopicGroup.TECHNICAL),
    NETWORK_SYSTEMS("Mạng và hệ thống", "lan", WorkspaceTopicGroup.TECHNICAL),
    INFORMATION_SECURITY("An toàn thông tin", "security", WorkspaceTopicGroup.TECHNICAL),
    DATA_SCIENCE("Khoa học dữ liệu", "analytics", WorkspaceTopicGroup.TECHNICAL),
    ARTIFICIAL_INTELLIGENCE("Trí tuệ nhân tạo", "smart_toy", WorkspaceTopicGroup.TECHNICAL),
    DESIGN("Thiết kế và sáng tạo", "design_services", WorkspaceTopicGroup.TECHNICAL),

    // Work and organisation. Regulations sits here rather than with the
    // catch-alls: an internal rulebook is organisational, not leftover.
    BUSINESS("Kinh tế và quản trị", "business_center", WorkspaceTopicGroup.WORK),
    ENTREPRENEURSHIP("Khởi nghiệp", "rocket_launch", WorkspaceTopicGroup.WORK),
    PROJECT_MANAGEMENT("Quản lý dự án", "checklist", WorkspaceTopicGroup.WORK),
    LEADERSHIP("Lãnh đạo và nhân sự", "groups", WorkspaceTopicGroup.WORK),
    PRODUCTIVITY("Năng suất và kỹ năng", "trending_up", WorkspaceTopicGroup.WORK),
    REGULATIONS("Quy chế và hành chính", "gavel", WorkspaceTopicGroup.WORK),

    // Life and the humanities. Added because the first vocabulary was six
    // parts computer science and left a group on nutrition, history or mental
    // health with nowhere to file itself but "Khác".
    HEALTH("Sức khỏe và y học", "medical_services", WorkspaceTopicGroup.LIFE),
    PSYCHOLOGY("Tâm lý và phát triển bản thân", "psychology", WorkspaceTopicGroup.LIFE),
    LANGUAGES("Ngoại ngữ", "translate", WorkspaceTopicGroup.LIFE),
    ARTS_CULTURE("Nghệ thuật và văn hóa", "palette", WorkspaceTopicGroup.LIFE),
    HISTORY_SOCIETY("Lịch sử và xã hội", "history_edu", WorkspaceTopicGroup.LIFE),

    // Last so they do not lead the picker.
    RESEARCH("Đồ án và nghiên cứu", "science", WorkspaceTopicGroup.GENERAL),
    OTHER("Khác", "category", WorkspaceTopicGroup.GENERAL);

    /** What a member reads on a chip or in the picker. */
    private final String label;

    /** Material symbol drawn beside the label. */
    private final String icon;

    /** Which band of the picker this belongs under. Presentation only. */
    private final WorkspaceTopicGroup group;

    WorkspaceTopic(String label, String icon, WorkspaceTopicGroup group) {
        this.label = label;
        this.icon = icon;
        this.group = group;
    }

    public String getLabel() {
        return label;
    }

    public String getIcon() {
        return icon;
    }

    public WorkspaceTopicGroup getGroup() {
        return group;
    }

    /**
     * Reads a topic sent as text.
     *
     * @param raw the value as the client sent it, case-insensitive
     * @throws IllegalArgumentException when it is not a known topic
     */
    public static WorkspaceTopic parse(String raw) {
        return Arrays.stream(values())
                .filter(topic -> topic.name().equalsIgnoreCase(raw))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Chủ đề không hợp lệ: " + raw));
    }
}
