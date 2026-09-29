import os
from Cryptodome.Cipher import AES

KEY = bytes.fromhex(os.environ["MODE_KEY"])
SECRET = os.environ["ECB_FLAG"].encode()
PREFIX = b"name="
BLOCK = 16

def pad(data):
    size = BLOCK - len(data) % BLOCK
    return data + bytes([size]) * size

def seal(user_input):
    return AES.new(KEY, AES.MODE_ECB).encrypt(pad(PREFIX + user_input + SECRET))

if __name__ == "__main__":
    print("The copycat vault seals your label beside its hidden inscription.")
    print("Use chosen labels to recover the inscription.")
    print("Example seal:", seal(b"A" * 16).hex())
