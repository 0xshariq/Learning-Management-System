"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Send, Users, MessageCircle, Play } from 'lucide-react'
import { format } from 'date-fns'

interface StreamData {
  token: string
  streamId: string
  playerUrl: string
  chatUrl: string
  role: 'teacher' | 'student'
  liveClass: {
    title: string
    description?: string
    scheduledDate: string
    status: string
    isLive: boolean
  }
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  role: 'teacher' | 'student'
}

interface LiveStreamViewerProps {
  liveClassId: string
}

export default function LiveStreamViewer({ liveClassId }: LiveStreamViewerProps) {
  const { data: session } = useSession()
  const [streamData, setStreamData] = useState<StreamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatConnected, setChatConnected] = useState(false)
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLIFrameElement>(null)
  const tokenRefreshInterval = useRef<NodeJS.Timeout | null>(null)

  const refreshToken = useCallback(async () => {
    if (!streamData?.token) return

    try {
      const response = await fetch('/api/live-classes/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: streamData.token })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update stream data with new token
        setStreamData(prev => prev ? {
          ...prev,
          token: data.token,
          playerUrl: prev.playerUrl.replace(streamData.token, data.token),
          chatUrl: prev.chatUrl.replace(streamData.token, data.token)
        } : null)

        // Update expiry time
        const newExpiryTime = Date.now() + (data.expiresIn * 1000)
        setTokenExpiry(newExpiryTime)

        console.log('Token refreshed successfully')
      } else {
        console.error('Failed to refresh token')
        toast({
          title: "Session Warning",
          description: "Your session will expire soon. Please refresh the page.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
    }
  }, [streamData?.token])

  const setupTokenRefresh = useCallback(() => {
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current)
    }

    // Refresh token 30 minutes before expiry
    const refreshTime = 30 * 60 * 1000 // 30 minutes in milliseconds
    const timeUntilRefresh = (tokenExpiry || 0) - Date.now() - refreshTime

    if (timeUntilRefresh > 0) {
      tokenRefreshInterval.current = setTimeout(async () => {
        await refreshToken()
        // Set up next refresh
        setupTokenRefresh()
      }, timeUntilRefresh)
    }
  }, [tokenExpiry, refreshToken])

  const fetchStreamData = useCallback(async () => {
    try {
      const response = await fetch(`/api/live-classes/${liveClassId}/stream`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setStreamData(data)
        
        // Calculate token expiry time (4 hours from now)
        const expiryTime = Date.now() + (4 * 60 * 60 * 1000)
        setTokenExpiry(expiryTime)
        
        // Add connection status check
        setTimeout(() => {
          setChatConnected(true)
          // Add a welcome message
          setChatMessages([{
            id: '1',
            user: 'System',
            message: `Welcome to ${data.liveClass.title}!`,
            timestamp: new Date(),
            role: 'teacher'
          }])
        }, 2000)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to load stream",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching stream data:', error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to stream. Please check your internet connection.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [liveClassId])

  useEffect(() => {
    fetchStreamData()
    
    return () => {
      // Cleanup token refresh interval on component unmount
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current)
      }
    }
  }, [liveClassId, fetchStreamData])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    // Set up token refresh interval when we have a token
    if (streamData?.token && tokenExpiry) {
      setupTokenRefresh()
    }
    
    return () => {
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current)
      }
    }
  }, [streamData?.token, tokenExpiry, setupTokenRefresh])

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !streamData || !session?.user) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      user: session.user.name || session.user.email || 'Student',
      message: newMessage.trim(),
      timestamp: new Date(),
      role: streamData.role
    }

    setChatMessages(prev => [...prev, message])
    setNewMessage('')

    // In a real implementation, this would send to the chat service
    // For now, we'll simulate receiving messages
    setTimeout(() => {
      if (Math.random() > 0.7) {
        const teacherMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          user: 'Teacher',
          message: 'Thanks for your question! Let me address that...',
          timestamp: new Date(),
          role: 'teacher'
        }
        setChatMessages(prev => [...prev, teacherMessage])
      }
    }, 2000 + Math.random() * 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading live stream...</p>
        </div>
      </div>
    )
  }

  if (!streamData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Unable to load stream.</p>
            <p className="text-sm text-muted-foreground">
              Please check if you&apos;re enrolled in this course or if the stream is active.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{streamData.liveClass.title}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(streamData.liveClass.scheduledDate), 'PPP p')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {streamData.liveClass.isLive ? (
              <Badge variant="destructive" className="animate-pulse">🔴 LIVE</Badge>
            ) : (
              <Badge variant="outline">ENDED</Badge>
            )}
          </div>
        </div>
        
        {streamData.liveClass.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {streamData.liveClass.description}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 h-[calc(100vh-120px)]">
        {/* Video Player */}
        <div className="lg:col-span-3 bg-black flex items-center justify-center">
          {streamData.liveClass.isLive ? (
            <iframe
              ref={playerRef}
              src={streamData.playerUrl}
              className="w-full h-full"
              style={{ border: 0, aspectRatio: '16/9', maxWidth: '100%' }}
              allow="autoplay,fullscreen"
              allowFullScreen
              title="Live Stream Player"
            />
          ) : (
            <div className="text-white text-center">
              <div className="mb-4">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Stream Ended</h3>
                <p className="text-gray-400">This live class has ended.</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className="bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold">Live Chat</h3>
              {chatConnected && (
                <Badge variant="outline" className="text-green-600">
                  <Users className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
            {tokenExpiry && (
              <div className="mt-2 text-xs text-muted-foreground">
                Session expires: {new Date(tokenExpiry).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
            <div className="space-y-3">
              {chatMessages.map((message) => (
                <div key={message.id} className="text-sm">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${
                          message.role === 'teacher' ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {message.user}
                        </span>
                        {message.role === 'teacher' && (
                          <Badge variant="outline" className="text-xs">Teacher</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(message.timestamp, 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-gray-700">{message.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {!chatConnected && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Connecting to chat...</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          {streamData.liveClass.isLive && chatConnected && (
            <div className="p-4 border-t">
              <form onSubmit={sendChatMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  maxLength={200}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                Be respectful in your messages
              </p>
            </div>
          )}

          {!streamData.liveClass.isLive && (
            <div className="p-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Chat is disabled when the stream is not live
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
