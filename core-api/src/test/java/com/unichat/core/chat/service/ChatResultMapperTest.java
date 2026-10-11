package com.unichat.core.chat.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class ChatResultMapperTest {
    private final ChatResultMapper mapper=new ChatResultMapper(new ObjectMapper());
    private Map<String,Object> citation(int version,UUID document) {
        return Map.of("documentId",document.toString(),"fileName","Tên giả", "locator","trang 11", "excerpt","Bằng chứng gốc",
                "score",0.8,"citationId","C1","chunkId","real-chunk","ingestionVersion",version,"contentHash",ChatFixture.HASH);
    }
    private Map<String,Object> answer(Object citation,List<Map<String,Object>> sections) {
        return Map.of("decision","ANSWER","answer","Nội dung phải được thay", "citations",List.of(citation),"sections",sections);
    }
    private List<Map<String,Object>> documentSections(List<String> ids) {
        return List.of(Map.of("type","DOCUMENT","content","Câu trả lời có nguồn.","claims",List.of(Map.of("text","Mệnh đề có nguồn.","citationIds",ids))));
    }
    @Test void shouldUseCanonicalSectionsAndDocumentNameWhenCitationValid() {
        var result=mapper.convert(ChatFixture.operation(true),answer(citation(3,ChatFixture.DOCUMENT),documentSections(List.of("C1"))),UUID.randomUUID());
        assertEquals("ANSWER",result.decision());assertEquals("Câu trả lời có nguồn.",result.answer());
        assertEquals("Nguồn thứ mười một.pdf",result.citations().get(0).fileName());
    }
    @Test void shouldRefuseOutsideAllowlistOrStaleSourceVersion() {
        for (Object citation:List.of(citation(2,ChatFixture.DOCUMENT),citation(3,UUID.randomUUID()))) {
            var result=mapper.convert(ChatFixture.operation(true),answer(citation,documentSections(List.of("C1"))),UUID.randomUUID());
            assertEquals("REFUSE",result.decision());assertEquals("VALIDATION_FAILED",result.refusalCode());assertTrue(result.citations().isEmpty());
        }
    }
    @Test void shouldRefuseClaimsWithoutRealCitationReferences() {
        var result=mapper.convert(ChatFixture.operation(true),answer(citation(3,ChatFixture.DOCUMENT),documentSections(List.of("FAKE"))),UUID.randomUUID());
        assertEquals("REFUSE",result.decision());
    }
    @Test void shouldRefuseExternalSectionsInDefaultStrictMode() {
        var external=List.of(Map.<String,Object>of("type","EXTERNAL","content","Kiến thức chưa kiểm chứng", "claims",List.of(Map.of("text","Mệnh đề","citationIds",List.of()))));
        var result=mapper.convert(ChatFixture.operation(true),answer(citation(3,ChatFixture.DOCUMENT),external),UUID.randomUUID());
        assertEquals("REFUSE",result.decision());
    }
}
