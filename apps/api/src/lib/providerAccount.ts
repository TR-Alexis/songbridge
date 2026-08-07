import prisma from './prisma';

export type ProviderName = 'spotify' | 'youtube';

export async function getProviderAccount(userId: string, provider: ProviderName) {
  const account = await prisma.providerAccount.findFirst({
    where: { userId, provider },
  });

  if (!account) {
    throw new Error(`No provider account found for ${provider}. Please connect the account first.`);
  }

  return account;
}

export async function upsertProviderAccount(
  userId: string,
  provider: ProviderName,
  providerUserId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return prisma.providerAccount.upsert({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId,
      },
    },
    update: {
      accessToken,
      refreshToken,
      expiresAt,
      userId,
    },
    create: {
      provider,
      providerUserId,
      accessToken,
      refreshToken,
      expiresAt,
      userId,
    },
  });
}
