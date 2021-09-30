import * as crypto from "crypto";
import * as fs from "fs";
import { Transform } from "stream";

const INITVECTOR_SIZE: number = 16;
const AUTHTAG_SIZE: number = 16;

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

export class AppendAuthTag extends Transform {
  authTag: Buffer;
  appended: boolean;

  constructor(authTag: Buffer, opts = undefined) {
    super(opts);
    this.authTag = authTag;
    this.appended = false;
  }

  _transform(chunk: Buffer, encoding: string, cb: Function) {
    if (!this.appended) {
      this.push(this.authTag);
      this.appended = true;
    }
    this.push(chunk);
    cb();
  }
}

export default class SimpleCrypt extends Transform {
  algorithm: crypto.CipherGCMTypes = "aes-256-gcm";

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
      const writeStream: fs.WriteStream = fs.createWriteStream(
        outputFile + ".tmp"
      );

      const initVect: Buffer = crypto.randomBytes(INITVECTOR_SIZE);

      const cipherKey = this.getCipherKey(password);
      const cipher: crypto.CipherGCM = crypto.createCipheriv(
        this.algorithm,
        cipherKey,
        initVect
      );

      const appendInitVect = new AppendInitVect(initVect);
      readStream.pipe(cipher).pipe(appendInitVect).pipe(writeStream);

      writeStream.on("close", () => {
        const authTag: Buffer = cipher.getAuthTag();

        // append authtag to file
        const appendAuthTag = new AppendAuthTag(authTag);

        const readStreamAuthTag: fs.ReadStream = fs.createReadStream(
          outputFile + ".tmp"
        );
        const writeStreamAuthTag: fs.WriteStream =
          fs.createWriteStream(outputFile);

        readStreamAuthTag.pipe(appendAuthTag).pipe(writeStreamAuthTag);

        readStreamAuthTag.on("close", () => {
          fs.unlinkSync(outputFile + ".tmp");
          res();
        });

        readStreamAuthTag.on("error", (e) => {
          fs.unlinkSync(outputFile + ".tmp");
          rej(e);
        });
      });

      readStream.on("error", (e) => {
        rej(e);
      });
    });
  }

  readIVFromFile(inputFile): Promise<Buffer> {
    return new Promise((res, rej) => {
      const readIV = fs.createReadStream(inputFile, {
        start: AUTHTAG_SIZE,
        end: INITVECTOR_SIZE + AUTHTAG_SIZE - 1,
      });
      let initVect: Buffer | null = null;
      readIV.on("data", (chunk: Buffer) => {
        initVect = chunk;
      });
      readIV.on("close", () => {
        res(initVect);
      });
      readIV.on("error", () => {
        console.log("error");
        rej();
      });
    });
  }

  readAuthTagFile(inputFile): Promise<Buffer> {
    return new Promise((res, rej) => {
      const readIV = fs.createReadStream(inputFile, {
        start: 0,
        end: AUTHTAG_SIZE - 1,
      });
      let authTag: Buffer | null = null;
      readIV.on("data", (chunk: Buffer) => {
        authTag = chunk;
      });
      readIV.on("close", () => {
        res(authTag);
      });
      readIV.on("error", () => {
        rej();
      });
    });
  }

  async decryptFile(inputFile, outputFile, password): Promise<void> {
    const authTag: Buffer = await this.readAuthTagFile(inputFile);
    const initVect: Buffer = await this.readIVFromFile(inputFile);

    return await new Promise((res, rej) => {
      const readStream: fs.ReadStream = fs.createReadStream(inputFile, {
        start: INITVECTOR_SIZE + AUTHTAG_SIZE,
      });
      const writeStream: fs.WriteStream = fs.createWriteStream(outputFile);

      const cipherKey = this.getCipherKey(password);
      const cipher: crypto.DecipherGCM = crypto.createDecipheriv(
        this.algorithm,
        cipherKey,
        initVect
      );
      cipher.setAuthTag(authTag);

      const appendInitVect = new AppendInitVect(initVect);
      readStream.pipe(cipher).pipe(writeStream);

      writeStream.on("close", () => {
        res();
      });

      readStream.on("error", (e) => {
        rej(e);
      });
    });
  }
}
