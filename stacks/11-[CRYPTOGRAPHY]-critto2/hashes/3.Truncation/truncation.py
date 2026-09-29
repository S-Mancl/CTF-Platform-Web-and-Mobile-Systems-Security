from hashlib import sha256

def hash(string):
    return sha256(string.encode()).hexdigest()[:4]

flag_left = "KSUS{truncation_is_not_good_"
flag_right = "REDACTED}"

assert hash(flag_left) == "325e"
assert flag_right[-1] == "}"
assert flag_right[:-1].isdigit()
assert hash(flag_left) == hash(flag_right)
print(flag_left + flag_right)
