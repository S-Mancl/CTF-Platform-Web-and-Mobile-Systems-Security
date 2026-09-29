import base64
def super_secure_KDF(input_string):
    encoded_bytes = base64.b64encode(input_string.encode('utf-8'))
    return encoded_bytes.decode('utf-8')

user_secret = "KSUS{REDACTED}"
surely_uninvertible_secret = super_secure_KDF(user_secret)
assert surely_uninvertible_secret == "S1NVU3t5b3Vfc3VyZV90aGlzX2lzX2FfZ29vZF9pZGVhP30="
