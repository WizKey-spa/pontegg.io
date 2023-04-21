import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractSignature } from 'node-signpdf';

import { setPlaceholderAndSign } from './pdf.sign';
import { showData, verify } from './pdf.verify';

describe('pdf signer', () => {
  it('should sign pdf', async () => {
    const pdfBuffer = readFileSync(resolve(__dirname, '../../', 'test/files/', 'contract.pdf'));
    const p12Buffer = readFileSync(resolve(__dirname, '../../', 'test/files/', 'certificate.p12'));
    const { signedPdfBuffer, originalSignature } = setPlaceholderAndSign({ pdfBuffer, reason: 'sign it', p12Buffer });
    const { signature, signedData } = extractSignature(signedPdfBuffer);
    expect(typeof signature === 'string').toBe(true);
    expect(signedData instanceof Buffer).toBe(true);
    const extractedSignature = Buffer.from(signature, 'binary').toString('hex');
    expect(extractedSignature).toBe(originalSignature);
    const certificates = verify(signedPdfBuffer);
    // console.log(JSON.stringify(certificates, null, 2));
    expect(showData(certificates.certificates[0])).toMatchObject({
      issuedBy: {
        countryName: 'BG',
        stateOrProvinceName: 'Some-State',
        localityName: 'Some City',
        organizationName: 'Some Company',
        commonName: 'signpdf',
        emailAddress: 'signpdf@example.com',
      },
      issuedTo: {
        countryName: 'BG',
        stateOrProvinceName: 'Some-State',
        localityName: 'Some City',
        organizationName: 'Some Company',
        commonName: 'signpdf',
        emailAddress: 'signpdf@example.com',
      },
    });

    // await promises.writeFile('./signedContract.pdf', signedPdfBuffer);
  });
});
