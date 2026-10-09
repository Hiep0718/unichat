package com.unichat.core.workchat.domain;

/**
 * What someone may do to the conversation itself, as opposed to in it.
 *
 * <p>Everyone may read and write; only an owner may rename a group or change
 * who is in it. A one-to-one conversation has no owner — there is nothing to
 * administer when the membership is the pair.
 */
public enum ParticipantRole {
    /** May rename the group, add members and remove them. */
    OWNER,
    /** May read, write and leave. */
    MEMBER
}
