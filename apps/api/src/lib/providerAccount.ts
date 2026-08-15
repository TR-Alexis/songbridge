import prisma from './prisma';
import { SpotifyProvider } from '../modules/spotify';
import { YouTubeProvider } from '../modules/youtube';
import { decryptToken, encryptToken, isEncryptedToken } from './tokenCrypto';

export type ProviderName = 'spotify' | 'youtube';

export async function getProviderAccount(userId: string, provider: ProviderName) {
  const account = await prisma.providerAccount.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!account) {
    throw new Error(`No provider account found for ${provider}. Please connect the account first.`);
  }

  const accessToken = decryptToken(account.accessToken)!;
  const refreshToken = decryptToken(account.refreshToken);
  if (!isEncryptedToken(account.accessToken) || (account.refreshToken && !isEncryptedToken(account.refreshToken))) {
    await prisma.providerAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encryptToken(accessToken),
        ...(refreshToken ? { refreshToken: encryptToken(refreshToken) } : {}),
      },
    });
  }

  const expiresSoon = account.expiresAt && account.expiresAt.getTime() <= Date.now() + 60_000;
  if (expiresSoon) {
    if (!refreshToken) throw new Error(`The ${provider} session expired. Please reconnect the account.`);
    const refreshed = provider === 'spotify'
      ? await new SpotifyProvider().refreshAccessToken(refreshToken)
      : await new YouTubeProvider().refreshAccessToken(refreshToken);

    const updated = await prisma.providerAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encryptToken(refreshed.accessToken),
        expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
      },
    });
    return { ...updated, accessToken: refreshed.accessToken, refreshToken };
  }

  return { ...account, accessToken, refreshToken };
}

export async function upsertProviderAccount(
  userId: string,
  provider: ProviderName,
  providerUserId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
  profile?: { email?: string; displayName?: string },
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return prisma.providerAccount.upsert({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    update: {
      providerUserId,
      providerEmail: profile?.email,
      providerDisplayName: profile?.displayName,
      accessToken: encryptToken(accessToken),
      ...(refreshToken ? { refreshToken: encryptToken(refreshToken) } : {}),
      expiresAt,
    },
    create: {
      provider,
      providerUserId,
      providerEmail: profile?.email,
      providerDisplayName: profile?.displayName,
      accessToken: encryptToken(accessToken),
      refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
      expiresAt,
      userId,
    },
  });
}
