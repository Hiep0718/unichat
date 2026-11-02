"""Content-free Core lease heartbeat and cancellation signal for summary generation."""

import logging
import threading

from app.core.private_core import call_core
from app.core.service_security import ServiceSecurityError

logger = logging.getLogger(__name__)


class WorkspaceSummaryLease:
    """Keeps a claimed job alive and stops work after Core rejects its source snapshot."""

    def __init__(self, operation_id: str, request_id: str) -> None:
        self.operation_id = operation_id
        self.request_id = request_id
        self.stopped = threading.Event()
        self.failure: Exception | None = None
        self.thread = threading.Thread(
            target=self._run, name="workspace-summary-lease", daemon=True
        )

    def __enter__(self) -> "WorkspaceSummaryLease":
        self.thread.start()
        return self

    def __exit__(self, *_args: object) -> None:
        self.stopped.set()
        self.thread.join(timeout=6)

    def cancelled(self) -> bool:
        """Signal cancellation to the provider gateway before every new call."""
        return self.failure is not None

    def check(self) -> None:
        """Raise the original typed Core failure before persisting any checkpoint."""
        if self.failure is not None:
            raise self.failure

    def _run(self) -> None:
        while not self.stopped.wait(15):
            try:
                call_core(
                    f"/internal/v1/workspace-summary-jobs/{self.operation_id}/heartbeat",
                    {"requestId": self.request_id},
                    self.request_id,
                    f"{self.operation_id}:heartbeat",
                )
            except ServiceSecurityError as error:
                self.failure = error
                logger.warning("workspace_summary_lease_rejected code=%s", str(error))
                return
            except Exception as error:
                self.failure = error
                logger.error("workspace_summary_lease_failed type=%s", type(error).__name__)
                return
