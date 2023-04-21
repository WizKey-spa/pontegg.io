import forge from 'node-forge';

// https://github.com/Adibla/p7m-decoder/blob/master/index.js

export const p7mDecode = (p7mFile: Buffer, pemKey?: string) => {
  const p7mAsn1 = forge.asn1.fromDer(p7mFile);
  const p7m = forge.pkcs7.messageFromAsn1(p7mAsn1);

  // check if the file is encrypted or signed
  if (p7m.content) {
    // file is signed
    console.log(p7m.content.data);
  } else if (p7m.encryptedContent) {
    // file is encrypted
    const privateKey = forge.pki.privateKeyFromPem(pemKey);
    const decryptedContent = p7m.decrypt(privateKey);
    console.log(decryptedContent.data);
  }
};
