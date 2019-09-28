const fs = require('fs');
const PDFParser = require("pdf2json");
const HummusRecipe = require('hummus-recipe');
const program = require('commander');

function getContent(file) {
  return new Promise((resolve, reject) => {
    let pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', () => reject());
    pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser));
    pdfParser.parseBuffer(file);
  });
}

function findPage(parser, fullname) {
  const pages = parser.data.Pages;
  let result = null;
  for(var i = 0; i < pages.length; i++) {
    const texts = pages[i].Texts;

    for (var j=0; j < texts.length && !result; j++) {
      const text = decodeURI(texts[j].R[0].T).toUpperCase();
      if (text.includes(fullname)) {
        result = {
          page: i + 1,
          search: fullname,
          occurence: text,
        };
        break;
      }
    }

    if (result) {
      break;
    }
  }

  return result;
}

async function main(dir, outputDir, search) {
  const files = fs.readdirSync(dir);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  for (var i = 0; i < files.length; i++) {
    const filename = files[i];
    if (!filename.startsWith('bulletins')) {
      continue;
    }

    const path = `${dir}/${filename}`;
    const file = fs.readFileSync(path);
    const parser = await getContent(file);
    const res = findPage(parser, search.toUpperCase());

    if (!res) {
      throw new Error(`Cannot find search: ${search.toUpperCase()} in file ${filename}`);
    }

    console.log(res);
    const pdf = new HummusRecipe('new', `${outputDir}/${filename}`);
    pdf.appendPage(path, res.page).endPDF();
  }
}

program.version('0.0.1');
program.option('-o --output <dir>', 'Where to save extracts',);
program.option('-d --dir <dir>', 'Where to search');
program.option('-s --search <fullname>', 'Who want to be extract');

program.parse(process.argv);

let err;
if (!program.output) {
  err = true;
  console.log('arg --output required');
}

if (!program.dir) {
  err = true;
  console.log('arg --dir required');
}

if (!program.search) {
  err = true;
  console.log('arg --search required');
}

if (err) {
  process.exit(1);
}

main(program.dir, program.output, program.search);