import Axios from 'axios';
import jsonwebtoken from 'jsonwebtoken';
import { createLogger } from '../../utils/logger.mjs';
import jwkToPem from 'jwk-to-pem';  // Add this import to convert JWK to PEM

const logger = createLogger('auth');

const jwksUrl = 'https://dev-lc6f3dh3pnr07h5z.us.auth0.com/.well-known/jwks.json';

export const handler = async (event) => {
  try {
    const jwtToken = await verifyToken(event.authorizationToken);

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    };
  } catch (e) {
    logger.error('User not authorized', { error: e.message });

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    };
  }
};

async function verifyToken(authHeader) {
  const token = getToken(authHeader);
  const jwt = jsonwebtoken.decode(token, { complete: true });

  if (!jwt || !jwt.header.kid) {
    throw new Error('Invalid JWT token');
  }

  // Fetch the public key from the JWKS endpoint based on the key ID
  const publicKey = await getPublicKey(jwt.header.kid);

  // Verify the JWT using the public key
  try {
    const jwtPayload = jsonwebtoken.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: 'api-for-pj4',
      issuer: `https://dev-lc6f3dh3pnr07h5z.us.auth0.com/`
    });

    return jwtPayload;
  } catch (err) {
    throw new Error('Token verification failed: ' + err.message);
  }
}

async function getPublicKey(kid) {
  try {
    const response = await Axios.get(jwksUrl);
    const keys = response.data.keys;

    // Find the key matching the `kid` from the JWT header
    const key = keys.find(k => k.kid === kid);
    if (!key) {
      throw new Error('Public key not found');
    }

    // Convert the JWK to PEM format
    const publicKey = jwkToPem(key);  // Convert JWK to PEM
    return publicKey;
  } catch (error) {
    throw new Error('Error fetching JWKS: ' + error.message);
  }
}

function getToken(authHeader) {
  if (!authHeader) throw new Error('No authentication header');

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header');

  const split = authHeader.split(' ');
  const token = split[1];

  return token;
}
