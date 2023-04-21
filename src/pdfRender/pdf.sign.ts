import signer, { plainAddPlaceholder } from 'node-signpdf';

// Signature Widget and Annotation https://github.com/foliojs/pdfkit/issues/1381
interface PlaceholderAndSign {
  pdfBuffer: Buffer;
  reason: string;
  p12Buffer: Buffer;
  // signatureLength?: number;
}

export const setPlaceholderAndSign = ({ pdfBuffer, reason, p12Buffer }: PlaceholderAndSign) => {
  pdfBuffer = plainAddPlaceholder({
    pdfBuffer,
    reason,
    signatureLength: p12Buffer.length,
  });
  const signedPdfBuffer = signer.sign(pdfBuffer, p12Buffer);
  const originalSignature = signer.lastSignature;
  return { signedPdfBuffer, originalSignature };
};
