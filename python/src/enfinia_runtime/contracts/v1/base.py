from pydantic import BaseModel, ConfigDict


class ContractModelV1(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        str_strip_whitespace=True,
    )
