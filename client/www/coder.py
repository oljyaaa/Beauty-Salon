import hashlib
 
myHash = input("Введіть пароль: ")

hash_object = hashlib.md5(myHash.encode())
print(hash_object.hexdigest())