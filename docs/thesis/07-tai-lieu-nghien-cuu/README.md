# Tài liệu nghiên cứu đề tài UniChat

Thư mục này tổng hợp các tài liệu nền phù hợp với đề tài **UNICHAT - NỀN TẢNG QUẢN TRỊ VÀ KHAI THÁC TRI THỨC HỌC TẬP ỨNG DỤNG AI**. Danh mục ưu tiên nguồn chính thức, paper open-access và trang sách hợp pháp. Không lưu bản sao sách/PDF có bản quyền khi không có quyền phân phối.

## Cách dùng cho báo cáo khóa luận

- Chương 1: dùng nhóm tài liệu RAG/LLM để giải thích lý do chọn đề tài, vấn đề hallucination và nhu cầu citation.
- Chương 2: dùng paper RAG, embedding, dense retrieval, vector database và tài liệu công nghệ để viết cơ sở lý thuyết.
- Chương 3: dùng tài liệu OWASP, JWT, Spring Security, PostgreSQL để củng cố yêu cầu bảo mật, phân quyền, dữ liệu và API.
- Chương 4-6 sau này: dùng tài liệu chính thức của React, Spring Boot, FastAPI, ChromaDB, PostgreSQL để mô tả thiết kế, triển khai và kiểm thử.

## 1. RAG, retrieval và LLM

| Mức ưu tiên | Tài liệu | Loại | Link | Dùng cho |
|---|---|---|---|---|
| Rất cao | Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | Paper nền tảng | https://arxiv.org/abs/2005.11401 | Khái niệm RAG, truy xuất + sinh câu trả lời, citation/provenance. |
| Rất cao | Retrieval-Augmented Generation for Large Language Models: A Survey | Survey paper | https://arxiv.org/abs/2312.10997 | Tổng quan Naive/Advanced/Modular RAG, đánh giá, thách thức. |
| Cao | Retrieval-Augmented Generation for Natural Language Processing: A Survey | Survey paper | https://arxiv.org/abs/2407.13193 | Bổ sung hướng nghiên cứu RAG, ứng dụng và thách thức. |
| Cao | Dense Passage Retrieval for Open-Domain Question Answering | Paper retrieval | https://arxiv.org/abs/2004.04906 | Cơ sở dense retrieval, semantic search, passage retrieval. |
| Cao | Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks | Paper embedding | https://arxiv.org/abs/1908.10084 | Giải thích sentence embedding và similarity search. |
| Trung bình | Multilingual Retrieval-Augmented Generation for Knowledge-Intensive Task | Paper RAG đa ngôn ngữ | https://arxiv.org/abs/2504.03616 | Có thể dùng khi bàn về tiếng Việt/đa ngôn ngữ trong hướng phát triển. |

## 2. Vector database, backend và bảo mật

| Mức ưu tiên | Tài liệu | Loại | Link | Dùng cho |
|---|---|---|---|---|
| Rất cao | Chroma Documentation | Official docs | https://docs.trychroma.com/docs/overview/introduction | Vector DB, metadata filtering, collection, retrieval. |
| Rất cao | PostgreSQL Documentation | Official docs | https://www.postgresql.org/docs/current/ | Thiết kế database nghiệp vụ, transaction, index, role. |
| Rất cao | Spring Security Reference | Official docs | https://docs.spring.io/spring-security/reference/ | Authentication, authorization, JWT resource server, password storage. |
| Cao | RFC 7519 - JSON Web Token | Standard | https://www.rfc-editor.org/rfc/rfc7519 | Cơ sở chuẩn JWT trong xác thực API. |
| Cao | OWASP Top 10 | Security guide | https://owasp.org/Top10/ | Rủi ro bảo mật web, input validation, access control. |
| Cao | FastAPI Documentation | Official docs | https://fastapi.tiangolo.com/ | AI/RAG service, API Python, validation, OpenAPI. |
| Trung bình | Spring Boot Documentation | Official docs | https://docs.spring.io/spring-boot/index.html | Backend Core API, configuration, deployment. |

## 3. Frontend và triển khai

| Mức ưu tiên | Tài liệu | Loại | Link | Dùng cho |
|---|---|---|---|---|
| Cao | React Documentation | Official docs | https://react.dev/learn | Frontend component, state, routing UI foundation. |
| Trung bình | Vite Guide | Official docs | https://vite.dev/guide/ | Build tool frontend. |
| Trung bình | Tailwind CSS Documentation | Official docs | https://tailwindcss.com/docs | Styling UI, responsive layout. |
| Trung bình | Docker Compose Documentation | Official docs | https://docs.docker.com/compose/ | Triển khai nhiều service demo cuối kỳ. |

## 4. Sách nên đọc/tham khảo

| Mức ưu tiên | Sách | Tác giả | Link hợp pháp | Dùng cho |
|---|---|---|---|---|
| Rất cao | Designing Data-Intensive Applications | Martin Kleppmann | https://dataintensive.net/ | Thiết kế hệ thống dữ liệu, reliability, scalability, maintainability, database trade-offs. |
| Cao | AI Engineering | Chip Huyen | https://www.oreilly.com/library/view/ai-engineering/9781098166298/ | Thiết kế ứng dụng AI/LLM production, evaluation, system thinking. |
| Cao | Hands-On Large Language Models | Jay Alammar, Maarten Grootendorst | https://www.oreilly.com/library/view/hands-on-large-language/9781098150952/ | Nền tảng LLM, embedding, retrieval và ứng dụng thực hành. |

## 5. Gợi ý trích dẫn nhanh trong báo cáo

- Khi viết khái niệm RAG: ưu tiên trích Lewis et al. (2020), sau đó bổ sung Gao et al. (2023) cho survey.
- Khi viết embedding và semantic search: dùng Reimers & Gurevych (2019) và Karpukhin et al. (2020).
- Khi viết vector database/metadata filtering: dùng Chroma Docs.
- Khi viết backend bảo mật: dùng Spring Security Reference, RFC 7519 và OWASP Top 10.
- Khi viết database schema: dùng PostgreSQL Documentation và DDIA.

## Ghi chú bản quyền

Các file `.url` trong thư mục `links` chỉ là shortcut đến nguồn trực tuyến. Nếu cần lưu PDF offline, chỉ nên tải các paper open-access như arXiv hoặc tài liệu có giấy phép cho phép tải/lưu. Không tải hoặc chia sẻ bản sao sách O'Reilly/có bản quyền nếu không có quyền truy cập hợp lệ.