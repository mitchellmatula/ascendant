"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, MessageSquare, HelpCircle } from "lucide-react";

const CATEGORIES = [
  { value: "BUG", label: "Bug Report", description: "Something isn't working correctly" },
  { value: "ACCOUNT", label: "Account Issue", description: "Login or account problems" },
  { value: "CHALLENGE", label: "Challenge Question", description: "Questions about challenges" },
  { value: "SUBMISSION", label: "Submission Issue", description: "Problems with submissions" },
  { value: "GYM", label: "Gym Related", description: "Questions about gyms" },
  { value: "FEATURE", label: "Feature Request", description: "Suggest a new feature" },
  { value: "OTHER", label: "Other", description: "General inquiry" },
];

export default function SupportPage() {
  const { user, isLoaded } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    subject: "",
    message: "",
    category: "OTHER",
  });

  // Pre-fill email from Clerk user
  useState(() => {
    if (isLoaded && user?.primaryEmailAddress?.emailAddress) {
      setFormData((prev) => ({
        ...prev,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || "",
      }));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="container max-w-xl mx-auto px-4 py-12">
        <Card className="text-center">
          <CardContent className="pt-12 pb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your support request has been submitted. We&apos;ll get back to you as soon as possible.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  email: user?.primaryEmailAddress?.emailAddress || "",
                  name: user?.fullName || "",
                  subject: "",
                  message: "",
                  category: "OTHER",
                });
              }}
            >
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Need Help?</h1>
        <p className="text-muted-foreground">
          Fill out the form below and we&apos;ll get back to you as soon as possible.
        </p>
      </div>

      {/* Support Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Contact Support
          </CardTitle>
          <CardDescription>
            Tell us what&apos;s going on and we&apos;ll help you out
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll respond to this email address
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex flex-col">
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of your issue"
                maxLength={200}
                required
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please describe your issue in detail. Include any relevant information like what you were trying to do, what happened, and any error messages you saw."
                rows={6}
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.message.length}/5000
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FAQ hint */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Looking for quick answers? Check our challenges and disciplines pages for common questions.
      </p>
    </div>
  );
}
