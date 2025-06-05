"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Upload, Video, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface VideoUploadModalProps {
  courseId: string
  onSuccess?: () => void
}

export function VideoUploadModal({ courseId, onSuccess }: VideoUploadModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [position, setPosition] = useState(0)

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]

      if (!file.type.startsWith("video/")) {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive",
        })
        return
      }

      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a video file smaller than 100MB",
          variant: "destructive",
        })
        return
      }

      setVideoFile(file)
    }
  }

  const clearVideoFile = () => {
    setVideoFile(null)
  }

  const resetForm = () => {
    setVideoFile(null)
    setTitle("")
    setDescription("")
    setPosition(0)
    setUploadProgress(0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!videoFile) {
      toast({
        title: "Error",
        description: "Please select a video file to upload",
        variant: "destructive",
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the video",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + 5
      })
    }, 500)

    try {
      const formData = new FormData()
      formData.append("file", videoFile)
      formData.append("courseId", courseId)
      formData.append("title", title)
      formData.append("position", position.toString())

      const response = await fetch("/api/cloudinary", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload video")
      }

      clearInterval(progressInterval)
      setUploadProgress(100)

      toast({
        title: "Success",
        description: "Video uploaded successfully",
      })

      resetForm()
      setOpen(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Error uploading video:", error)
      toast({
        title: "Error",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Video className="h-4 w-4" />
          Upload Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Course Video</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Video Title*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={3}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              type="number"
              min="0"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              placeholder="Video position in course"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Video File*</Label>
            <div className="flex items-center gap-2">
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                required={!videoFile}
                disabled={uploading}
              />
              {videoFile && (
                <Button type="button" variant="outline" size="icon" onClick={clearVideoFile} disabled={uploading}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {videoFile && (
              <div className="text-sm text-muted-foreground">
                <p>Selected: {videoFile.name}</p>
                <p>Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{uploadProgress}% Uploaded</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload Video
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
