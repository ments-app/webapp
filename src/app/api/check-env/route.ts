import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? '✅ Set' : '❌ Missing',
  };

  return NextResponse.json({
    message: 'Environment variables check',
    variables: envVars,
    supabaseServiceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  });
}