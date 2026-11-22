#!/usr/bin/env python3
"""AES-ECB + LZ4 解密 NP 加密的 global-metadata.dat（已验证算法）。"""
import sys, struct, hashlib
from pathlib import Path

def decrypt_metadata(raw: bytes) -> bytes:
    STATIC_KEY = bytes.fromhex("b5c8c2cb9aa6f6e68dccd179e17b91a8")
    if raw[:3] != b"AEI":
        raise ValueError(f"非 AEI 头: {raw[:8].hex()}")
    out_len = struct.unpack_from("<I", raw, 3)[0]
    read_len = struct.unpack_from("<I", raw, 7)[0]
    compressed_len = struct.unpack_from("<I", raw, 11)[0]
    enc_data_key = raw[15:31]
    from Crypto.Cipher import AES
    data_key = AES.new(STATIC_KEY, AES.MODE_ECB).decrypt(enc_data_key)
    ciphertext = raw[31 : 31 + read_len]
    plaintext = AES.new(data_key, AES.MODE_ECB).decrypt(ciphertext)
    try:
        import lz4.block
        result = lz4.block.decompress(plaintext[:compressed_len], uncompressed_size=out_len)
    except ImportError:
        import lz4.frame  # fallback
        result = lz4.frame.decompress(plaintext[:compressed_len])
    if len(result) < out_len:
        result = result.ljust(out_len, b"\x00")
    return result[:out_len]

def main():
    src, dst = sys.argv[1], sys.argv[2]
    raw = Path(src).read_bytes()
    plain = decrypt_metadata(raw)
    magic = plain[:4]
    if magic != bytes.fromhex("af1bb1fa"):
        print(f"WARN magic={magic.hex()} 期望 af1bb1fa")
    version = struct.unpack_from("<I", plain, 4)[0]
    sha = hashlib.sha256(plain).hexdigest()[:16]
    Path(dst).write_bytes(plain)
    print(f"OK size={len(plain)} version={version} sha256={sha}")

if __name__ == "__main__":
    main()
