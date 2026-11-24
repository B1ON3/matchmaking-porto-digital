import sys
from pathlib import Path

RAIZ_AV2 = Path(__file__).resolve().parents[1]
if str(RAIZ_AV2) not in sys.path:
    sys.path.insert(0, str(RAIZ_AV2))
