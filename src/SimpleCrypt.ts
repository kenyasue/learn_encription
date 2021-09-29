import * as crypto from "crypto";
import * as fs from "fs";
import { Transform } from "stream";

export class AppendInitVect extends Transform {
  initVect: Buffer;
  appended: boolean;

  constructor(initVect: Buffer, opts = undefined) {
    super(opts);
    this.initVect = initVect;
    this.appended = false;
  }

  _transform(chunk: Buffer, encoding: string, cb: Function) {
    if (!this.appended) {
      this.push(this.initVect);
      this.appended = true;
    }
    this.push(chunk);
    cb();
  }
}

export default class SimpleCrypt extends Transform {
  algorithm: string = "aes-256-gcm";

  getCipherKey(password): Buffer {
    return crypto.createHash("sha256").update(password).digest();
  }

  encrypt(text, password): Buffer {
    const initVect: Buffer = crypto.randomBytes(16);
    const key = this.getCipherKey(password);

    const cipher: crypto.Cipher = crypto.createCipheriv(
      this.algorithm,
      key,
      initVect
    );

    const cipherText: Buffer = cipher.update(text);

    return Buffer.concat([initVect, cipherText]);
  }

  encryptFile(inputFile, outputFile, password): Promise<void> {
    return new Promise((res, rej) => {
      // start encrypting
      const readStream: fs.ReadStream = fs.createReadStream(inputFile);
      const writeStream: fs.WriteStream = fs.createWriteStream(outputFile);

      const initVect: Buffer = crypto.randomBytes(16);

      const cipherKey = this.getCipherKey(password);
      const cipher: crypto.Cipher = crypto.createCipheriv(
        this.algorithm,
        cipherKey,
        initVect
      );

      const appendInitVect = new AppendInitVect(initVect);
      readStream.pipe(cipher).pipe(appendInitVect).pipe(writeStream);

      writeStream.on("close", () => {
        res();
      });

      readStream.on("error", (e) => {
        rej(e);
      });
    });
  }

  readIVFromFile(inputFile): Promise<Buffer> {
    return new Promise((res, rej) => {
      const readIV = fs.createReadStream(inputFile, { end: 15 });
      let initVect: Buffer | null = null;
      readIV.on("data", (chunk: Buffer) => {
        initVect = chunk;
      });
      readIV.on("close", () => {
        res(initVect);
      });
      readIV.on("error", () => {
        rej();
      });
    });
  }

  decryptFile(inputFile, outputFile, password): Promise<void> {
    return this.readIVFromFile(inputFile).then((initVect) => {
      return new Promise((res, rej) => {
        // start decrypting
        const readStream: fs.ReadStream = fs.createReadStream(inputFile, {
          start: 16,
        });
        const writeStream: fs.WriteStream = fs.createWriteStream(outputFile);

        const cipherKey = this.getCipherKey(password);
        const cipher: crypto.Cipher = crypto.createDecipheriv(
          this.algorithm,
          cipherKey,
          initVect
        );

        const appendInitVect = new AppendInitVect(initVect);
        readStream.pipe(cipher).pipe(writeStream);

        writeStream.on("close", () => {
          res();
        });

        readStream.on("error", (e) => {
          rej(e);
        });
      });
    });
  }
}
