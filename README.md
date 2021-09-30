## Typescript encript file

### How to use

#### Encrypt

```
npm run encrypt -- -i [input file path] -p [password]
```

In this case encrypted file is generated under same dir as input file with ".enc" suffix.

```
npm run encrypt -- -i [input file path] -o  [output file path] -p [password]
```

You can specify output file path.

#### Decrypt

```
npm run decrypt -- -i [input file path] -p [password]
```

In this case decrypted file is generated under same dir as input file with ".enc" suffix.

```
npm run decrypt -- -i [input file path] -o  [output file path] -p [password]
```

You can specify output file path.
