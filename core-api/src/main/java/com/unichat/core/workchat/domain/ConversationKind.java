package com.unichat.core.workchat.domain;

/**
 * Whether a conversation is between two people or among several.
 *
 * <p>The kind decides the shape of the row, not merely how it is displayed: a
 * one-to-one conversation keeps its ordered pair of participants so two people
 * can never end up with a second thread, while a group has a title and holds
 * its members in {@link ConversationParticipant}.
 */
public enum ConversationKind {
    /** Exactly two people, identified by the pair itself. */
    DIRECT,
    /** Any number of people, named by a title. */
    GROUP
}
