-- Seed Mock Data for Reddit-Style Feed Testing

-- 1. Create 2 dummy users
INSERT INTO users (id, email, password_hash, system_role, status, created_at, updated_at) 
VALUES 
('11111111-1111-1111-1111-111111111111', 'alice.expert@unichat.test', 'hash', 'USER', 'ACTIVE', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'bob.newbie@unichat.test', 'hash', 'USER', 'ACTIVE', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 2. Create a public workspace
INSERT INTO workspaces (id, owner_id, name, description, visibility, cloud_allowed, created_at, updated_at)
VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Cộng đồng AI & RAG (Bản mẫu)', 'Nơi thảo luận về công nghệ AI, LLM và RAG. Hãy THAM GIA workspace này để xem bài viết trên Bảng tin.', 'PUBLIC', false, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. Add members to the workspace (dummy users)
INSERT INTO workspace_members (workspace_id, user_id, role, status)
VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'OWNER', 'ACTIVE'),
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'VIEWER', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- 4. Create discussions
INSERT INTO discussions (id, workspace_id, author_id, title, body, label, vote_score, view_count, reply_count, pinned, created_at, updated_at)
VALUES
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Làm thế nào để cải thiện độ chính xác của RAG tiếng Việt?', 'Mình đang dùng chunk_size=500 nhưng kết quả tìm kiếm ngữ nghĩa tiếng Việt khá tệ. Mọi người có kinh nghiệm gì không?', 'QUESTION', 15, 102, 2, false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Ra mắt tính năng Bảng tin (Feed) kiểu Reddit!', 'Chào mọi người, bản cập nhật mới nhất đã chuyển đổi hệ thống sang dạng diễn đàn. Giờ đây các bạn có thể Upvote/Downvote và xem bài nổi bật nhất trên Bảng tin. Hãy dùng thử nhé!', 'ANNOUNCEMENT', 42, 500, 1, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- 5. Create replies
INSERT INTO discussion_replies (id, discussion_id, author_id, body, is_ai_answer, vote_score, created_at)
VALUES
('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Bạn nên thử dùng mô hình embedding intfloat/multilingual-e5-base và thêm tiền tố "query:" vào câu hỏi xem sao nhé.', false, 8, NOW() - INTERVAL '1 hour'),
('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Dựa trên tài liệu hệ thống, kích thước chunk khuyên dùng cho tiếng Việt là 1000 tokens với độ phủ (overlap) là 200.', true, 2, NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;
