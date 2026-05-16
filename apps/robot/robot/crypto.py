from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def decrypt(encoded: str) -> str:
    """
    Decrypt an AES-256-GCM ciphertext produced by the web's crypto module.
    Format: base64(iv):base64(tag):base64(ciphertext)
    """
    iv_b64, tag_b64, cipher_b64 = encoded.split(":")
    iv = base64.b64decode(iv_b64)
    tag = base64.b64decode(tag_b64)
    ciphertext = base64.b64decode(cipher_b64)
    key = bytes.fromhex(os.environ["ENCRYPTION_KEY"])
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)
    return plaintext.decode()
