package com.unichat.core.chat.api;

import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ChatPaginationTest {
    @Test void shouldUseBoundedDefaultsWhenQueryAbsent() {
        var page=ChatPagination.parse(Map.of(),false);
        assertEquals(0,page.getPageNumber());assertEquals(20,page.getPageSize());
    }
    @Test void shouldRejectIgnoredCursorAndLimit() {
        var error=assertThrows(ChatQueryError.class,() -> ChatPagination.parse(Map.of("cursor","old"),false));
        assertEquals(400,error.getStatus().value());
        assertThrows(ChatQueryError.class,() -> ChatPagination.parse(Map.of("limit","20"),false));
    }
    @Test void shouldRejectInvalidPageSizeAndSequence() {
        for (String size:java.util.List.of("0","101","-1","foo")) {
            assertThrows(ChatQueryError.class,() -> ChatPagination.parse(Map.of("size",size),true));
        }
        assertThrows(ChatQueryError.class,() -> ChatPagination.parse(Map.of("page","-1"),true));
        assertThrows(ChatQueryError.class,() -> ChatPagination.snapshot(Map.of("snapshotSequence","-1")));
    }
    @Test void shouldAcceptStableSequenceOnMessagePageOnly() {
        var query=Map.of("page","2","size","100","snapshotSequence","120");
        assertEquals(2,ChatPagination.parse(query,true).getPageNumber());
        assertEquals(120L,ChatPagination.snapshot(query).longValue());
        assertThrows(ChatQueryError.class,() -> ChatPagination.parse(query,false));
    }
}
