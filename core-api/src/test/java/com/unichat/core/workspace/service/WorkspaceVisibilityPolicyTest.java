package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class WorkspaceVisibilityPolicyTest {

    @Test
    void shouldRefuseAMemberOnAPrivateWorkspace() {
        assertThrows(ValidationError.class,
                () -> WorkspaceVisibilityPolicy.requireCanAddMember(WorkspaceVisibility.PRIVATE));
    }

    @Test
    void shouldAllowAMemberOnASharedOrPublicWorkspace() {
        assertDoesNotThrow(
                () -> WorkspaceVisibilityPolicy.requireCanAddMember(WorkspaceVisibility.SHARED));
        assertDoesNotThrow(
                () -> WorkspaceVisibilityPolicy.requireCanAddMember(WorkspaceVisibility.PUBLIC));
    }

    @Test
    void shouldRefuseDroppingToPrivateWhileOthersRemain() {
        assertThrows(ConflictError.class,
                () -> WorkspaceVisibilityPolicy.requireCanChangeTo(WorkspaceVisibility.PRIVATE, 2));
    }

    @Test
    void shouldReportHowManyPeopleBlockTheChange() {
        var error = assertThrows(ConflictError.class,
                () -> WorkspaceVisibilityPolicy.requireCanChangeTo(WorkspaceVisibility.PRIVATE, 5));

        // The owner is not one of the people who must leave, so 5 members is 4.
        assertEquals(true, error.getMessage().contains("4 thành viên"));
    }

    @Test
    void shouldAllowDroppingToPrivateWhenOnlyTheOwnerIsLeft() {
        assertDoesNotThrow(
                () -> WorkspaceVisibilityPolicy.requireCanChangeTo(WorkspaceVisibility.PRIVATE, 1));
    }

    @Test
    void shouldNeverBlockAnUpgrade() {
        assertDoesNotThrow(
                () -> WorkspaceVisibilityPolicy.requireCanChangeTo(WorkspaceVisibility.SHARED, 50));
        assertDoesNotThrow(
                () -> WorkspaceVisibilityPolicy.requireCanChangeTo(WorkspaceVisibility.PUBLIC, 50));
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUBLIC", "public", "  Shared  "})
    void shouldReadALevelWhateverItsCasingAndPadding(String raw) {
        assertDoesNotThrow(() -> WorkspaceVisibilityPolicy.parse(raw));
    }

    @Test
    void shouldRejectAnUnknownLevelAsAValidationErrorRatherThanACrash() {
        assertThrows(ValidationError.class, () -> WorkspaceVisibilityPolicy.parse("SECRET"));
        assertThrows(ValidationError.class, () -> WorkspaceVisibilityPolicy.parse(""));
        assertThrows(ValidationError.class, () -> WorkspaceVisibilityPolicy.parse(null));
    }
}
