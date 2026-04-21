import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from './utils/encryption';
import { z } from 'zod';
import 'dotenv/config';

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'f3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9';
const PORT = Number(process.env.PORT) || 3000;

fastify.register(cors);

const IngestSchema = z.object({
  identifiers: z.array(z.object({
    type: z.string(),
    value: z.string(),
  })),
  data: z.any(),
});

fastify.post('/api/v1/ingest', async (request, reply) => {
  const parseResult = IngestSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({ error: 'Invalid request body', details: parseResult.error });
  }

  const { identifiers, data } = parseResult.data;

  // 1. Identity Resolution
  let identityId: string | null = null;

  // Search for existing identifiers
  for (const iden of identifiers) {
    const existing = await prisma.identifier.findUnique({
      where: {
        type_value: {
          type: iden.type,
          value: iden.value,
        },
      },
    });
    if (existing) {
      identityId = existing.identityId;
      break;
    }
  }

  // 2. Create Identity if not found
  if (!identityId) {
    const newIdentity = await prisma.identity.create({
      data: {
        identifiers: {
          create: identifiers,
        },
      },
    });
    identityId = newIdentity.id;
  } else {
    // Optionally: Update identity with new identifiers if some were missing
    for (const iden of identifiers) {
      await prisma.identifier.upsert({
        where: {
          type_value: {
            type: iden.type,
            value: iden.value,
          },
        },
        update: {},
        create: {
          type: iden.type,
          value: iden.value,
          identityId: identityId,
        },
      });
    }
  }

  // 3. Encrypt & Store Data
  const encrypted = encrypt(JSON.stringify(data), ENCRYPTION_KEY);

  await prisma.encryptedData.create({
    data: {
      identityId,
      payload: encrypted.payload,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    },
  });

  return { status: 'success', identityId };
});

// Admin endpoint to list all identities
fastify.get('/api/v1/admin/identities', async (request, reply) => {
  const identities = await prisma.identity.findMany({
    include: {
      identifiers: true,
      encryptedData: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const resolvedIdentities = identities.map((identity) => {
    const decryptedData = identity.encryptedData.map((ed) => {
      try {
        return JSON.parse(decrypt({ payload: ed.payload, iv: ed.iv, authTag: ed.authTag }, ENCRYPTION_KEY));
      } catch (err) {
        return { error: 'Decryption failed' };
      }
    });

    return {
      ...identity,
      decryptedData,
    };
  });

  return resolvedIdentities;
});

// Admin endpoint to read data (Should be restricted to VPN in production)
fastify.get('/api/v1/admin/identities/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  const identity = await prisma.identity.findUnique({
    where: { id },
    include: {
      identifiers: true,
      encryptedData: true,
    },
  });

  if (!identity) {
    return reply.status(404).send({ error: 'Identity not found' });
  }

  const decryptedData = identity.encryptedData.map((ed) => {
    try {
      return JSON.parse(decrypt({ payload: ed.payload, iv: ed.iv, authTag: ed.authTag }, ENCRYPTION_KEY));
    } catch (err) {
      return { error: 'Decryption failed' };
    }
  });

  return {
    ...identity,
    decryptedData,
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
