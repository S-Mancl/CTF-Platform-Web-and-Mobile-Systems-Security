import os
from Cryptodome.Cipher import AES
from Cryptodome.Util.Padding import pad, unpad

KEY = bytes.fromhex(os.environ["MODE_KEY"])
FLAG = os.environ["PADDING_FLAG"].encode()
IV = bytes.fromhex("00102030405060708090a0b0c0d0e0f0")

def sealed_message():
    return IV + AES.new(KEY, AES.MODE_CBC, IV).encrypt(pad(FLAG, 16))

def gate_accepts(token):
    try:
        iv, ciphertext = token[:16], token[16:]
        unpad(AES.new(KEY, AES.MODE_CBC, iv).decrypt(ciphertext), 16)
        return True
    except ValueError:
        return False

if __name__ == "__main__":
    print("Sealed message:", sealed_message().hex())
    print("The gate reports only whether a submitted seal is well formed. Recover the message.")
