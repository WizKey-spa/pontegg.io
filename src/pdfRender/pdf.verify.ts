import crypto from 'crypto';
import { extractSignature, SignPdfError } from 'node-signpdf';
import forge from 'node-forge';
// https://github.com/vbuch/node-signpdf/blob/master/src/signpdf.test.js

// https://github.com/MohammedEssehemy/node-sign-validate-pdf/blob/master/script.js#L338

// https://github.com/Hopding/pdf-lib/issues/112#issuecomment-569085380
// https://github.com/RichardBray/pdf_sign
// https://stackoverflow.com/questions/15969733/verify-pkcs7-pem-signature-unpack-data-in-node-js/16148331#16148331
// https://qistoph.blogspot.com/2012/01/manual-verify-pkcs7-signed-data-with.html

// VERIFY
// https://kulkarniamit.github.io/whatwhyhow/howto/verify-ssl-tls-certificate-signature.html
export const showData = (certificate) => {
  const { issuer, subject, validity, extensions } = certificate;
  const issuedBy = Object.fromEntries(issuer.attributes.map((atr) => [atr.name, atr.value]));
  const issuedTo = Object.fromEntries(subject.attributes.map((atr) => [atr.name, atr.value]));
  const publicKey = forge.pki.publicKeyToPem(certificate.publicKey);
  // const tbsCertificate = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate));
  // const mm = tbsCertificate.value
  // const extensionsData = extensions.map((ext) => {
  //   return forge.asn1.messageFromAsn1(ext.value);
  // });
  let isSelfSigned: boolean;
  try {
    isSelfSigned = certificate.verify(certificate);
  } catch (e) {
    isSelfSigned = false;
  }
  return { issuedBy, issuedTo, validity, publicKey, isSelfSigned };
};

export const verify = (pdfBuffer: Buffer, signatureCount = 1) => {
  // good luck understanding this ;)
  try {
    const extractedData = extractSignature(pdfBuffer, signatureCount);
    const p7Asn1 = forge.asn1.fromDer(extractedData.signature, { parseAllBytes: false });
    const message = forge.pkcs7.messageFromAsn1(p7Asn1);
    const sig = message.rawCapture.signature;

    const verifyCertificateChain = (cert) => {
      const caStore = forge.pki.createCaStore();
      caStore.addCertificate(cert);
      const verified = forge.pki.verifyCertificateChain(caStore);
      if (!verified) throw new Error('Wrong certificate chain');
    };

    // verifyCertificateChain(p7Asn1);

    const attrs = message.rawCapture.authenticatedAttributes;
    const set = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attrs);
    const buf = Buffer.from(forge.asn1.toDer(set).data, 'binary');
    const cert = forge.pki.certificateToPem(message.certificates[0]);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(buf);
    // verifyCertificateChain(cert);
    const validAuthenticatedAttributes = verifier.verify(cert, sig, 'binary');
    if (!validAuthenticatedAttributes) throw new Error('Wrong authenticated attributes');
    const oids = forge.pki.oids;
    const hash = crypto.createHash('SHA256');
    const data = extractedData.signedData;
    hash.update(data);
    const fullAttrDigest = attrs.find((attr) => forge.asn1.derToOid(attr.value[0].value) === oids.messageDigest);
    const attrDigest = fullAttrDigest.value[1].value[0].value;
    const dataDigest = hash.digest();
    const validContentDigest = dataDigest.toString('binary') === attrDigest;
    if (!validContentDigest) throw new Error('Wrong content digest');
    const certificates = message.certificates;
    const now = new Date();
    // certificates.forEach((cert) => assert(cert.validity.notBefore < now && now < cert.validity.notAfter));
    return { certificates, validDigest: validContentDigest, validAttributes: validAuthenticatedAttributes };
  } catch (e: SignPdfError) {
    console.info(e.message);
    return null;
  }
};
