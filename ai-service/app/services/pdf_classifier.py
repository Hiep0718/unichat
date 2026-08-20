import io
from enum import Enum
from pypdf import PdfReader


class PdfLayoutType(str, Enum):
    SLIDE_PRESENTATION = "SLIDE_PRESENTATION"
    CONTINUOUS_TEXT = "CONTINUOUS_TEXT"


def classify_pdf_layout(file_bytes: bytes) -> PdfLayoutType:
    """Detect if a PDF document is a Slide Presentation (e.g. exported from PowerPoint)

    or a Continuous Text Document (e.g. Word/LaTeX/Ebook) based on page orientation
    and word density heuristics.
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        if not reader.pages:
            return PdfLayoutType.CONTINUOUS_TEXT

        total_pages = len(reader.pages)
        sample_size = min(total_pages, 10)
        sample_pages = reader.pages[:sample_size]

        landscape_count = 0
        total_words = 0

        for page in sample_pages:
            # Check aspect ratio
            box = page.mediabox
            width = float(box.width)
            height = float(box.height)

            if width > 0 and height > 0:
                aspect_ratio = width / height
                if aspect_ratio >= 1.15:  # Landscape presentation format (16:9, 4:3)
                    landscape_count += 1

            # Check word density
            text = page.extract_text() or ""
            words = text.split()
            total_words += len(words)

        avg_words_per_page = total_words / max(sample_size, 1)

        # Classification decision rules:
        # 1. Majority of sampled pages are landscape (> 50%) -> Slide Presentation
        # 2. Average words per page <= 140 -> Slide Presentation
        if landscape_count / sample_size >= 0.5 or avg_words_per_page <= 140:
            return PdfLayoutType.SLIDE_PRESENTATION

        return PdfLayoutType.CONTINUOUS_TEXT
    except Exception:
        return PdfLayoutType.CONTINUOUS_TEXT
