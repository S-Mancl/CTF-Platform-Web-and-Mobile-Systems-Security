# used a top-20 password, but salted this time, so I'm safe, right?

import hashlib
def kdf(secret):
    return hashlib.sha256((secret+"S4L7").encode('utf-8')).hexdigest()

secret = "REDACTED"
derived_key = kdf(secret)
assert derived_key == "5e37570505cfcf2c8ea281ba1c0999006114ac5bd90df45d5e06f2a984503d9a"
print("Derived key:", derived_key)
