package com.unichat.core.chat.service;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import com.unichat.core.chat.domain.ChatOperation;

final class ChatFixture {
    static final Instant NOW=Instant.parse("2026-10-11T00:00:00Z");
    static final Clock CLOCK=Clock.fixed(NOW,ZoneOffset.UTC);
    static final UUID WORKSPACE=UUID.randomUUID();
    static final UUID DOCUMENT=UUID.randomUUID();
    static final ChatActor ACTOR=new ChatActor(UUID.randomUUID(),UUID.randomUUID(),2);
    static final String HASH="a".repeat(64);
    private ChatFixture() { }
    static ChatSourceSnapshot sources(boolean cloud) {
        return new ChatSourceSnapshot(WORKSPACE,1,1,cloud,HASH,
                List.of(new ChatSourceSnapshot.Source(DOCUMENT,3,"b".repeat(64),"Nguồn thứ mười một.pdf")));
    }
    static ChatOperation operation(boolean cloud) {
        return new ChatOperation(UUID.randomUUID(),ACTOR,UUID.randomUUID(),"binding",WORKSPACE,null,
                UUID.randomUUID(),UUID.randomUUID(),null,"Câu hỏi tiếng Việt",false,"request-test","RUNNING",
                sources(cloud),null,NOW.plusSeconds(120),NOW.plusSeconds(45),NOW.plusSeconds(86400));
    }
}
