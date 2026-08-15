"""Tests for Vietnamese sentence splitter."""

from app.services.sentence_splitter import split_sentences


def test_split_sentences_basic() -> None:
    text = "Sinh viên cần đăng ký tín chỉ đúng hạn. Nếu trễ hạn sẽ bị phạt!"
    sentences = split_sentences(text)
    assert len(sentences) == 2
    assert sentences[0] == "Sinh viên cần đăng ký tín chỉ đúng hạn."
    assert sentences[1] == "Nếu trễ hạn sẽ bị phạt!"


def test_preserve_abbreviations() -> None:
    text = "PGS. TS. Nguyễn Văn A công tác tại TP. Hồ Chí Minh. Ông công bố v.v. nhiều bài báo."
    sentences = split_sentences(text)
    assert len(sentences) == 2
    assert "PGS. TS. Nguyễn Văn A" in sentences[0]
    assert "TP. Hồ Chí Minh." in sentences[0]
    assert "Ông công bố v.v. nhiều bài báo." in sentences[1]


def test_preserve_dieu_khoan() -> None:
    text = "Căn cứ Điều 5. Quy chế đào tạo ban hành kèm theo Quyết định số 10."
    sentences = split_sentences(text)
    assert len(sentences) >= 1
    assert "Điều 5." in sentences[0]
