from Cryptodome.Util.number import bytes_to_long, long_to_bytes
from Cryptodome.Util.number import getPrime, isPrime

# Generate RSA key components
p = getPrime(1024)
q = getPrime(1024)
r = getPrime(1024)

# compute n
n = p * q
n2 = p * r
# choose e
e = 65537
# print key components
print("Public Key (n, e):")
print("n =", n)
print("e =", e)
print("Public Key 2 (n2, e):")
print("n2 =", n2)
print("e =", e)
# Example message
message = b"REDA"
message2 = b"CTED"
# Convert message to integer
m = bytes_to_long(message)
m2 = bytes_to_long(message2)
# Encrypt the message
c = pow(m, e, n)
c2 = pow(m2, e, n2)
print("Encrypted message (ciphertext):")
print("c1 =", c)
print("c2 =", c2)
