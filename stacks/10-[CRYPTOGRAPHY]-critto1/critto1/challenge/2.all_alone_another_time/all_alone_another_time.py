from Cryptodome.Util.number import bytes_to_long, long_to_bytes
from Cryptodome.Util.number import getPrime

# Generate RSA key components
p = getPrime(1024)
# compute n and phi
n = p*p
# choose e
e = 65537
# print key components
print("Public Key (n, e):")
print("n =", n)
print("e =", e)
# Example message
message = b"KSUS{REDACTED}"
# Convert message to integer
m = bytes_to_long(message)
# Encrypt the message
c = pow(m, e, n)
print("Encrypted message (ciphertext):")
print("c =", c)
