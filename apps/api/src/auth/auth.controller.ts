import { All, Controller, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from './auth.config';

@Controller('api/auth')
export class AuthController {
  @All('*')
  async handleAuth(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    // Convert Fastify request to standard Request-like object for Better Auth
    const url = new URL(req.url, `${req.protocol}://${req.hostname}:${process.env.PORT || 3000}`);

    // Prepare headers, ensuring content-type is set for requests with body
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      }
    });

    // Prepare body for non-GET/HEAD requests
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    // Create response wrapper
    const responseInit = {
      status: 200,
      headers: new Headers(),
    };

    try {
      console.log('Auth request URL:', url.toString());
      console.log('Auth request method:', req.method);
      console.log('Auth request body:', req.body);

      const authResponse = await auth.handler(request);

      // Handle the response
      if (authResponse) {
        // Set status
        res.status(authResponse.status || 200);

        // Set headers
        authResponse.headers?.forEach((value, key) => {
          res.header(key, value);
        });

        // Handle redirect
        if (authResponse.status === 302 || authResponse.status === 301) {
          const location =
            authResponse.headers?.get('Location') || authResponse.headers?.get('location');
          if (location) {
            return res.redirect(location);
          }
        }

        // Send response body
        const body = await authResponse.text();
        console.log('Auth response status:', authResponse.status);
        console.log('Auth response body:', body);
        if (body) {
          return res.send(body);
        }
      }

      return res.status(200).send({ ok: true });
    } catch (error) {
      console.error('Better Auth error:', error);
      return res.status(500).send({ error: 'Authentication error' });
    }
  }
}
