import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Environment variables schema
const envSchema = z.object({
  NEXT_BASE_URL: z.string().url('Invalid base URL'),
  NEXT_FIRM_URL_PREFIX: z.string().min(1, 'Firm URL prefix is required'),
  NEXT_API_KEY: z.string().min(1, 'API key is required'),
});

// Parse env vars once at startup
const env = envSchema.parse({
  NEXT_BASE_URL: process.env.NEXT_BASE_URL,
  NEXT_FIRM_URL_PREFIX: process.env.NEXT_FIRM_URL_PREFIX,
  NEXT_API_KEY: process.env.NEXT_API_KEY,
});

// Minimal type for FHIR Patient entry (instead of `any`)
interface FhirEntry {
  fullUrl?: string;
  resource: {
    id?: string;
    identifier?: Array<{ value?: string }>;
    name?: Array<{ family?: string; given?: string[] }>;
    gender?: string;
    birthDate?: string;
    active?: boolean;
    maritalStatus?: { text?: string };
    meta?: { lastUpdated?: string };
  };
}

interface FhirLink {
  relation: string;
  url: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const count = searchParams.get('count') || '20';

    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token found' },
        { status: 401 }
      );
    }

    // Build the API URL
    const url = `${env.NEXT_BASE_URL}/${env.NEXT_FIRM_URL_PREFIX}/ema/fhir/v2/Patient`;
    const params = new URLSearchParams();
    if (page !== '1') params.append('page', page);
    if (count !== '20') params.append('_count', count);

    const apiUrl = params.toString() ? `${url}?${params.toString()}` : url;

    // Make request to ModMed API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/fhir+json',
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': env.NEXT_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('ModMed API error:', response.status, response.statusText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized - Token may be expired' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch patients: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data: {
      total?: number;
      entry?: FhirEntry[];
      link?: FhirLink[];
    } = await response.json();

    // Transform the data to make it easier for frontend
    const transformedData = {
      total: data.total || 0,
      patients:
        data.entry?.map(entry => {
          const patient = entry.resource;
          return {
            id: patient.id ?? 'N/A',
            fullUrl: entry.fullUrl,
            identifier: patient.identifier?.[0]?.value || 'N/A',
            name: {
              family: patient.name?.[0]?.family || 'Unknown',
              given: patient.name?.[0]?.given || ['Unknown'],
              full: `${patient.name?.[0]?.given?.[0] || 'Unknown'} ${
                patient.name?.[0]?.family || 'Unknown'
              }`,
            },
            gender: patient.gender || 'unknown',
            birthDate: patient.birthDate || 'Unknown',
            active: patient.active ?? false,
            maritalStatus: patient.maritalStatus?.text || 'Unknown',
            lastUpdated: patient.meta?.lastUpdated || 'Unknown',
          };
        }) ?? [],
      links: {
        self: data.link?.find(link => link.relation === 'self')?.url,
        next: data.link?.find(link => link.relation === 'next')?.url,
        prev: data.link?.find(link => link.relation === 'prev')?.url,
      },
      pagination: {
        currentPage: parseInt(page, 10),
        hasNext: !!data.link?.find(link => link.relation === 'next'),
        hasPrev: !!data.link?.find(link => link.relation === 'prev'),
      },
    };

    return NextResponse.json(transformedData);
  } catch (error: unknown) {
    console.error('Patients API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Environment configuration error', details: error.issues },
        { status: 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Unknown error' },
      { status: 500 }
    );
  }
}
