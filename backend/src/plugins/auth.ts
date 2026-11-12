import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export type Rol = 'solicitante' | 'interno' | 'admin';

export interface JWTPayload {
  id: string;
  email: string;
  rol: Rol;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRol: (roles: Rol[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '7d' },
  });

  // Verifica que exista un token valido
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'No autenticado' });
    }
  });

  // Verifica que el rol este dentro de los permitidos
  app.decorate(
    'requireRol',
    (roles: Rol[]) => async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        reply.code(401).send({ error: 'No autenticado' });
        return;
      }
      if (!roles.includes(req.user.rol)) {
        reply.code(403).send({ error: 'Sin permisos' });
      }
    }
  );
}

export default fp(authPlugin);