import { markdown } from 'markdown';
import styles from './styles';
// import { pdfkitAddPlaceholder } from 'node-signpdf';
// setup code mirror javascript mode

// style definitions for markdown

interface Options {
  align?: 'left' | 'center' | 'right' | 'justify';
  continued?: boolean;
  link?: string;
  lineGap?: number;
}

let lastType = null;

// This class represents a node in the markdown tree, and can render it to pdf
class Node {
  type: string;
  attrs: any;
  content: any[];
  text: string;
  style: any;
  height: number;

  constructor(tree) {
    // special case for text nodes
    if (typeof tree === 'string') {
      this.type = 'text';
      this.text = tree;
      return;
    }

    this.type = tree.shift();
    this.attrs = {};

    if (typeof tree[0] === 'object' && !Array.isArray(tree[0])) {
      this.attrs = tree.shift();
    }

    // parse sub nodes
    this.content = [];
    while (tree.length) {
      this.content.push(new Node(tree.shift()));
    }

    switch (this.type) {
      case 'header':
        this.type = `h${this.attrs.level}`;
        break;

      case 'img':
        // images are used to generate inline example output
        // stores the JS so it can be run
        // in the render method
        this.type = 'example';
        this.height = +this.attrs.title || 0;
        break;

      case 'listitem':
        this.content[0].text = `• ${this.content[0].text}`;
        break;
    }

    this.style = styles[this.type] || styles.para;
  }

  // sets the styles on the document for this node
  setStyle(doc) {
    if (this.style.font) {
      doc.font(this.style.font);
    }

    if (this.style.fontSize) {
      doc.fontSize(this.style.fontSize);
    }

    if (this.style.color || this.attrs.color) {
      doc.fillColor(this.style.color || this.attrs.color);
    } else {
      doc.fillColor('black');
    }

    const options: Options = {};
    options.align = this.style.align;
    options.link = this.attrs.href || null; // override continued link
    if (this.attrs.continued != null) {
      options.continued = this.attrs.continued;
    }
    return options;
  }

  // renders this node and its subnodes to the document
  render(doc, continued) {
    let y;
    if (continued == null) {
      continued = false;
    }
    switch (this.type) {
      case 'hr':
        doc.addPage();
        break;
      default:
        // loop through subnodes and render them
        for (let index = 0; index < this.content.length; index++) {
          const fragment = this.content[index];
          if (fragment.type === 'text') {
            // add a new page for each heading, unless it follows another heading
            if (['h1', 'h2'].includes(this.type) && lastType != null && lastType !== 'h1') {
              doc.addPage();
            }

            if (this.type === 'h1') {
              doc.h1Outline = doc.outline.addItem(fragment.text);
            } else if (this.type === 'h2' && doc.h1Outline !== null) {
              doc.h1Outline.addItem(fragment.text);
            }

            // set styles and whether this fragment is continued (for rich text wrapping)
            const options = this.setStyle(doc);
            if (options.continued == null) {
              options.continued = continued || index < this.content.length - 1;
            }

            // remove newlines unless this is code
            if (this.type !== 'code') {
              fragment.text = fragment.text.replace(/[\r\n]\s*/g, ' ');
            }

            options.lineGap = 5;

            doc.text(fragment.text, options);
          } else {
            fragment.render(doc, index < this.content.length - 1 && this.type !== 'bulletlist');
          }

          lastType = this.type;
        }
    }

    if (this.style.padding) {
      return (doc.y += this.style.padding);
    }
  }
}

// reads and renders a markdown/literate javascript file to the document
export const render = (doc, string) => {
  const tree = markdown.parse(string);
  tree.shift();

  const result = [];
  while (tree.length) {
    const node = new Node(tree.shift());
    result.push(node.render(doc, false));
  }
  return result;
};

// renders the title page of the guide
// const renderTitlePage = (doc) => {
//   const title = 'PDFKit Guide';
//   const author = 'By Devon Govett';
//   const version = `Version 12`;

//   doc.font('fonts/AlegreyaSans-Light.ttf', 60);
//   doc.y = doc.page.height / 2 - doc.currentLineHeight();
//   doc.text(title, { align: 'center' });
//   const w = doc.widthOfString(title);
//   doc.h1Outline = doc.outline.addItem(title);

//   doc.fontSize(20);
//   doc.y -= 10;
//   doc.text(author, {
//     align: 'center',
//     indent: w - doc.widthOfString(author),
//   });

//   doc.font(styles.para.font, 10);
//   doc.text(version, {
//     align: 'center',
//     indent: w - doc.widthOfString(version),
//   });

//   doc.addPage();
// };

type Range = {
  start: number;
  count: number;
};

const renderHeader = (doc) => {
  // see the range of buffered pages
  const { start, count } = doc.bufferedPageRange() as Range; // => { start: 0, count: 2 }
  const pageNumbers = Array.from({ length: count + start }, (v, k) => k + start);
  pageNumbers.forEach((pageNumber, i) => {
    doc.switchToPage(i);
    doc.text(`Page ${pageNumber + 1} of ${count}`, 0, 20, { align: 'right' });
    doc.text(`Bellerofonte - ${new Date().toLocaleDateString('it-IT')}`, 75, 20, {
      align: 'left',
      link: 'https://www.bellerofonte.io',
      underline: true,
    });
  });
};

// const renderSigPlaceholder = (doc) => {
//   // adds signature placeholder
//   const refs = pdfkitAddPlaceholder({
//     pdf: doc,
//     pdfBuffer: Buffer.from([doc]),
//     reason: 'I am the author',
//     ...{ signatureLength: 2 },
//   });
//   // // Externally end the streams of the created objects.
//   // // PDFKit doesn't know much about them, so it won't .end() them.
//   // Object.keys(refs).forEach((key) => refs[key].end());
// };

const renderAll = (doc, txt) => {
  render(doc, txt);
  // doc.save();

  renderHeader(doc);
  // manually flush pages that have been buffered
  // doc.flushPages();

  // renderSigPlaceholder(doc);
  doc.end();
  return doc;
};

export default renderAll;
