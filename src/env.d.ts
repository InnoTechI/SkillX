/// <reference types="node" />
/// <reference types="next" />
/// <reference types="next/types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI?: string;
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    JWT_REFRESH_SECRET?: string;
    JWT_REFRESH_EXPIRES_IN?: string;
    BCRYPT_SALT_ROUNDS?: string;
    MAX_LOGIN_ATTEMPTS?: string;
    LOCK_TIME?: string;
  }
}
