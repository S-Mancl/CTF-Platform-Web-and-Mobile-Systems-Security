import hashlib
import os

def super_secure_hashing_procedure(my_string):
    return [hashlib.sha256(bytes([char])).hexdigest() for char in my_string.encode('utf-8')]

data = os.environ["SINGLECHAR_FLAG"]
hashes = super_secure_hashing_procedure(data)
print(hashes)
