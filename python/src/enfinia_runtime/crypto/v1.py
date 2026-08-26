from __future__ import annotations

import hashlib
import os

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

ENVELOPE_FORMAT_V1 = "aes-256-cbc-scrypt-v1"
_BLOCK_BITS = 128
_BLOCK_BYTES = _BLOCK_BITS // 8
_IV_BYTES = 16


class AesCbcEnvelopeV1:
    """Canonical legacy-compatible `iv_hex:ciphertext_hex` envelope.

    Provides confidentiality only. CBC is unauthenticated, so modified
    ciphertext may decrypt to attacker-influenced plaintext or fail with an
    opaque padding error. A future v2 should use an AEAD mode and include an
    explicit migration for existing rows.
    """

    def __init__(self, secret: str, salt: str) -> None:
        self._key = hashlib.scrypt(
            secret.encode("utf-8"),
            salt=salt.encode("utf-8"),
            n=16384,
            r=8,
            p=1,
            dklen=32,
        )

    def encrypt_text(self, plaintext: str) -> str:
        iv = os.urandom(_IV_BYTES)
        padder = padding.PKCS7(_BLOCK_BITS).padder()
        padded = padder.update(plaintext.encode("utf-8")) + padder.finalize()
        encryptor = Cipher(algorithms.AES(self._key), modes.CBC(iv)).encryptor()
        ciphertext = encryptor.update(padded) + encryptor.finalize()
        return f"{iv.hex()}:{ciphertext.hex()}"

    def decrypt_text(self, envelope: str) -> str:
        parts = envelope.split(":")
        if len(parts) != 2:
            raise ValueError(f"Invalid {ENVELOPE_FORMAT_V1} envelope")
        iv = bytes.fromhex(parts[0])
        ciphertext = bytes.fromhex(parts[1])
        if len(iv) != _IV_BYTES or not ciphertext or len(ciphertext) % _BLOCK_BYTES:
            raise ValueError(f"Invalid {ENVELOPE_FORMAT_V1} envelope")

        decryptor = Cipher(algorithms.AES(self._key), modes.CBC(iv)).decryptor()
        padded = decryptor.update(ciphertext) + decryptor.finalize()
        unpadder = padding.PKCS7(_BLOCK_BITS).unpadder()
        plaintext = unpadder.update(padded) + unpadder.finalize()
        return plaintext.decode("utf-8")

    @staticmethod
    def is_envelope(value: object) -> bool:
        if not isinstance(value, str):
            return False
        parts = value.split(":")
        if len(parts) != 2 or len(parts[0]) != _IV_BYTES * 2:
            return False
        try:
            iv = bytes.fromhex(parts[0])
            ciphertext = bytes.fromhex(parts[1])
        except ValueError:
            return False
        return (
            len(iv) == _IV_BYTES
            and bool(ciphertext)
            and len(ciphertext) % _BLOCK_BYTES == 0
        )
