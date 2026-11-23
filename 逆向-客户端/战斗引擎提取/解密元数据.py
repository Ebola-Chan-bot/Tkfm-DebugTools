#!/usr/bin/env python3
"""AES-ECB + LZ4 解密 NP 加密的 global-metadata.dat（已验证算法）。"""
import sys, struct, hashlib
from pathlib import Path

def 主函数():
    加密元数据路径, NP主体库路径, 输出路径 = sys.argv[1], sys.argv[2], sys.argv[3]
    # 复用提取战斗引擎中的解密逻辑，密钥从 libcompatible.so 自动提取，明文直接复用不重复解密
    from 提取战斗引擎 import 提取静态密钥
    加密数据 = Path(加密元数据路径).read_bytes()
    NP主体库数据 = Path(NP主体库路径).read_bytes()
    静态密钥, 明文 = 提取静态密钥(NP主体库数据, 加密数据)
    print(f"静态密钥: {静态密钥.hex()}")
    魔数 = 明文[:4]
    if 魔数 != bytes.fromhex("af1bb1fa"):
        print(f"WARN magic={魔数.hex()} 期望 af1bb1fa")
    版本 = struct.unpack_from("<I", 明文, 4)[0]
    哈希 = hashlib.sha256(明文).hexdigest()[:16]
    Path(输出路径).write_bytes(明文)
    print(f"OK size={len(明文)} version={版本} sha256={哈希}")

if __name__ == "__main__":
    主函数()
