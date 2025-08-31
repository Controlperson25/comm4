import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Mock upload (в реальном приложении сохранили бы файл)
    const url = `/uploads/mock-${Date.now()}.jpg`
    
    return NextResponse.json({
      success: true,
      data: { url, filename: file.name, size: file.size }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}