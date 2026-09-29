import os
from Cryptodome.Cipher import AES
from Cryptodome.Util.Padding import pad, unpad

KEY = bytes.fromhex(os.environ["MODE_KEY"])
FLAG = os.environ["NOTADMIN_FLAG"]
IV = bytes.fromhex("102030405060708090a0b0c0d0e0f000")

def issue_pass():
    cookie = b"usr=guestAAAAAAA;is_admin=0"
    return IV + AES.new(KEY, AES.MODE_CBC, IV).encrypt(pad(cookie, 16))

def enter_palace(token):
    iv, ciphertext = token[:16], token[16:]
    cookie = unpad(AES.new(KEY, AES.MODE_CBC, iv).decrypt(ciphertext), 16)
    return FLAG if b"is_admin=1" in cookie.split(b";") else "access denied"

if __name__ == "__main__":
    print("Guest pass:", issue_pass().hex())
    print("The palace only admits crowned visitors. Upgrade this pass without the seal key.")
