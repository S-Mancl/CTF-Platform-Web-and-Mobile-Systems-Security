# for sure using a top-20 password won't be of any issue if I use sha256, right?

import hashlib

def kdf(secret):
    return hashlib.sha256(secret.encode('utf-8')).hexdigest()

secret = "REDACTED"
derived_key = kdf(secret)
assert derived_key == "b03ddf3ca2e714a6548e7495e2a03f5e824eaac9837cd7f159c67b90fb4b7342"
