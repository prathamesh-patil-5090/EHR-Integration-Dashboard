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

// FHIR Patient resource interface
interface FhirPatient {
  resourceType: string;
  id: string;
  meta?: {
    lastUpdated?: string;
  };
  extension?: Array<{
    url: string;
    extension?: Array<{
      url: string;
      valueString?: string;
    }>;
  }>;
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
  active?: boolean;
  name?: Array<{
    family?: string;
    given?: string[];
  }>;
  telecom?: Array<{
    system: string;
    value: string;
    use?: string;
    rank?: string;
  }>;
  gender?: string;
  birthDate?: string;
  deceasedBoolean?: boolean;
  maritalStatus?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  address?: Array<{
    use?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

// GET - Fetch individual patient by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

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
    const url = `${env.NEXT_BASE_URL}/${env.NEXT_FIRM_URL_PREFIX}/ema/fhir/v2/Patient/${id}`;

    // Make request to ModMed API
    const response = await fetch(url, {
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

      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch patient: ${response.statusText}` },
        { status: response.status }
      );
    }

    const patientData: FhirPatient = await response.json();

    // Transform the data for easier frontend consumption
    const transformedPatient = {
      id: patientData.id,
      resourceType: patientData.resourceType,
      raw: patientData, // Keep raw data for editing
      formatted: {
        identifier: patientData.identifier?.[0]?.value || 'N/A',
        name: {
          family: patientData.name?.[0]?.family || 'Unknown',
          given: patientData.name?.[0]?.given || ['Unknown'],
          full: `${patientData.name?.[0]?.given?.[0] || 'Unknown'} ${
            patientData.name?.[0]?.family || 'Unknown'
          }`,
        },
        gender: patientData.gender || 'unknown',
        birthDate: patientData.birthDate || 'Unknown',
        active: patientData.active ?? false,
        deceased: patientData.deceasedBoolean ?? false,
        maritalStatus: patientData.maritalStatus?.text || 'Unknown',
        lastUpdated: patientData.meta?.lastUpdated || 'Unknown',
        telecom: patientData.telecom || [],
        address: patientData.address || [],
        ethnicity: patientData.extension?.find(ext => 
          ext.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
        )?.extension?.find(subExt => subExt.url === 'text')?.valueString || 'Unspecified',
      },
    };

    return NextResponse.json(transformedPatient);
  } catch (error: unknown) {
    console.error('Patient API GET error:', error);

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

// PUT - Update patient information
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token found' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate that the body contains required fields
    if (!body.resourceType || !body.id) {
      return NextResponse.json(
        { error: 'Invalid patient data - resourceType and id are required' },
        { status: 400 }
      );
    }

    // Ensure the ID in the URL matches the ID in the body
    if (body.id !== id) {
      return NextResponse.json(
        { error: 'Patient ID in URL does not match ID in request body' },
        { status: 400 }
      );
    }

    // Build the API URL
    const url = `${env.NEXT_BASE_URL}/${env.NEXT_FIRM_URL_PREFIX}/ema/fhir/v2/Patient/${id}`;

    // Make PUT request to ModMed API
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': env.NEXT_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('ModMed API PUT error:', response.status, response.statusText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized - Token may be expired' },
          { status: 401 }
        );
      }

      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      if (response.status === 400) {
        const errorData = await response.text();
        return NextResponse.json(
          { error: 'Bad request - Invalid patient data', details: errorData },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Failed to update patient: ${response.statusText}` },
        { status: response.status }
      );
    }

    const updatedPatient: FhirPatient = await response.json();

    // Transform the updated data for easier frontend consumption
    const transformedPatient = {
      id: updatedPatient.id,
      resourceType: updatedPatient.resourceType,
      raw: updatedPatient,
      formatted: {
        identifier: updatedPatient.identifier?.[0]?.value || 'N/A',
        name: {
          family: updatedPatient.name?.[0]?.family || 'Unknown',
          given: updatedPatient.name?.[0]?.given || ['Unknown'],
          full: `${updatedPatient.name?.[0]?.given?.[0] || 'Unknown'} ${
            updatedPatient.name?.[0]?.family || 'Unknown'
          }`,
        },
        gender: updatedPatient.gender || 'unknown',
        birthDate: updatedPatient.birthDate || 'Unknown',
        active: updatedPatient.active ?? false,
        deceased: updatedPatient.deceasedBoolean ?? false,
        maritalStatus: updatedPatient.maritalStatus?.text || 'Unknown',
        lastUpdated: updatedPatient.meta?.lastUpdated || 'Unknown',
        telecom: updatedPatient.telecom || [],
        address: updatedPatient.address || [],
        ethnicity: updatedPatient.extension?.find(ext => 
          ext.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
        )?.extension?.find(subExt => subExt.url === 'text')?.valueString || 'Unspecified',
      },
    };

    return NextResponse.json({
      message: 'Patient updated successfully',
      patient: transformedPatient,
    });
  } catch (error: unknown) {
    console.error('Patient API PUT error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Environment configuration error', details: error.issues },
        { status: 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
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