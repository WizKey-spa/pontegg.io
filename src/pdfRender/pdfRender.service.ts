import * as fs from 'fs';
import PDFDocument from 'pdfkit';

interface TextOptions {
  x?: number;
  y?: number;
  text: string;
  width?: number;
  height?: number;
  columns?: number;
  columnGap?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  continued?: boolean;
  link?: string;
  underline?: boolean;
  color?: string;
  font?: string;
  fontSize?: number;
}

interface ImageOptions {
  src: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fit?: [number, number];
  align?: 'left' | 'center' | 'right';
  scale?: number;
  mask?: string;
}

type PDFOptions = {
  bufferPages?: boolean;
  size?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
  font?: string;
  info?: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
  };
  fontSize?: number;
};

export type PDFRule = ['text', TextOptions] | ['moveDown', number] | ['image', ImageOptions];

const pdfRender = (header: PDFRule[], body: PDFRule[], footer: PDFRule[], options: PDFOptions) => {
  const doc = new PDFDocument(options);
  doc.fontSize(options.fontSize ?? 9);
  renderSection(doc, header);
  renderSection(doc, body);
  renderSection(doc, footer);

  // Render the PDF to a file or stream
  // doc.pipe(fs.createWriteStream('output.pdf'));
  doc.end();
  return doc;
};

const renderSection = (doc, section: PDFRule[]) => {
  section.forEach((rule) => {
    const [type, options] = rule;
    switch (type) {
      case 'text':
        renderText(doc, options as TextOptions);
        break;
      case 'image':
        renderImage(doc, options as ImageOptions);
        break;
      case 'moveDown':
        renderMoveDown(doc, options as number);
        break;
      default:
        break;
    }
  });
  return doc;
};

const renderText = (doc, text: TextOptions) => {
  const { text: textContent, x, y, ...params } = text;
  if ('fontSize' in params) {
    doc.fontSize(params.fontSize);
  }
  doc.text(textContent, x, y, params);

  return doc;
};

const renderImage = (doc, image: ImageOptions) => {
  const { src, ...params } = image;
  doc.image(src, params);
  return doc;
};

const renderMoveDown = (doc, moveDown: number) => {
  doc.moveDown(moveDown);
  return doc;
};

export default pdfRender;
