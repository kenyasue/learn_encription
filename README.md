## Typescript encript file

### How to use

#### install

```
git clone https://github.com/kenyasue/learning_encryption.git
cd learning_encryption.git
npm install
```

#### Encrypt

```

npm run encrypt -- -i [input file path] -p [password]

```

In this case encrypted file is generated under same dir as input file with ".enc" suffix.

```

npm run encrypt -- -i [input file path] -o [output file path] -p [password]

```

You can specify output file path.

#### Decrypt

```

npm run decrypt -- -i [input file path] -p [password]

```

In this case decrypted file is generated under same dir as input file with ".enc" suffix.

```

npm run decrypt -- -i [input file path] -o [output file path] -p [password]

```

You can specify output file path.

#### File Structure

| 16bytes of authtag | 16bytes of initial vector | encrypted binary |

#### Refecence

https://medium.com/@brandonstilson/lets-encrypt-files-with-node-85037bea8c0e

https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81
