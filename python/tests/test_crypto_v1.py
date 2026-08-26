import pytest

from enfinia_runtime.crypto.v1 import AesCbcEnvelopeV1, ENVELOPE_FORMAT_V1


def test_v1_envelope_round_trips_legacy_storage_format() -> None:
    crypto = AesCbcEnvelopeV1("secret", "salt")

    encrypted = crypto.encrypt_text("R$ 42,00")

    assert ENVELOPE_FORMAT_V1 == "aes-256-cbc-scrypt-v1"
    assert AesCbcEnvelopeV1.is_envelope(encrypted) is True
    assert crypto.decrypt_text(encrypted) == "R$ 42,00"


@pytest.mark.parametrize("value", ["", "not-encrypted", "00:11", None])
def test_v1_envelope_rejects_malformed_values(value: object) -> None:
    crypto = AesCbcEnvelopeV1("secret", "salt")

    assert AesCbcEnvelopeV1.is_envelope(value) is False
    if isinstance(value, str):
        with pytest.raises((ValueError, UnicodeDecodeError)):
            crypto.decrypt_text(value)
