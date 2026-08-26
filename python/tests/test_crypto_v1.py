import pytest

from enfinia_runtime.crypto.v1 import AesCbcEnvelopeV1, ENVELOPE_FORMAT_V1

# Generated once with transaction service's legacy implementation and fixed IVs.
LEGACY_VECTORS = [
    (
        "R$ 42,00",
        "000102030405060708090a0b0c0d0e0f:2cdd1e05443ca0aba825da52b1948c45",
    ),
    (
        "",
        "101112131415161718191a1b1c1d1e1f:10f6b644d9da3eeecbe82c9d12b8ad89",
    ),
    (
        "a" * 16,
        "202122232425262728292a2b2c2d2e2f:1a2f2198f8514b2cd96782f92750153a"
        "ce61c23a75e7aecc5777565d8535cd3f",
    ),
    (
        "Alimentação — ç ã",
        "303132333435363738393a3b3c3d3e3f:56db93d6d6c7129956b78fade3357807"
        "c83f3fdfc6cce47ef647ea5b61d14ca1",
    ),
]


def test_v1_decrypts_envelopes_produced_by_legacy_implementation() -> None:
    crypto = AesCbcEnvelopeV1("test-password", "test-salt")

    for plaintext, envelope in LEGACY_VECTORS:
        assert crypto.decrypt_text(envelope) == plaintext


def test_v1_envelope_round_trips_storage_format() -> None:
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
