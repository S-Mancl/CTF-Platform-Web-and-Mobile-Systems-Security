from hashlib import sha256

def hash(string):
    return sha256(string.encode()).hexdigest()[:4]

flag_left = "KSUS{truncation_is_not_good_"
print("Known prefix:", flag_left)
print("Target truncated SHA-256:", hash(flag_left))
print("Find a decimal string followed by } with the same four-hex-digit hash.")
