"""Thread-safe Vector DB Sync Progress Tracker."""

import threading
from typing import Any


class SyncTracker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.is_syncing: bool = False
        self.status: str = "IDLE"  # IDLE, RUNNING, COMPLETED, ERROR
        self.current_file: str | None = None
        self.processed_files: int = 0
        self.total_files: int = 0
        self.processed_chunks: int = 0
        self.message: str = "Kho Vector DB đang ở trạng thái sẵn sàng."
        self.last_error: str | None = None

    def start_sync(self, total_files: int = 0) -> None:
        with self._lock:
            self.is_syncing = True
            self.status = "RUNNING"
            self.current_file = None
            self.processed_files = 0
            self.total_files = total_files
            self.processed_chunks = 0
            self.message = f"Đang khởi tạo đồng bộ {total_files} tài liệu..." if total_files > 0 else "Đang kiểm tra tài liệu..."
            self.last_error = None

    def set_total_files(self, total_files: int) -> None:
        with self._lock:
            self.total_files = total_files
            if self.is_syncing:
                self.message = f"Phát hiện {total_files} tài liệu cần đồng bộ..."

    def update_file_progress(self, current_file: str, processed_files: int, added_chunks: int) -> None:
        with self._lock:
            self.current_file = current_file
            self.processed_files = processed_files
            self.processed_chunks += added_chunks
            total_str = f"/{self.total_files}" if self.total_files > 0 else ""
            self.message = f"Đang xử lý tệp: {current_file} ({processed_files}{total_str})"

    def complete_sync(self, message: str = "Đồng bộ Vector DB hoàn tất thành công!") -> None:
        with self._lock:
            self.is_syncing = False
            self.status = "COMPLETED"
            self.current_file = None
            self.message = message

    def fail_sync(self, error: str) -> None:
        with self._lock:
            self.is_syncing = False
            self.status = "ERROR"
            self.last_error = error
            self.message = f"Lỗi đồng bộ: {error}"

    def get_state(self) -> dict[str, Any]:
        with self._lock:
            percent = 0.0
            if self.total_files > 0:
                percent = min(100.0, round((self.processed_files / self.total_files) * 100, 1))
            elif self.status == "COMPLETED":
                percent = 100.0

            return {
                "is_syncing": self.is_syncing,
                "status": self.status,
                "current_file": self.current_file,
                "processed_files": self.processed_files,
                "total_files": self.total_files,
                "processed_chunks": self.processed_chunks,
                "percent": percent,
                "message": self.message,
                "last_error": self.last_error,
            }


global_sync_tracker = SyncTracker()
