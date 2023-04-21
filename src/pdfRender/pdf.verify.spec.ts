import { readFileSync } from 'fs';
import { resolve } from 'path';

import { showData, verify } from './pdf.verify';

describe('pdf verifier', () => {
  it('should verify pdf signed twice', async () => {
    const signedTwicePdfBuffer = readFileSync(resolve(__dirname, '../../', 'test/files/', 'signed-twice.pdf'));
    const certs = verify(signedTwicePdfBuffer, 2);
    // console.log(JSON.stringify(certificates, null, 2));
    // console.log(showData(certificates[0]));
    expect(showData(certs.certificates[0])).toMatchObject({
      issuedBy: {
        countryName: 'BG',
        stateOrProvinceName: 'Sofia',
        localityName: 'Sofia',
        organizationName: 'node-signpdf',
        commonName: 'SignPdf',
        emailAddress: 'node-signpdf@example.com',
      },
      issuedTo: {
        countryName: 'BG',
        stateOrProvinceName: 'Sofia',
        localityName: 'Sofia',
        organizationName: 'node-signpdf',
        commonName: 'SignPdf',
        emailAddress: 'node-signpdf@example.com',
      },
    });
    // expect(certificates.length).toBe(2);

    // await promises.writeFile('./signedContract.pdf', signedPdfBuffer);
  });

  it('should verify pdf', async () => {
    const signedTwicePdfBuffer = readFileSync(resolve(__dirname, '../../', 'test/files/', 'Consulenza_signed.pdf'));
    const certs = verify(signedTwicePdfBuffer, 1);
    // console.log(JSON.stringify(certs, null, 2));
    // console.log(showData(certs.certificates[0]));
    expect(showData(certs.certificates[0])).toMatchObject({
      issuedBy: {
        countryName: 'IT',
        organizationName: 'InfoCamere S.C.p.A.',
        organizationalUnitName: 'Qualified Trust Service Provider',
        undefined: 'VATIT-02313821007',
        commonName: 'InfoCamere Qualified Electronic Signature CA',
      },
      issuedTo: {
        countryName: 'IT',
        surname: 'PAGANI',
        serialNumber: 'TINIT-PGNMRC85E16F205T',
        commonName: 'PAGANI MARCO',
        undefined: 'SIG0000003293725',
        givenName: 'MARCO',
      },
    });
    // expect(certificates.length).toBe(2);

    // await promises.writeFile('./signedContract.pdf', signedPdfBuffer);
  });

  xit('should fail extracting signature', async () => {
    const signedTwicePdfBuffer = readFileSync(
      resolve(__dirname, '../../', 'test/files/', 'Consulenza_accettazione.pdf'),
    );
    const certs = verify(signedTwicePdfBuffer, 1);
    // console.log(JSON.stringify(certs, null, 2));
    // console.log(showData(certs.certificates[0]));
    expect(certs).toBeNull();
    // expect(certificates.length).toBe(2);

    // await promises.writeFile('./signedContract.pdf', signedPdfBuffer);
  });
});
