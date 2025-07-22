import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import LiveStreamViewer from '@/components/live-stream/live-stream-viewer'

interface LiveStreamPageProps {
  params: {
    id: string
  }
}

export default async function LiveStreamPage({ params }: LiveStreamPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user.role === 'admin') {
    redirect('/admin')
  }

  return <LiveStreamViewer liveClassId={params.id} />
}

export async function generateMetadata() {
  return {
    title: 'Live Stream - EduLearn',
    description: 'Join the live streaming session'
  }
}
