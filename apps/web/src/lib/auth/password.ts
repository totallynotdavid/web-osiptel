type Argon2Module = {
  hash(password: string, options: object): Promise<string> | string;
  verify(hash: string, password: string): Promise<boolean> | boolean;
};

let mod: Promise<Argon2Module> | null = null;

function getArgon2(): Promise<Argon2Module> {
  if (!mod) {
    mod = import(/* @vite-ignore */ "@node-rs/argon2") as Promise<Argon2Module>;
  }
  return mod;
}

export async function hashPassword(password: string): Promise<string> {
  const argon2 = await getArgon2();
  return argon2.hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    const argon2 = await getArgon2();
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
