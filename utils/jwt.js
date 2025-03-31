import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET environment variable');
}

// Convert string to Uint8Array for jose
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const generateToken = async ({ userId, email, defaultPatientName }) => {
    const token = await new SignJWT({ userId, email, defaultPatientName })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .setIssuedAt()
        .sign(secretKey);
    return token;
};

export const verifyToken = async (token) => {
    try {
        console.log('Verifying token...');
        const { payload } = await jwtVerify(token, secretKey);
        console.log('Token verified:', payload);
        return payload;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
};
