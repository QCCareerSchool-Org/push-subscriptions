import fs from 'fs';
import path from 'path';

export const jwtPrivateKey = fs.readFileSync(path.join(__dirname, '../jwtRS256.key')).toString();
export const jwtPublicKey = fs.readFileSync(path.join(__dirname, '../jwtRS256.pub.key')).toString();
