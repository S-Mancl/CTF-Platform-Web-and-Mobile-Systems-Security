# for sure using a top-20 password won't be of any issue if I use sha256, right?

import hashlib

def kdf(secret):
    return hashlib.sha256(secret.encode('utf-8')).hexdigest()

derived_key = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
print("SHA-256:", derived_key)
print("The secret is a common password. Submit it as KSUS{password}.")
