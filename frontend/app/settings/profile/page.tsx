'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Save, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyName: string;
  calendlyLink: string;
  avatarUrl?: string;
  bio?: string;
}

export default function UserProfileSettings() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyName: 'SutraHR',
    calendlyLink: '',
    avatarUrl: '',
    bio: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/user-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const res = await fetch('http://localhost:4000/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (res.ok) {
        setSuccessMessage('✅ Profile saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      console.log('📤 Starting upload for file:', file.name, 'Size:', file.size);
      
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:4000/user-profile/upload-avatar', {
        method: 'POST',
        body: formData
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok) {
        setProfile(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
        setSuccessMessage('✅ Avatar uploaded successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setSuccessMessage(`❌ Upload failed: ${data.error || 'Unknown error'}`);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      setSuccessMessage(`❌ Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Outreach Profile</h1>
          <p className="text-slate-600 mt-2">
            Configure your personal profile. This information will personalize all your cold emails.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Profile Card */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Used in all outreach emails and call scheduling
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Avatar Section */}
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full border-4 border-blue-200 flex items-center justify-center overflow-hidden">
                      {profile.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt={profile.name || 'Avatar'}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-4xl font-bold text-blue-600">
                          {profile.name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Avatar
                          </>
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </div>
                    <p className="text-sm text-slate-500">
                      JPG, PNG up to 5MB. Used in email signatures.
                    </p>
                  </div>
                </div>

                <hr />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Pavan Kumar"
                      value={profile.name}
                      onChange={e => setProfile({ ...profile, name: e.target.value })}
                      className="text-base"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="pavan@sutrahr.com"
                      value={profile.email}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      className="text-base"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={profile.phone}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      className="text-base"
                    />
                  </div>

                  {/* Job Title */}
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      placeholder="CEO / Founder / Sales Lead"
                      value={profile.jobTitle}
                      onChange={e => setProfile({ ...profile, jobTitle: e.target.value })}
                      className="text-base"
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="SutraHR"
                      value={profile.companyName}
                      onChange={e => setProfile({ ...profile, companyName: e.target.value })}
                      className="text-base"
                    />
                  </div>

                  {/* Calendly Link */}
                  <div className="space-y-2">
                    <Label htmlFor="calendly">Calendly Link *</Label>
                    <Input
                      id="calendly"
                      placeholder="https://calendly.com/pavan"
                      value={profile.calendlyLink}
                      onChange={e => setProfile({ ...profile, calendlyLink: e.target.value })}
                      className="text-base"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / About You (Optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="A brief description about yourself to include in emails..."
                    value={profile.bio || ''}
                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                    className="text-base"
                  />
                </div>

                <hr />

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={loadProfile}>
                    Cancel
                  </Button>
                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Your profile information will automatically be used to personalize all outreach emails. 
              Update your Calendly link to ensure prospects can book calls with you.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
