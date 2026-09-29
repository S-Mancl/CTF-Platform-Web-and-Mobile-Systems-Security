from Cryptodome.Util.number import bytes_to_long, long_to_bytes
from Cryptodome.Util.number import getPrime

# Generate RSA key components
p = getPrime(1024)
q = getPrime(1024)
# compute n and phi
n = p * q
phi = (p - 1) * (q - 1)
# choose e
e = 65537
# compute d
d = pow(e, -1, phi)
# print key components
print("Public Key (n, e):")
print("n =", n)
print("e =", e)
input()
print("Private Key (n, d):")
print("n =", n)
print("d =", d)
input()
# Example message
message = b"K!nd4SUS"
print("\nOriginal message:")
print("Message =", message)
input()
# Convert message to integer
m = bytes_to_long(message)
print("Message as integer:")
print("m =", m)
input()
# Encrypt the message
c = pow(m, e, n)
print("Encrypted message (ciphertext):")
print("c =", c)
input()
# Decrypt the message
m_decrypted = pow(c, d, n)
print("Decrypted integer:")
print("m_decrypted =", m_decrypted)
input()
# Convert decrypted integer back to bytes
decrypted_message = long_to_bytes(m_decrypted)
print("Decrypted message:")
print("Decrypted message =", decrypted_message)
input()
# Verify decryption
assert decrypted_message == message, "Decryption failed!"
print("\nDecryption successful, message matches original.")
