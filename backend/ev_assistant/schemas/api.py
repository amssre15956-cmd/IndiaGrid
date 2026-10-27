from typing import Literal
from pydantic import BaseModel, Field

Quality = Literal["OK", "SAMPLE", "SYNTHETIC", "INCOMPLETE", "UNAVAILABLE"]


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    input_type: Literal["text"] = "text"
    text: str = Field(min_length=1, max_length=4000)


class StopRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
