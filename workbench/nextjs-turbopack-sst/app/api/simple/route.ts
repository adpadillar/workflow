import { start } from 'workflow/api';
import { handleUserSignup } from '@/workflows/simple';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email } = await request.json();

  // Executes asynchronously and doesn't block your app
  await start(handleUserSignup, [email]).catch((error) => {
    console.error('Error starting workflow', error);
    return NextResponse.json(
      {
        message: 'Error starting workflow',
        error: error.message,
      },
      { status: 500 }
    );
  });

  return NextResponse.json({
    message: 'User signup workflow started',
  });
}
