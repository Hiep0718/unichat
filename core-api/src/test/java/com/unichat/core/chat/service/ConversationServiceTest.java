package com.unichat.core.chat.service;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import com.unichat.core.chat.api.MessagePageResponse;
import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.common.error.NotFoundError;

class ConversationServiceTest {
    private final ConversationRepository repository=mock(ConversationRepository.class);
    private final ChatConversationStore ownership=mock(ChatConversationStore.class);
    private final ChatAccessService access=mock(ChatAccessService.class);
    private final ChatMessageStore messages=mock(ChatMessageStore.class);
    private final ChatOperationService operations=mock(ChatOperationService.class);
    private final JdbcTemplate database=mock(JdbcTemplate.class);
    private final ConversationService service=new ConversationService(repository,ownership,access,messages,operations,database,ChatFixture.CLOCK);
    @Test void shouldCreateOwnedConversationWithoutAI() {
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var response=service.createConversation(ChatFixture.ACTOR,ChatFixture.WORKSPACE);
        assertEquals(ChatFixture.ACTOR.userId(),response.userId());assertEquals("Hội thoại mới",response.title());
        verify(access).read(ChatFixture.ACTOR,ChatFixture.WORKSPACE);verifyNoInteractions(messages,operations);
    }
    @Test void shouldListOnlyCurrentOwnerAndWorkspace() {
        var page=PageRequest.of(0,20);
        when(repository.findByUserIdAndWorkspaceIdAndStatusOrderByUpdatedAtDesc(ChatFixture.ACTOR.userId(),ChatFixture.WORKSPACE,"ACTIVE",page))
                .thenReturn(new PageImpl<>(List.of()));
        assertTrue(service.getConversations(ChatFixture.ACTOR,ChatFixture.WORKSPACE,page).isEmpty());
        verify(access).read(ChatFixture.ACTOR,ChatFixture.WORKSPACE);
    }
    @Test void shouldRejectConversationPathMismatchBeforeLoadingHistory() {
        var conversation=new Conversation(java.util.UUID.randomUUID(),java.util.UUID.randomUUID(),ChatFixture.ACTOR.userId(),"Private",ChatFixture.NOW);
        when(repository.findByUserIdAndIdAndStatus(ChatFixture.ACTOR.userId(),conversation.getId(),"ACTIVE")).thenReturn(Optional.of(conversation));
        assertThrows(NotFoundError.class,() -> service.getConversation(ChatFixture.ACTOR,ChatFixture.WORKSPACE,conversation.getId()));
        verifyNoInteractions(messages);
    }
    @Test void shouldLimitConversationDetailToLatestTwentyMessages() {
        var conversation=new Conversation(java.util.UUID.randomUUID(),ChatFixture.WORKSPACE,ChatFixture.ACTOR.userId(),"Private",ChatFixture.NOW);
        when(access.read(ChatFixture.ACTOR,ChatFixture.WORKSPACE)).thenReturn(ChatFixture.sources(false));
        when(repository.findByUserIdAndIdAndStatus(ChatFixture.ACTOR.userId(),conversation.getId(),"ACTIVE")).thenReturn(Optional.of(conversation));
        when(messages.page(conversation.getId(),ChatFixture.sources(false),0,20,null)).thenReturn(new MessagePageResponse(List.of(),0,20,100,5,100));
        assertTrue(service.getConversation(ChatFixture.ACTOR,ChatFixture.WORKSPACE,conversation.getId()).messages().isEmpty());
        verify(messages).page(conversation.getId(),ChatFixture.sources(false),0,20,null);
    }
}
