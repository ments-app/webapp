import { NextResponse } from 'next/server';
import { getFacilitatorBusinessDashboardUrl } from '@/utils/businessApp';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    error: 'Startup facilitator verification is managed in business.ments.app',
    redirect_url: getFacilitatorBusinessDashboardUrl(),
  }, { status: 405 });
}
