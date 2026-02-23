# import hashlib

# input_hashed = input("Введіть закодований пароль: ")
# password_file = open("password.txt", 'r')

# try:
#     for word in password_file:
#         encoding_word = word.encode('utf-8')
#         hashed_word = hashlib.md5(encoding_word.strip())
#         digesting = hashed_word.hexdigest()

#         if digesting == input_hashed:
#             print("Початковий пароль: ", word)
#             password_file.close()
#             break
# except:
#     print("Пароль не знайдений!")
#     password_file.close()

import hashlib

flag = 0
counter = 0

pass_hash = input("Enter md5 hash: ")
wordlist = input("filename: ")
try:
    pass_file = open(wordlist, "r")
except:
    print("No file found!")
    quit()

for word in pass_file:
    end_wrd = word.encode('utf-8')
    digest = hashlib.md5(end_wrd.strip()).hexdigest()
    counter += 1

    if digest == pass_hash:
        print("Password has been found")
        print("The decrypted password for" + pass_hash + " is: " + word)
        print("We analyzed " + str(counter) + " password from your file.")
        flag = 1
        break
if flag == 0:
    print("The password is not in file/list.")