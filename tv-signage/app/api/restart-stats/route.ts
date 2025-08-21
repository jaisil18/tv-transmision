import { NextResponse } from 'next/server';
import AutoRestartManager from '@/utils/auto-restart';

export async function GET() {
  try {
    const restartManager = AutoRestartManager.getInstance();
    const stats = await restartManager.getRestartStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const restartManager = AutoRestartManager.getInstance();
    const scheduled = await restartManager.scheduleRestart('Manual restart requested', []);
    
    return NextResponse.json({
      success: true,
      scheduled,
      message: scheduled ? 'Restart scheduled' : 'Restart not scheduled (too soon or already in progress)'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
