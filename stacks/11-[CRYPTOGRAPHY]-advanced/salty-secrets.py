# used a top-20 password, but salted this time, so I'm safe, right?

import hashlib
def kdf(secret):
    return hashlib.sha256((secret+"S4L7").encode('utf-8')).hexdigest()

derived_key = "c6bc50cad6328a0cf70a935aa195588f47bce171e3324911129c9840eead12dc"
print("Derived key:", derived_key)
print("Salt: S4L7")
print("The secret is a common numeric password. Submit it as KSUS{password}.")
