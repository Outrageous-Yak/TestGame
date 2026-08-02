"""Wind Composer — entry point."""

from __future__ import annotations

import logging
import sys

from config import AppSettings
from ui import WindComposerUI


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    settings = AppSettings.load()
    app = WindComposerUI(settings)
    app.run()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
