import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as fs from "fs";
import * as fsAwait from "fs/promises";
import * as crypto from "crypto";

import SimpleCrypt from "./SimpleCrypt";
import { AppendInitVect } from "./SimpleCrypt";

const main = async () => {
  const argv: any = await yargs(hideBin(process.argv)).parseAsync();

  const password: string = argv.p as string;
  if (!password) throw Error("Password please ");

  const inputFile: string = argv.i as string;

  if (!inputFile) throw Error("Please specify input file path");

  const inputFilePath: string = path.resolve("./", inputFile);
  const inputFileName: string = inputFilePath.split("/").pop();

  if (!fs.existsSync(inputFile)) throw Error("Input file doesnt exists");

  // check inputFile is dir or file
  const inputFileStat: fs.Stats = await fsAwait.lstat(inputFile);

  if (inputFileStat.isDirectory()) throw Error("Input file is not file");

  // if output file is not specified, append ".enc" to input file and save in same dir
  const outputFileSpecified: boolean = argv.o !== undefined;
  let outputFile: string = argv.o
    ? (argv.o as string)
    : inputFile.replace(".enc", "");
  let outputFilePath: string = path.resolve("./", outputFile);

  // Check outputFile is dir or file
  // And handle the case if output file is dirname
  if (outputFileSpecified) {
    try {
      const outputFileStat: fs.Stats = await fsAwait.lstat(outputFilePath);
      const outputDir: string = outputFilePath
        .split("/")
        .reduce<string>(
          (cur: string, path: string, index: number, orig: string[]) => {
            return cur + path + "/";
          },
          ""
        );

      if (outputFileStat.isDirectory())
        outputFilePath = `${outputDir}${inputFileName}.enc`;
    } catch (e) {
      // if outputfile doesnt exists finishes here.
    }
  }

  // check output file already exists
  //if (fs.existsSync(outputFilePath))
  //  throw Error("Output file akready exists, please find another name.");

  // User input sanitization done

  console.log(`\x1b[37mInput file : \x1b[34m${inputFilePath}`);
  console.log(`\x1b[37mOutput file : \x1b[34m${outputFilePath}`);
  console.log(`\x1b`);

  const simpleCrypt: SimpleCrypt = new SimpleCrypt();
  await simpleCrypt.decryptFile(inputFilePath, outputFilePath, password);
};

// main
(async () => {
  try {
    await main();
  } catch (e) {
    console.error("\x1b[31m", e.message);

    process.exit(0); // return 0 to avoid npm stack trace
  }
})();
