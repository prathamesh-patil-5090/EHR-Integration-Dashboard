import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { z } from 'zod';

// ✅ Zod schema for login validation
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// ✅ Environment variables schema
const envSchema = z.object({
  NEXT_BASE_URL: z.string().url('Invalid base URL'),
  NEXT_FIRM_URL_PREFIX: z.string().min(1, 'Firm URL prefix is required'),
  NEXT_API_KEY: z.string().min(1, 'API key is required'),
});

// ✅ Parse env vars once at startup
const env = envSchema.parse({
  NEXT_BASE_URL: process.env.NEXT_BASE_URL,
  NEXT_FIRM_URL_PREFIX: process.env.NEXT_FIRM_URL_PREFIX,
  NEXT_API_KEY: process.env.NEXT_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // 🔐 Validate request data
    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');

    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // 🔗 Build request
    const url = `${env.NEXT_BASE_URL}/${env.NEXT_FIRM_URL_PREFIX}/ema/ws/oauth2/grant`;
    const body = new URLSearchParams({
      grant_type: 'password',
      username: parsed.data.username,
      password: parsed.data.password,
    });

    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': env.NEXT_API_KEY,
      },
    });

    const data = response.data;

    // 🍪 Set cookies
    const res = NextResponse.json(data);
    res.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
    });
    res.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 * 7, // 7 days
    });

    return res;
  } catch (error: unknown) {
    console.error('Login error:', error);

    if (error instanceof AxiosError) {
      return NextResponse.json(
        { error: error.response?.data ?? 'Unknown login error' },
        { status: error.response?.status ?? 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: `Login failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
