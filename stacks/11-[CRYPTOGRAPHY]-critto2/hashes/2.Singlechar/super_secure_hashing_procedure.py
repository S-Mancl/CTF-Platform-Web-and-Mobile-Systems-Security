import hashlib

def super_secure_hashing_procedure(my_string):
    return [hashlib.sha256(bytes([char])).hexdigest() for char in my_string.encode('utf-8')]

data = "REDACTED_PRINTABLE_STRING"
hashes = super_secure_hashing_procedure(data)
print(hashes)
