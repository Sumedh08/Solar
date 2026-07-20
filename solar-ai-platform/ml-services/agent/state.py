from typing import Any, Dict, List, Literal, Optional, TypedDict


Intent = Literal["calculator", "defect", "grid", "chat", "unknown"]


class SolarState(TypedDict, total=False):
    """Shared state for the Solar.ai LangGraph agent."""

    messages: List[Dict[str, str]]
    intent: Intent
    # Feature-specific payloads
    calculator_input: Dict[str, Any]
    defect_image_b64: Optional[str]
    grid_input: Dict[str, Any]
    # Outputs
    result: Dict[str, Any]
    error: Optional[str]
    provider_used: Optional[str]
