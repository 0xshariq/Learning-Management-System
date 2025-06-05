"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoUploadProps {
  courseId: string;
  onSuccess?: (videoData: {
    id: string;
    title: string;
    url: string;
    duration: string;
    captionsUrl?: string;
  }) => void;
}

// You need to set these in your .env.local file at the root of your project:
// NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
// NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset

export function VideoUpload({ courseId, onSuccess }: VideoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captionsFile, setCaptionsFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState("");

  const MAX_SMALL_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_LARGE_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 1GB)
      if (file.size > MAX_LARGE_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "Please select a video file smaller than 1GB",
          variant: "destructive",
        });
        return;
      }

      setVideoFile(file);

      // Try to extract duration from video
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const minutes = Math.floor(video.duration / 60);
        const seconds = Math.floor(video.duration % 60);
        setDuration(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleCaptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      // Validate file type
      if (file.name.endsWith(".vtt") || file.type === "text/vtt") {
        setCaptionsFile(file);
      } else {
        toast({
          title: "Invalid captions format",
          description: "Please upload a WebVTT (.vtt) file",
          variant: "destructive",
        });
      }
    }
  };

  const clearVideoFile = () => setVideoFile(null);
  const clearCaptionsFile = () => setCaptionsFile(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFile) {
      toast({
        title: "Error",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 500);

    try {
      let videoUrl = "";
      let captionsUrl = "";

      // 1. Upload video
      if (videoFile.size <= MAX_SMALL_FILE_SIZE) {
        // Small file: upload via API route
        const videoFormData = new FormData();
        videoFormData.append("file", videoFile);
        videoFormData.append("courseId", courseId);
        videoFormData.append("title", title);
        videoFormData.append("description", description);
        videoFormData.append("position", position.toString());
        videoFormData.append("duration", duration);

        const videoResponse = await fetch("/api/cloudinary", {
          method: "POST",
          body: videoFormData,
        });

        if (!videoResponse.ok) {
          throw new Error("Failed to upload video");
        }

        const videoData = await videoResponse.json();
        videoUrl = videoData.video?.url || videoData.secure_url;
      } else {
        // Large file: upload directly to Cloudinary
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
          toast({
            title: "Cloudinary config missing",
            description:
              "Check your .env.local for NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
            variant: "destructive",
          });
          setUploading(false);
          return;
        }

        const videoFormData = new FormData();
        videoFormData.append("file", videoFile);
        videoFormData.append("upload_preset", uploadPreset!);

        console.log("cloudName", cloudName, "uploadPreset", uploadPreset);

        const videoResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          {
            method: "POST",
            body: videoFormData,
          }
        );

        if (!videoResponse.ok) {
          throw new Error("Failed to upload video to Cloudinary");
        }

        const videoData = await videoResponse.json();
        console.log("Cloudinary response:", videoData);
        videoUrl = videoData.secure_url;
      }

      // 2. Upload captions if provided (always direct to Cloudinary)
      if (captionsFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
        const captionsFormData = new FormData();
        captionsFormData.append("file", captionsFile);
        captionsFormData.append("upload_preset", uploadPreset);

        const captionsResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
          {
            method: "POST",
            body: captionsFormData,
          }
        );

        if (captionsResponse.ok) {
          const captionsData = await captionsResponse.json();
          captionsUrl = captionsData.secure_url;
        }
      }

      // 3. Create video record in database
      const createResponse = await fetch(`/api/courses/${courseId}/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          url: videoUrl,
          position,
          duration,
          captionsUrl,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create video record");
      }

      const createdVideo = await createResponse.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });

      // Reset form
      setVideoFile(null);
      setCaptionsFile(null);
      setTitle("");
      setDescription("");
      setDuration("");

      if (onSuccess) {
        onSuccess(createdVideo);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error uploading video:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
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
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter video description"
          rows={3}
          disabled={uploading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 10:30"
            disabled={uploading}
          />
        </div>
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={clearVideoFile}
              disabled={uploading}
            >
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

      <div className="space-y-2">
        <Label htmlFor="captions">Captions File (VTT format)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="captions"
            type="file"
            accept=".vtt"
            onChange={handleCaptionsChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            disabled={uploading}
          />
          {captionsFile && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={clearCaptionsFile}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {captionsFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {captionsFile.name}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Upload a WebVTT (.vtt) file for video captions. This improves
          accessibility and helps viewers who are deaf or hard of hearing.
        </p>
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {uploadProgress}% Uploaded
          </p>
        </div>
      )}

      <Button type="submit" disabled={uploading} className="w-full">
        {uploading ? (
          "Uploading..."
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" /> Upload Video
          </>
        )}
      </Button>
    </form>
  );
}
