import { readFileSync } from 'fs';
import { resolve } from 'path';

import { showData, verify } from './pdf.verify';
import { p7mDecode } from './p7m';

xdescribe('p7m', () => {
  it('should be decoded', async () => {
    const p7mBuffer = readFileSync(resolve(__dirname, '../../', 'test/files/', 'IT02182030391_31.xml.p7m'));
    const decoded = p7mDecode(p7mBuffer);
    expect(typeof decoded === 'string').toBe(true);
    // expect(signedData instanceof Buffer).toBe(true);
    // const extractedSignature = Buffer.from(signature, 'binary').toString('hex');
    // expect(extractedSignature).toBe(originalSignature);
    // const certificates = verify(signedPdfBuffer);
    // // console.log(JSON.stringify(certificates, null, 2));
    // console.log(showData(certificates[0]));

    // await promises.writeFile('./signedContract.pdf', signedPdfBuffer);
  });
});
