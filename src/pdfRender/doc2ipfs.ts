import { readFile } from 'fs';
import crypto from 'crypto';
// import IPFS from 'ipfs-http-client';

// const ipfs = IPFS('ipfs.example.com', '5001', { protocol: 'http' });

// Sign the document using RSA

const doc2ipfs = async (doc, privKey, pubKey) => {
  const signer = crypto.createSign('SHA256');
  signer.update(doc);
  const signature = signer.sign(
    {
      key: privKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    },
    'base64',
  );

  // Encrypt the document using the recipient's public key
  const encryptor = crypto.createCipheriv('aes-256-cbc', pubKey, Buffer.alloc(16, 0));
  let encryptedData = encryptor.update(doc, 'utf8', 'base64');
  encryptedData += encryptor.final('base64');

  // Store the document, signature, and public key on IPFS
  // const documentHash = (await ipfs.add(Buffer.from(encryptedData, 'base64'))).path;
  // const signatureHash = (await ipfs.add(Buffer.from(signature, 'base64'))).path;
  // const publicKeyHash = (await ipfs.add(Buffer.from(pubKey))).path;

  // console.log(`Document: ${documentHash}`);
  // console.log(`Signature: ${signatureHash}`);
  // console.log(`Public Key: ${publicKeyHash}`);
};
